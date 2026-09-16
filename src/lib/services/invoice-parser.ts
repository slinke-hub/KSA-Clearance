import { LineItemInput } from '../validations/invoice';

export interface ParsedInvoiceDocument {
  invoiceNumber: string;
  exporterName: string;
  importerName: string;
  currency: string;
  lineItems: LineItemInput[];
  totalAmount: number;
}



export async function calculateSha256(buffer: ArrayBuffer): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('Secure invoice reading requires HTTPS or localhost.');
}
