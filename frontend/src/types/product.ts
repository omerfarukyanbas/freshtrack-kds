export type Product = {
  id: number;
  name: string;
  category: string;
  purchase_price: number;
  selling_price: number;
  expiration_date: string;
  stock_quantity: number;
  last_30_days_sales: number;
  created_at?: string | null;
  remaining_days: number;
  shelf_status: "CRITICAL" | "OK" | string;
  daily_sales_rate: number;
};

export type ProductCreate = Omit<
  Product,
  "id" | "remaining_days" | "shelf_status" | "created_at" | "daily_sales_rate"
>;

export type ProductUpdate = Partial<ProductCreate>;

/** GET /api/products/{id}/pricing */
export type DynamicPricing = {
  discount_rate: number;
  new_price: number;
  remaining_days: number;
  last_30_days_sales: number;
  daily_sales_rate: number;
  estimated_days_to_sell: number;
  pricing_reason: string;
};

export type ProductSalesHistory = {
  product_id: number;
  last_30_days_sales: number;
};

export type ProductImportFailedRow = {
  row_number: number;
  row_data: Record<string, string>;
  errors: string[];
};

export type ProductImportCsvResult = {
  imported_count: number;
  failed_count: number;
  failed_rows: ProductImportFailedRow[];
};

/** Dashboard satırı: ürün + dinamik fiyat */
export type ProductDashboardRow = Product &
  DynamicPricing & {
    predicted_days_to_sell: number;
    predictedText: string;
    pricingError?: string;
    predictError?: string;
  };
