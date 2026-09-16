/**
 * Client-side invoice file parsers.
 * Supports: JSON, CSV, and Excel (.xlsx/.xls).
 * Returns a ParsedInvoiceDocument or throws with a descriptive error.
 */

// @ts-ignore — xlsx doesn't ship types for its ESM entry point
import * as XLSX from 'xlsx/xlsx.mjs';

/** Minimal line item shape sent from the browser — the API Zod schema fills in defaults. */
export interface RawLineItem {
  lineNumber: number;
  description: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  countryOfOrigin: string;
  declaredHsCode: string | null;
}

export interface ParsedInvoiceDocument {
  charges?: { label: string; amount: number }[];
  statedTotal?: number;
  extractedText?: string;
  invoiceNumber: string;
  exporterName: string;
  importerName: string;
  currency: string;
  lineItems: RawLineItem[];
  totalAmount: number;
}

// ---------------------------------------------------------------------------
// JSON parser
// Expects the file to be either:
//   a) A full invoice object: { invoiceNumber, exporterName, ..., lineItems: [...] }
//   b) An array of line items: [{ description, quantity, unitValue, ... }, ...]
// ---------------------------------------------------------------------------
export function parseJsonInvoice(raw: string, fileName: string): ParsedInvoiceDocument {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON — could not parse file content.');
  }

  // Case A: full invoice object
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    const items = normalizeLineItems(obj.lineItems ?? obj.line_items ?? obj.items ?? obj.entries, fileName);
    const charges = Array.isArray(obj.charges) ? obj.charges.map(charge => {
      if (!charge || typeof charge.label !== 'string' || typeof charge.amount !== 'number' || !Number.isFinite(charge.amount)) throw new Error('Invalid invoice adjustment. Each charge needs a label and numeric amount.');
      return { label: charge.label, amount: charge.amount };
    }) : [];
    return {
      invoiceNumber: String(obj.invoiceNumber ?? obj.invoice_number ?? obj.InvoiceNumber ?? `INV-${Date.now().toString().slice(-6)}`),
      exporterName:  String(obj.exporterName  ?? obj.exporter_name  ?? obj.ExporterName  ?? ''),
      importerName:  String(obj.importerName  ?? obj.importer_name  ?? obj.ImporterName  ?? ''),
      currency:      String(obj.currency ?? obj.Currency ?? '').toUpperCase(),
      totalAmount:   toNumber(obj.totalAmount ?? obj.total_amount ?? obj.TotalAmount ?? (items.reduce((sum, item) => sum + item.totalValue, 0) + charges.reduce((sum, charge) => sum + charge.amount, 0))),
      charges,
      lineItems:     items,
    };
  }

  // Case B: bare array of line items
  if (Array.isArray(data)) {
    const items = normalizeLineItems(data, fileName);
    const total = items.reduce((s, li) => s + li.totalValue, 0);
    return {
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      exporterName:  '',
      importerName:  '',
      currency:      '',
      totalAmount:   total || 1,
      lineItems:     items,
    };
  }

  throw new Error('Unrecognized JSON structure — expected an invoice object or an array of line items.');
}

// ---------------------------------------------------------------------------
// CSV parser
// Detects header row and maps columns (case-insensitive, flexible naming).
// ---------------------------------------------------------------------------
export function parseCsvInvoice(raw: string, fileName: string): ParsedInvoiceDocument {
  const workbook = XLSX.read(raw, { type: 'string', raw: true });
  const lines = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', raw: false });
  if (lines.length < 2) throw new Error('CSV file must have a header row and at least one data row.');
  const headers = lines[0].map(h => h.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().trim().replace(/[^a-z0-9]/g, '_'));
  const rows = lines.slice(1).filter(row => row.some(cell => String(cell).trim())).map(vals => {
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (vals[i] ?? '').trim(); });
    return row;
  });

  const items = rows.map((row, i) => mapRowToLineItem(row, i + 1));
  const total = items.reduce((s, li) => s + li.totalValue, 0);

  return {
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    exporterName:  '',
    importerName:  '',
    currency:      '',
    totalAmount:   total || 1,
    lineItems:     items,
  };
}

