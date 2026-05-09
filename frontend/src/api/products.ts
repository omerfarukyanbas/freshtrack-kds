import { API_BASE } from "./config";
import {
  bearerAuthHeaders,
  fetchWithApiLog,
  readApiJson,
} from "./http";
import type {
  DynamicPricing,
  Product,
  ProductCreate,
  ProductImportCsvResult,
  ProductSalesHistory,
  ProductUpdate,
} from "../types/product";

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json", ...bearerAuthHeaders() };
}

/** Backend ProductCreate ile uyumlu JSON gövde (sayılar primitive number). */
export function serializeProductCreate(raw: ProductCreate): Record<string, unknown> {
  const purchase_price = Number(raw.purchase_price);
  const selling_price = Number(raw.selling_price);
  const stock_quantity = Math.max(0, Math.round(Number(raw.stock_quantity)));
  const last_30_days_sales = Number(raw.last_30_days_sales);
  const expiration_date = String(raw.expiration_date).slice(0, 10);
  return {
    name: String(raw.name).trim(),
    category: String(raw.category).trim(),
    purchase_price,
    selling_price,
    expiration_date,
    stock_quantity,
    last_30_days_sales,
  };
}

/** PATCH gövdelerinde sayıları normalize et. */
export function serializeProductUpdate(raw: ProductUpdate): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (raw.name !== undefined) out.name = String(raw.name).trim();
  if (raw.category !== undefined) out.category = String(raw.category).trim();
  if (raw.purchase_price !== undefined) out.purchase_price = Number(raw.purchase_price);
  if (raw.selling_price !== undefined) out.selling_price = Number(raw.selling_price);
  if (raw.expiration_date !== undefined)
    out.expiration_date = String(raw.expiration_date).slice(0, 10);
  if (raw.stock_quantity !== undefined)
    out.stock_quantity = Math.max(0, Math.round(Number(raw.stock_quantity)));
  if (raw.last_30_days_sales !== undefined)
    out.last_30_days_sales = Number(raw.last_30_days_sales);
  return out;
}

export async function fetchProducts(category?: string): Promise<Product[]> {
  const q = category ? `?category=${encodeURIComponent(category)}` : "";
  const url = `${API_BASE}/api/products${q}`;
  const res = await fetchWithApiLog(url, { headers: bearerAuthHeaders() });
  return readApiJson<Product[]>(res, url);
}

export async function fetchProduct(id: number): Promise<Product> {
  const url = `${API_BASE}/api/products/${id}`;
  const res = await fetchWithApiLog(url, { headers: bearerAuthHeaders() });
  return readApiJson<Product>(res, url);
}

export async function fetchProductPricing(
  productId: number,
): Promise<DynamicPricing> {
  const url = `${API_BASE}/api/products/${productId}/pricing`;
  const res = await fetchWithApiLog(url, { headers: bearerAuthHeaders() });
  return readApiJson<DynamicPricing>(res, url);
}

export async function fetchProductSalesHistory(
  productId: number,
): Promise<ProductSalesHistory> {
  const url = `${API_BASE}/api/products/${productId}/sales-history`;
  const res = await fetchWithApiLog(url, { headers: bearerAuthHeaders() });
  return readApiJson<ProductSalesHistory>(res, url);
}

export async function createProduct(body: ProductCreate): Promise<Product> {
  const url = `${API_BASE}/api/products`;
  const payload = serializeProductCreate(body);
  const jsonBody = JSON.stringify(payload);
  console.log("[API] POST /api/products normalized payload", payload);
  const res = await fetchWithApiLog(url, {
    method: "POST",
    headers: jsonHeaders(),
    body: jsonBody,
  });
  return readApiJson<Product>(res, url);
}

export async function updateProduct(
  id: number,
  body: ProductUpdate,
): Promise<Product> {
  const url = `${API_BASE}/api/products/${id}`;
  const payload = serializeProductUpdate(body);
  const jsonBody = JSON.stringify(payload);
  console.log("[API] PATCH /api/products/:id normalized payload", payload);
  const res = await fetchWithApiLog(url, {
    method: "PATCH",
    headers: jsonHeaders(),
    body: jsonBody,
  });
  return readApiJson<Product>(res, url);
}

export async function deleteProduct(id: number): Promise<void> {
  const url = `${API_BASE}/api/products/${id}`;
  const res = await fetchWithApiLog(url, {
    method: "DELETE",
    headers: bearerAuthHeaders(),
  });
  await readApiJson<void>(res, url);
}

export async function importProductsCsv(file: File): Promise<ProductImportCsvResult> {
  const url = `${API_BASE}/api/products/import-csv`;
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetchWithApiLog(url, {
    method: "POST",
    headers: bearerAuthHeaders(),
    body: formData,
  });
  return readApiJson<ProductImportCsvResult>(res, url);
}
