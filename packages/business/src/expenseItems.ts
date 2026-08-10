export interface ExpenseItemLike {
  quantity: number;
  unitPriceMinor: number;
}

// Single source of truth for the quantity × unit price computation, shared by
// the client (live preview while typing) and the server (Edge Function /
// trigger that recomputes on write — the client-submitted total is never
// trusted, per KeurFlow's zero-trust rule on financial data).
export function calculateItemTotal(item: ExpenseItemLike): number {
  return Math.round(item.quantity * item.unitPriceMinor);
}

export function calculateExpenseTotal(items: readonly ExpenseItemLike[]): number {
  return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
}
