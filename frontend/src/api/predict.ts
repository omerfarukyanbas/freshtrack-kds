import { API_BASE } from "./config";
import { authHeaders, fetchWithApiLog, readApiJson } from "./http";

export type PredictPayload = {
  price: number;
  stock_quantity: number;
  past_sales: number;
  discount_rate?: number;
};

export type PredictResponse = {
  predicted_days_to_sell: number;
};

export async function predictDaysToSell(
  payload: PredictPayload,
): Promise<PredictResponse> {
  const url = `${API_BASE}/predict`;
  const res = await fetchWithApiLog(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return readApiJson<PredictResponse>(res, url);
}
