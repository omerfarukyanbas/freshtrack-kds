import csv
from io import StringIO

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.deps.auth import get_current_user
from app.models.user import User
from app.schemas.product import (
    DynamicPricingResult,
    ProductCreate,
    ProductImportCsvResponse,
    ProductRead,
    ProductSalesHistoryResponse,
    ProductUpdate,
)
from app.services.pricing import compute_dynamic_pricing
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["products"])
CSV_REQUIRED_COLUMNS = [
    "name",
    "category",
    "purchase_price",
    "selling_price",
    "expiration_date",
    "stock_quantity",
    "last_30_days_sales",
]


def get_service(db: Session = Depends(get_db)) -> ProductService:
    return ProductService(db)


@router.get("", response_model=list[ProductRead])
def list_products(
    category: str | None = None,
    user: User = Depends(get_current_user),
    service: ProductService = Depends(get_service),
) -> list[ProductRead]:
    return service.list_products(owner_id=user.id, category=category)


@router.get("/{product_id}", response_model=ProductRead)
def get_product(
    product_id: int,
    user: User = Depends(get_current_user),
    service: ProductService = Depends(get_service),
) -> ProductRead:
    product = service.get_read(user.id, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ürün bulunamadı")
    return product


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    body: ProductCreate,
    user: User = Depends(get_current_user),
    service: ProductService = Depends(get_service),
) -> ProductRead:
    try:
        return service.create(user.id, body)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@router.patch("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    body: ProductUpdate,
    user: User = Depends(get_current_user),
    service: ProductService = Depends(get_service),
) -> ProductRead:
    try:
        updated = service.update(user.id, product_id, body)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ürün bulunamadı")
    return updated


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    user: User = Depends(get_current_user),
    service: ProductService = Depends(get_service),
) -> None:
    if not service.delete(user.id, product_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ürün bulunamadı")


@router.get("/{product_id}/pricing", response_model=DynamicPricingResult)
def get_dynamic_pricing(
    product_id: int,
    user: User = Depends(get_current_user),
    service: ProductService = Depends(get_service),
) -> DynamicPricingResult:
    product = service.get_for_owner(user.id, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ürün bulunamadı")
    rd = product.remaining_days()
    breakdown = compute_dynamic_pricing(
        selling_price=product.selling_price,
        purchase_price=product.purchase_price,
        remaining_days=rd,
        stock_quantity=product.stock_quantity,
        last_30_days_sales=product.last_30_days_sales,
        created_at=product.created_at,
    )
    return DynamicPricingResult(
        discount_rate=breakdown.discount_rate,
        new_price=breakdown.new_price,
        remaining_days=breakdown.remaining_days,
        last_30_days_sales=breakdown.last_30_days_sales,
        daily_sales_rate=breakdown.daily_sales_rate,
        estimated_days_to_sell=breakdown.estimated_days_to_sell,
        pricing_reason=breakdown.pricing_reason,
    )


@router.get("/{product_id}/sales-history", response_model=ProductSalesHistoryResponse)
def get_sales_history(
    product_id: int,
    user: User = Depends(get_current_user),
    service: ProductService = Depends(get_service),
) -> ProductSalesHistoryResponse:
    product = service.get_for_owner(user.id, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ürün bulunamadı")
    return ProductSalesHistoryResponse(
        product_id=product.id,
        last_30_days_sales=product.last_30_days_sales,
    )


@router.post("/import-csv", response_model=ProductImportCsvResponse)
async def import_products_csv(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    service: ProductService = Depends(get_service),
) -> ProductImportCsvResponse:
    filename = (file.filename or "").lower()
    if not filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lutfen .csv uzantili bir dosya yukleyin.",
        )

    raw_content = await file.read()
    try:
        text = raw_content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV dosyasi UTF-8 formatinda olmali.",
        ) from exc

    reader = csv.DictReader(StringIO(text))
    headers = [h.strip() for h in (reader.fieldnames or [])]
    missing_columns = [col for col in CSV_REQUIRED_COLUMNS if col not in headers]
    if missing_columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Eksik CSV kolonlari: {', '.join(missing_columns)}",
        )

    rows = [{(k or "").strip(): (v or "").strip() for k, v in row.items()} for row in reader]
    return service.import_csv_rows(owner_id=user.id, rows=rows)
