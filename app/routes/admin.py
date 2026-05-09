from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.deps.auth import get_current_super_admin
from app.models.product import Product
from app.models.user import User
from app.schemas.admin import (
    AdminBusinessDetail,
    AdminBusinessListItem,
    AdminBusinessProductsResponse,
    AdminPendingBusinessItem,
)
from app.services.product_service import _to_read

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/pending-businesses", response_model=list[AdminPendingBusinessItem])
def list_pending_businesses(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_super_admin),
) -> list[AdminPendingBusinessItem]:
    users = db.scalars(
        select(User)
        .where(User.account_status == "pending")
        .where(User.role != "super_admin")
        .order_by(User.created_at.desc())
    ).all()
    return [
        AdminPendingBusinessItem(
            id=u.id,
            business_name=u.business_name,
            owner_name=u.owner_name,
            email=u.email,
            phone=u.phone,
            business_type=u.business_type or "market",
            created_at=u.created_at,
            account_status=u.account_status,
        )
        for u in users
    ]


@router.patch("/businesses/{user_id}/approve")
def approve_business(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_super_admin),
) -> dict[str, str]:
    user = db.get(User, user_id)
    if not user or user.role == "super_admin":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Isletme bulunamadi")
    user.account_status = "approved"
    db.add(user)
    db.commit()
    return {"message": "Isletme onaylandi."}


@router.patch("/businesses/{user_id}/reject")
def reject_business(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_super_admin),
) -> dict[str, str]:
    user = db.get(User, user_id)
    if not user or user.role == "super_admin":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Isletme bulunamadi")
    user.account_status = "rejected"
    db.add(user)
    db.commit()
    return {"message": "Isletme reddedildi."}


@router.get("/businesses", response_model=list[AdminBusinessListItem])
def list_businesses(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_super_admin),
) -> list[AdminBusinessListItem]:
    users = db.scalars(select(User).order_by(User.created_at.desc())).all()
    all_products = db.scalars(select(Product)).all()

    by_user: dict[int, list[Product]] = {}
    for product in all_products:
        if product.user_id is None:
            continue
        by_user.setdefault(product.user_id, []).append(product)

    today = date.today()
    rows: list[AdminBusinessListItem] = []
    for user in users:
        if user.role == "super_admin":
            continue
        products = by_user.get(user.id, [])
        critical = [p for p in products if p.remaining_days(today) <= 7]
        rows.append(
            AdminBusinessListItem(
                id=user.id,
                business_name=user.business_name,
                owner_name=user.owner_name,
                email=user.email,
                phone=user.phone,
                address=user.address,
                business_type=user.business_type or "market",
                created_at=user.created_at,
                total_products=len(products),
                critical_products=len(critical),
                total_stock=sum(max(0, p.stock_quantity) for p in products),
                estimated_risk_amount=round(
                    sum(max(0, p.stock_quantity) * max(0.0, p.purchase_price) for p in critical),
                    2,
                ),
            )
        )
    return rows


@router.get("/businesses/{user_id}", response_model=AdminBusinessDetail)
def get_business_detail(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_super_admin),
) -> AdminBusinessDetail:
    user = db.get(User, user_id)
    if not user or user.role == "super_admin":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Isletme bulunamadi")
    return AdminBusinessDetail(
        id=user.id,
        business_name=user.business_name,
        owner_name=user.owner_name,
        email=user.email,
        phone=user.phone,
        address=user.address,
        business_type=user.business_type or "market",
        role=user.role,
        created_at=user.created_at,
    )


@router.get("/businesses/{user_id}/products", response_model=AdminBusinessProductsResponse)
def get_business_products(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_super_admin),
) -> AdminBusinessProductsResponse:
    user = db.get(User, user_id)
    if not user or user.role == "super_admin":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Isletme bulunamadi")

    products = db.scalars(
        select(Product).where(Product.user_id == user_id).order_by(Product.expiration_date.asc())
    ).all()
    return AdminBusinessProductsResponse(
        user_id=user_id,
        products=[_to_read(product) for product in products],
    )
