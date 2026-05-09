import type { Product } from "../types/product";

/** SKT kritik eşiği (backend ile uyumlu: ≤7 gün) */
export function isCritical(p: Product): boolean {
  return p.shelf_status === "CRITICAL" || p.remaining_days <= 7;
}

/**
 * Tahmini israf (basit simülasyon):
 * Kritik ürünlerde, kalan gün azaldıkça satılamama riski artar.
 * risk = (7 - min(7, max(0, remaining_days))) / 7
 * israf ≈ maliyet * stok * risk * 0.35
 */
export function estimateWaste(products: Product[]): number {
  let total = 0;
  for (const p of products) {
    if (!isCritical(p)) continue;
    const rd = Math.max(0, Math.min(7, p.remaining_days));
    const risk = (7 - rd) / 7;
    total += p.purchase_price * p.stock_quantity * risk * 0.35;
  }
  return Math.round(total * 100) / 100;
}

/**
 * Kâr analizi (basit simülasyon):
 * - Brüt potansiyel: (satış - alış) * stok
 * - Kritik stok üzerinde fire maliyeti düşülür
 */
export function profitSimulation(products: Product[]): {
  inventoryCost: number;
  potentialRevenue: number;
  grossPotential: number;
  adjustedMargin: number;
  wasteDrag: number;
} {
  let inventoryCost = 0;
  let potentialRevenue = 0;
  for (const p of products) {
    inventoryCost += p.purchase_price * p.stock_quantity;
    potentialRevenue += p.selling_price * p.stock_quantity;
  }
  const grossPotential = potentialRevenue - inventoryCost;
  const wasteDrag = estimateWaste(products);
  const adjustedMargin = grossPotential - wasteDrag;
  return {
    inventoryCost: round2(inventoryCost),
    potentialRevenue: round2(potentialRevenue),
    grossPotential: round2(grossPotential),
    adjustedMargin: round2(adjustedMargin),
    wasteDrag: round2(wasteDrag),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function criticalCount(products: Product[]): number {
  return products.filter(isCritical).length;
}
