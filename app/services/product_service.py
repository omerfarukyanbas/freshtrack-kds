from datetime import date, datetime as dt

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.product import Product
from app.schemas.product import (
    ProductCreate,
    ProductImportCsvResponse,
    ProductImportFailedRow,
    ProductRead,
    ProductUpdate,
)


EXPIRED_PRODUCT_ERROR = "Son kullanma tarihi geçmiş bir ürün eklenemez."


def _to_read(product: Product, today: date | None = None) -> ProductRead:
    ref = today or date.today()
    rd = product.remaining_days(ref)
    return ProductRead(
        id=product.id,
        name=product.name,
        category=product.category,
        purchase_price=product.purchase_price,
        selling_price=product.selling_price,
        expiration_date=product.expiration_date,
        stock_quantity=product.stock_quantity,
        last_30_days_sales=product.last_30_days_sales,
        remaining_days=rd,
        shelf_status=product.shelf_status(ref),
        created_at=product.created_at if product.created_at is not None else dt.utcnow(),
        daily_sales_rate=product.daily_sales_rate,
    )


class ProductService:
    def __init__(self, db: Session):
        self.db = db

    def list_products(
        self,
        owner_id: int,
        category: str | None = None,
    ) -> list[ProductRead]:
        stmt = (
            select(Product)
            .where(Product.user_id == owner_id)
            .order_by(Product.expiration_date)
        )
        if category:
            stmt = stmt.where(Product.category == category)
        rows = self.db.scalars(stmt).all()
        return [_to_read(p) for p in rows]

    def get_for_owner(self, owner_id: int, product_id: int) -> Product | None:
        p = self.db.get(Product, product_id)
        if not p or p.user_id != owner_id:
            return None
        return p

    def get_read(self, owner_id: int, product_id: int) -> ProductRead | None:
        p = self.get_for_owner(owner_id, product_id)
        return _to_read(p) if p else None

    def create(self, owner_id: int, data: ProductCreate) -> ProductRead:
        if data.expiration_date < date.today():
            raise ValueError(EXPIRED_PRODUCT_ERROR)
        product = Product(
            user_id=owner_id,
            name=data.name,
            category=data.category,
            purchase_price=data.purchase_price,
            selling_price=data.selling_price,
            expiration_date=data.expiration_date,
            stock_quantity=data.stock_quantity,
            last_30_days_sales=data.last_30_days_sales,
        )
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return _to_read(product)

    def update(
        self,
        owner_id: int,
        product_id: int,
        data: ProductUpdate,
    ) -> ProductRead | None:
        product = self.get_for_owner(owner_id, product_id)
        if not product:
            return None
        payload = data.model_dump(exclude_unset=True)
        next_purchase = payload.get("purchase_price", product.purchase_price)
        next_selling = payload.get("selling_price", product.selling_price)
        next_expiration = payload.get("expiration_date", product.expiration_date)
        if next_selling + 1e-9 < next_purchase:
            raise ValueError("Satış fiyatı alış fiyatından düşük olamaz")
        if next_expiration < date.today():
            raise ValueError(EXPIRED_PRODUCT_ERROR)
        for key, value in payload.items():
            setattr(product, key, value)
        self.db.commit()
        self.db.refresh(product)
        return _to_read(product)

    def delete(self, owner_id: int, product_id: int) -> bool:
        product = self.get_for_owner(owner_id, product_id)
        if not product:
            return False
        self.db.delete(product)
        self.db.commit()
        return True

    def import_csv_rows(
        self,
        owner_id: int,
        rows: list[dict[str, str]],
    ) -> ProductImportCsvResponse:
        imported_count = 0
        failed_rows: list[ProductImportFailedRow] = []

        for idx, raw_row in enumerate(rows, start=2):
            normalized = {k: (v.strip() if isinstance(v, str) else "") for k, v in raw_row.items()}
            row_errors: list[str] = []

            required_fields = [
                "name",
                "category",
                "purchase_price",
                "selling_price",
                "expiration_date",
                "stock_quantity",
                "last_30_days_sales",
            ]
            missing = [field for field in required_fields if not normalized.get(field)]
            if missing:
                row_errors.append(f"Bos alanlar: {', '.join(missing)}")

            payload = None
            if not row_errors:
                try:
                    payload = ProductCreate.model_validate(normalized)
                except ValidationError as exc:
                    for issue in exc.errors():
                        loc = ".".join(str(part) for part in issue.get("loc", []))
                        msg = issue.get("msg", "Gecersiz deger")
                        row_errors.append(f"{loc}: {msg}" if loc else msg)

            if payload and payload.expiration_date < date.today():
                row_errors.append(EXPIRED_PRODUCT_ERROR)

            if row_errors:
                failed_rows.append(
                    ProductImportFailedRow(
                        row_number=idx,
                        row_data={k: str(v) for k, v in normalized.items()},
                        errors=row_errors,
                    )
                )
                continue

            product = Product(
                user_id=owner_id,
                name=payload.name,
                category=payload.category,
                purchase_price=payload.purchase_price,
                selling_price=payload.selling_price,
                expiration_date=payload.expiration_date,
                stock_quantity=payload.stock_quantity,
                last_30_days_sales=payload.last_30_days_sales,
            )
            self.db.add(product)
            imported_count += 1

        self.db.commit()
        return ProductImportCsvResponse(
            imported_count=imported_count,
            failed_count=len(failed_rows),
            failed_rows=failed_rows,
        )
