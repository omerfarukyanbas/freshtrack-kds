from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.session import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    purchase_price: Mapped[float] = mapped_column(Float, nullable=False)
    selling_price: Mapped[float] = mapped_column(Float, nullable=False)
    expiration_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    stock_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_30_days_sales: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        default=datetime.utcnow,
        nullable=False,
    )

    @property
    def daily_sales_rate(self) -> float:
        return self.last_30_days_sales / 30.0

    def remaining_days(self, today: date | None = None) -> int:
        ref = today or date.today()
        return (self.expiration_date - ref).days

    def shelf_status(self, today: date | None = None) -> str:
        return "CRITICAL" if self.remaining_days(today) <= 7 else "OK"
