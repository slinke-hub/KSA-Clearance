export interface InvoiceCharge { label: string; amount: number }
export const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export function invoiceTotal(items: { totalValue: number }[], charges: InvoiceCharge[] = []) {
  return money(items.reduce((sum, item) => sum + item.totalValue, 0) + charges.reduce((sum, charge) => sum + charge.amount, 0));
}

/** Allocate invoice adjustments by goods value, reconciling every cent. */
export function allocateInvoiceValues(items: { totalValue: number }[], charges: InvoiceCharge[] = []) {
  const goods = items.reduce((sum, item) => sum + item.totalValue, 0);
  const adjustment = money(charges.reduce((sum, charge) => sum + charge.amount, 0));
  let cumulative = 0, allocated = 0;
  return items.map(item => {
    cumulative += item.totalValue;
    const target = goods ? money(adjustment * cumulative / goods) : 0;
    const share = money(target - allocated);
    allocated = target;
    return { customsValue: money(item.totalValue + share), allocatedCharges: share };
  });
}
