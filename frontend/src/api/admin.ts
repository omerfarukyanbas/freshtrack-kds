import { API_BASE } from "./config";
import { bearerAuthHeaders, fetchWithApiLog, readApiJson } from "./http";
import type { Product } from "../types/product";

export type AdminBusiness = {
  id: number;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  business_type: string;
  created_at: string;
  total_products: number;
  critical_products: number;
  total_stock: number;
  estimated_risk_amount: number;
};

export type AdminBusinessDetail = {
  id: number;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  business_type: string;
  role: string;
  created_at: string;
};

export type AdminBusinessProductsResponse = {
  user_id: number;
  products: Product[];
};

export type AdminPendingBusiness = {
  id: number;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string | null;
  business_type: string;
  created_at: string;
  account_status: string;
};

export async function fetchPendingBusinesses(): Promise<AdminPendingBusiness[]> {
  const url = `${API_BASE}/admin/pending-businesses`;
  const res = await fetchWithApiLog(url, { headers: bearerAuthHeaders() });
  return readApiJson<AdminPendingBusiness[]>(res, url);
}

export async function approveBusiness(userId: number): Promise<{ message: string }> {
  const url = `${API_BASE}/admin/businesses/${userId}/approve`;
  const res = await fetchWithApiLog(url, {
    method: "PATCH",
    headers: bearerAuthHeaders(),
  });
  return readApiJson<{ message: string }>(res, url);
}

export async function rejectBusiness(userId: number): Promise<{ message: string }> {
  const url = `${API_BASE}/admin/businesses/${userId}/reject`;
  const res = await fetchWithApiLog(url, {
    method: "PATCH",
    headers: bearerAuthHeaders(),
  });
  return readApiJson<{ message: string }>(res, url);
}

export async function fetchBusinesses(): Promise<AdminBusiness[]> {
  const url = `${API_BASE}/admin/businesses`;
  const res = await fetchWithApiLog(url, { headers: bearerAuthHeaders() });
  return readApiJson<AdminBusiness[]>(res, url);
}

export async function fetchBusinessDetail(userId: number): Promise<AdminBusinessDetail> {
  const url = `${API_BASE}/admin/businesses/${userId}`;
  const res = await fetchWithApiLog(url, { headers: bearerAuthHeaders() });
  return readApiJson<AdminBusinessDetail>(res, url);
}

export async function fetchBusinessProducts(userId: number): Promise<AdminBusinessProductsResponse> {
  const url = `${API_BASE}/admin/businesses/${userId}/products`;
  const res = await fetchWithApiLog(url, { headers: bearerAuthHeaders() });
  return readApiJson<AdminBusinessProductsResponse>(res, url);
}
