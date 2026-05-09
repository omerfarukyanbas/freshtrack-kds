import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "../api/products";
import { predictDaysToSell } from "../api/predict";
import { shouldRedirectToLogin } from "../api/http";
import type { ProductDashboardRow } from "../types/product";

type UseDashboardProductsOptions = {
  onUnauthorized?: () => void;
};

export function useDashboardProducts(options?: UseDashboardProductsOptions) {
  const [rows, setRows] = useState<ProductDashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onUnauthorizedRef = useRef(options?.onUnauthorized);
  useEffect(() => {
    onUnauthorizedRef.current = options?.onUnauthorized;
  }, [options?.onUnauthorized]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const products = await api.fetchProducts();
      const pricingOutcomes = await Promise.allSettled(
        products.map((p) => api.fetchProductPricing(p.id)),
      );
      const salesOutcomes = await Promise.allSettled(
        products.map((p) => api.fetchProductSalesHistory(p.id)),
      );
      const predictOutcomes = await Promise.allSettled(
        products.map((p, i) => {
          const pricing = pricingOutcomes[i];
          const sales = salesOutcomes[i];
          const discountRate =
            pricing.status === "fulfilled" ? pricing.value.discount_rate : 0;
          const pastSales =
            sales.status === "fulfilled"
              ? sales.value.last_30_days_sales
              : Math.max(1, p.last_30_days_sales);
          return predictDaysToSell({
            price: p.selling_price,
            stock_quantity: p.stock_quantity,
            past_sales: pastSales,
            discount_rate: discountRate,
          });
        }),
      );

      const merged: ProductDashboardRow[] = products.map((p, i) => {
        const pricingOutcome = pricingOutcomes[i];
        const predictOutcome = predictOutcomes[i];

        const discountRate =
          pricingOutcome.status === "fulfilled" ? pricingOutcome.value.discount_rate : 0;
        const newPrice =
          pricingOutcome.status === "fulfilled"
            ? pricingOutcome.value.new_price
            : p.selling_price;

        const predictedDays =
          predictOutcome.status === "fulfilled"
            ? predictOutcome.value.predicted_days_to_sell
            : Math.min(30, Math.max(1, p.stock_quantity));

        const predictError =
          predictOutcome.status === "rejected"
            ? predictOutcome.reason instanceof Error
              ? predictOutcome.reason.message
              : "Tahmin alınamadı"
            : undefined;

        const pricingError =
          pricingOutcome.status === "rejected"
            ? pricingOutcome.reason instanceof Error
              ? pricingOutcome.reason.message
              : "Fiyat alınamadı"
            : undefined;

        const pricingExtras =
          pricingOutcome.status === "fulfilled"
            ? {
                remaining_days: pricingOutcome.value.remaining_days,
                last_30_days_sales: pricingOutcome.value.last_30_days_sales,
                daily_sales_rate: pricingOutcome.value.daily_sales_rate,
                estimated_days_to_sell: pricingOutcome.value.estimated_days_to_sell,
                pricing_reason: pricingOutcome.value.pricing_reason,
              }
            : {
                remaining_days: p.remaining_days,
                last_30_days_sales: p.last_30_days_sales,
                daily_sales_rate: p.daily_sales_rate,
                estimated_days_to_sell: Math.round(
                  (p.stock_quantity / Math.max(p.daily_sales_rate, 1)) * 100,
                ) / 100,
                pricing_reason: "",
              };

        return {
          ...p,
          discount_rate: discountRate,
          new_price: newPrice,
          ...pricingExtras,
          predicted_days_to_sell: predictedDays,
          predictedText: `Bu urun ${predictedDays.toFixed(2)} gunde tukenir`,
          pricingError,
          predictError,
        };
      });

      setRows(merged);
    } catch (e) {
      if (shouldRedirectToLogin(e)) {
        onUnauthorizedRef.current?.();
      }
      setRows([]);
      setError(
        e instanceof Error
          ? e.message
          : "Urunler yuklenemedi. Backend calisiyor mu?",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, loading, error, reload };
}
