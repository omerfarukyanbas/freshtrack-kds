"""SQLite için hafif şema güncellemeleri."""

from sqlalchemy import inspect, text

from app.database.session import engine


def ensure_product_user_id_column() -> None:
    insp = inspect(engine)
    tables = insp.get_table_names()
    if "products" not in tables:
        return
    cols = {c["name"] for c in insp.get_columns("products")}
    if "user_id" in cols:
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE products ADD COLUMN user_id INTEGER"))


def ensure_product_past_sales_30d_column() -> None:
    insp = inspect(engine)
    tables = insp.get_table_names()
    if "products" not in tables:
        return
    cols = {c["name"] for c in insp.get_columns("products")}
    if "past_sales_30d" in cols:
        return
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE products ADD COLUMN past_sales_30d FLOAT NOT NULL DEFAULT 0"
            )
        )


def ensure_product_created_at_column() -> None:
    insp = inspect(engine)
    if "products" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("products")}
    if "created_at" in cols:
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE products ADD COLUMN created_at DATETIME"))
        conn.execute(text("UPDATE products SET created_at = CURRENT_TIMESTAMP"))


def ensure_products_created_at_not_null() -> None:
    """created_at NULL kalan eski kayıtları doldurur (GET /api/products 500 önlemi)."""
    insp = inspect(engine)
    if "products" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("products")}
    if "created_at" not in cols:
        return
    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE products SET created_at = CURRENT_TIMESTAMP "
                "WHERE created_at IS NULL"
            ),
        )


def ensure_product_last_30_days_sales_column() -> None:
    """past_sales_30d varsa değerleri kopyalar."""
    insp = inspect(engine)
    if "products" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("products")}
    if "last_30_days_sales" in cols:
        return
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE products ADD COLUMN last_30_days_sales FLOAT NOT NULL DEFAULT 0"
            )
        )
        if "past_sales_30d" in cols:
            conn.execute(
                text("UPDATE products SET last_30_days_sales = past_sales_30d"),
            )


def ensure_user_phone_column() -> None:
    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("users")}
    if "phone" in cols:
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(32)"))


def ensure_user_address_column() -> None:
    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("users")}
    if "address" in cols:
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN address VARCHAR(512)"))


def ensure_user_business_type_column() -> None:
    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("users")}
    if "business_type" in cols:
        return
    with engine.begin() as conn:
        conn.execute(
            text("ALTER TABLE users ADD COLUMN business_type VARCHAR(32) DEFAULT 'market'")
        )
        conn.execute(
            text(
                "UPDATE users SET business_type = 'market' "
                "WHERE business_type IS NULL OR business_type = ''"
            )
        )


def ensure_user_account_status_column() -> None:
    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("users")}
    if "account_status" in cols:
        return
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN account_status VARCHAR(32) "
                "NOT NULL DEFAULT 'approved'"
            )
        )
        conn.execute(
            text("UPDATE users SET account_status = 'approved' WHERE role = 'super_admin'")
        )


def ensure_user_role_column() -> None:
    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("users")}
    with engine.begin() as conn:
        if "role" not in cols:
            conn.execute(
                text("ALTER TABLE users ADD COLUMN role VARCHAR(64) DEFAULT 'normal_user'")
            )
        conn.execute(
            text(
                "UPDATE users SET role = 'normal_user' "
                "WHERE role IS NULL OR role = '' OR role = 'merchant'"
            )
        )
        conn.execute(
            text(
                "UPDATE users SET role = 'super_admin' "
                "WHERE role IN ('admin', 'superadmin', 'super-admin')"
            )
        )
