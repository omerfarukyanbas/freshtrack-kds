import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "../types/product";
import * as api from "../api/products";
import { shouldRedirectToLogin } from "../api/http";

type UseProductsOptions = {
  onUnauthorized?: () => void;
};

export function useProducts(options?: UseProductsOptions) {
  const [products, setProducts] = useState<Product[]>([]);
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
      const data = await api.fetchProducts();
      setProducts(data);
    } catch (e) {
      if (shouldRedirectToLogin(e)) {
        onUnauthorizedRef.current?.();
      }
      setError(e instanceof Error ? e.message : "Yükleme hatası");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { products, loading, error, reload, setProducts };
}
