// Processing now runs source lookups before saving results in the upload API.
// The former simulated OCR and automatic VERIFIED worker is retired.
export async function enqueueInvoiceProcessing(): Promise<void> {
  throw new Error('Use the invoice upload API for source-backed classification.');
}