// ---------------------------------------------------------------------------
// Excel parser (uses SheetJS / xlsx package already in package.json)
// ---------------------------------------------------------------------------
export function parseExcelInvoice(buffer: ArrayBuffer, fileName: string): ParsedInvoiceDocument {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames.find((name: string) => workbook.Sheets[name]['!ref']);
  if (!sheetName) throw new Error('Excel file contains no sheets.');
  const sheet = workbook.Sheets[sheetName];
  const allRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '', raw: false });
  const headerRow = allRows.findIndex(row => row.some(cell => /^(?:description|product description|item description|item name|english name|arabic name|product name)$/i.test(String(cell).trim())));
  if (headerRow < 0) throw new Error('No product description column found. Ensure there is a header row containing Description, Item Name, or Product Name.');

  const normalize = (value: unknown) => String(value).replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
  let headers = allRows[headerRow].map(normalize);
  const items: RawLineItem[] = [];
  const charges: { label: string; amount: number }[] = [];
  let statedTotal: number | undefined;
  let previousProduct = false;
  const text = allRows.map(row => row.filter(Boolean).join(' | ')).join('\n');
  // Only an explicit origin declaration can supply origin for every product.
  const origin = /goods are all made in china origin/i.test(text) ? 'CN' : '';
  for (const cells of allRows.slice(headerRow + 1)) {
    if (cells.some(cell => /^(?:description|product description|item description|item name|english name|arabic name|product name)$/i.test(String(cell).trim()))) {
      headers = cells.map(normalize);
      previousProduct = false;
      continue;
    }
    const row: Record<string, string> = {};
    headers.forEach((header, index) => { if (header) row[header] = String(cells[index] ?? '').trim(); });
    const qty = findByKeySubstring(row, ['quantity', 'qty']);
    const price = findByKeySubstring(row, ['unit_price', 'unit_value', 'price']);
    const amount = findByKeySubstring(row, ['amount', 'total_value', 'total']);
    const item = mapRowToLineItem(row, items.length + 1);
    const numeric = (value: string) => /^-?\d[\d,]*(?:\.\d+)?$/.test(value);
    if (item.description.length >= 3 && numeric(qty) && (numeric(price) || numeric(amount)) && item.quantity > 0) {
      if (!numeric(price)) item.unitValue = item.totalValue / item.quantity;
      const sku = findByKeySubstring(row, ['cust_item_no_', 'sku', 'part_number']);
      if (sku) item.description += ` [Item: ${sku}]`;
      // Preserve the quantity unit without confusing PCS and SETS.
      const qtyColumn = headers.findIndex(header => /^(quantity|qty)$/.test(header));
      const unit = String(cells[qtyColumn + 1] ?? '').trim();
      if (/^(PCS?|SETS?|PAIRS?|KG|M)$/i.test(unit)) item.description += ` [Unit: ${unit}]`;
      item.countryOfOrigin ||= origin;
      items.push(item);
      previousProduct = true;
    } else if (previousProduct && item.description && !qty && !price && !amount &&
        cells.every((cell, index) => !String(cell).trim() || /description/.test(headers[index] ?? ''))) {
      items[items.length - 1].description += ` ${item.description}`;
    } else {
      previousProduct = false;
      const label = cells.slice(0, -1).filter(Boolean).join(' ').trim();
      const last = String(cells[cells.length - 1] ?? '').trim();
      if (numeric(last) && /\b(insurance|freight|discount|credit)\b/i.test(label)) charges.push({ label, amount: toNumber(last) });
      if (numeric(last) && /\btotal amount\b/i.test(label)) statedTotal = toNumber(last);
    }
  }

  if (!items.length) throw new Error('No valid line items found in Excel file. Ensure the sheet has description, quantity, and unit value columns.');

  const total = items.reduce((s: number, li: RawLineItem) => s + li.totalValue, 0);

  return {
    invoiceNumber: text.match(/invoice\s*(?:no\.?|number|#)\s*[:#]?\s*([\w/-]+)/i)?.[1] ?? fileName.replace(/\.[^.]+$/, ''),
    exporterName: allRows.slice(0, headerRow).flat().map(String).find(value => /\b(?:INC\.|LIMITED|LTD\.|CO\.)\s*$/i.test(value.trim()))?.trim() ?? '',
    importerName: text.match(/Messrs\.?\s*:\s*([^|\n]+)/i)?.[1].trim() ?? '',
    currency: /US\$/.test(text) ? 'USD' : text.match(/\b(SAR|USD|EUR|GBP|AED|CNY|JPY)\b/)?.[1] ?? '',
    totalAmount: Math.round((total + charges.reduce((sum, charge) => sum + charge.amount, 0)) * 100) / 100,
    charges, statedTotal, extractedText: text,
    lineItems:     items,
  };
}

// ---------------------------------------------------------------------------
// Master dispatcher — picks parser by file extension/MIME type
// ---------------------------------------------------------------------------
export async function parseInvoiceFile(file: File): Promise<ParsedInvoiceDocument> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'json') {
    const text = await file.text();
    return parseJsonInvoice(text, file.name);
  }

  if (ext === 'csv') {
    const text = await file.text();
    return parseCsvInvoice(text, file.name);
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer();
    return parseExcelInvoice(buffer, file.name);
  }

  if (ext === 'pdf') {
    const { readDocumentText } = await import('./document-reader');
    return parseDocumentText(await readDocumentText(file), file.name);
  }
  if (['png', 'jpg', 'jpeg'].includes(ext)) {
    const { readDocumentText } = await import('./document-reader');
    return parseDocumentText(await readDocumentText(file), file.name);
  }

  throw new Error(`Unsupported file type: .${ext}. Supported formats: JSON, CSV, XLSX, XLS.`);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Split a CSV line respecting quoted fields. */
function splitCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/** Find the first non-empty value in `row` whose key contains any of the given substrings. */
function findByKeySubstring(row: Record<string, string>, substrings: string[]): string {
  // 1. Try exact key matches first (fastest path)
  for (const sub of substrings) {
    if (row[sub] !== undefined && row[sub].trim() !== '') return row[sub].trim();
  }
  // 2. Fall back to substring/includes matching across all keys
  const keys = Object.keys(row);
  for (const sub of substrings) {
    for (const key of keys) {
      if (key.includes(sub) && row[key].trim() !== '') return row[key].trim();
    }
  }
  return '';
}

/** Map a normalised row object to a LineItemInput shape. */
function mapRowToLineItem(row: Record<string, string>, lineNumber: number): RawLineItem {
  // Description: try many known aliases — exact keys first, then substring matches
  const description = findByKeySubstring(row, [
    'description', 'english_name', 'arabic_name', 'item_name', 'itemname', 'item_description',
    'product_description', 'productdescription', 'product_name', 'productname',
    'goods_description', 'goodsdescription', 'material_description',
    'name', 'article', 'commodity', 'sku_desc', 'sku_description', 'skudescription',
    'item_title', 'product_title',
    'desc', 'particular', 'particulars',
    'product', 'goods', 'material',
  ]);

  const quantity    = toNumber(findByKeySubstring(row, ['quantity', 'qty', 'units', 'pcs', 'pieces']) || '1');
  const unitValue   = toNumber(findByKeySubstring(row, ['unit_value', 'unit_price', 'unitprice', 'price', 'unit_cost', 'rate', 'unit_rate']) || '0');
  const rawTotal    = toNumber(findByKeySubstring(row, ['total_value', 'total_price', 'totalprice', 'amount', 'line_total', 'total', 'value', 'ext_price', 'extended_price']) || '0');
  const totalValue  = rawTotal || Math.round(quantity * unitValue * 100) / 100;

  const origin = findByKeySubstring(row, ['country_of_origin', 'origin', 'country', 'coo', 'made_in', 'source_country']);
  const countryOfOrigin = /^[a-z]{2}$/i.test(origin) ? origin.toUpperCase() : '';

  const declaredHsCode = (findByKeySubstring(row, ['hs_code', 'hscode', 'hs', 'tariff_code', 'tariff', 'commodity_code', 'hts_code', 'htscode']) || '').replace(/\D/g, '') || null;

  return {
    lineNumber,
    description,
    quantity,
    unitValue,
    totalValue,
    countryOfOrigin,
    declaredHsCode,
  };
}

/** Normalize an unknown value to a line-item array. */
function normalizeLineItems(items: unknown, fileName: string) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('No line items found in the JSON file. Expected a "lineItems" (or "items") array.');
  }
  return items.map((item, i) => {
    const row: Record<string, string> = {};
    for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
      row[k.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().trim().replace(/[^a-z0-9]/g, '_')] = String(v ?? '').trim();
    }
    return mapRowToLineItem(row, i + 1);
  });
}

function toNumber(val: unknown): number {
  const n = Number(String(val ?? '0').replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
}

export function parseDocumentText(text: string, fileName: string): ParsedInvoiceDocument {
  if (!text.trim()) throw new Error('No readable text was found. Please upload a clearer scan.');
  const lineItems: RawLineItem[] = [];
  // Conservative common layout: description, quantity, unit price, total.
  // Other layouts remain visible in the preview for correction, never invented.
  for (const line of text.split(/\r?\n/)) {
    const match = line.trim().match(/^(?:\d+[.)]?\s+)?(.+?)\s+(\d[\d,.]*)\s+(\d[\d,.]*)\s+(\d[\d,.]*)\s*$/);
    if (!match || /^(sub.?total|total|tax|vat|freight|insurance|discount)\b/i.test(match[1])) continue;
    const [, description, qty, unit, total] = match;
    const quantity = toNumber(qty), unitValue = toNumber(unit), totalValue = toNumber(total);
    if (description.length < 3 || quantity <= 0 || Math.abs(quantity * unitValue - totalValue) >= 0.5) continue;
    lineItems.push({ lineNumber: lineItems.length + 1, description, quantity, unitValue, totalValue, countryOfOrigin: '', declaredHsCode: null });
  }
  return {
    invoiceNumber: text.match(/invoice\s*(?:no\.?|number|#)\s*[:#]?\s*([\w/-]+)/i)?.[1] ?? fileName.replace(/\.[^.]+$/, ''),
    exporterName: '', importerName: '',
    currency: text.match(/\b(SAR|USD|EUR|GBP|AED|CNY|JPY)\b/)?.[1] ?? '',
    lineItems, totalAmount: lineItems.reduce((sum, item) => sum + item.totalValue, 0), extractedText: text,
  };
}
