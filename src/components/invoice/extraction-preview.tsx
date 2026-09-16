'use client';
import { ParsedInvoiceDocument } from '@/lib/services/file-parsers';
import { invoiceTotal } from '@/lib/services/invoice-valuation';

export function ExtractionPreview({ invoice, onChange, onSubmit, onCancel }: {
  invoice: ParsedInvoiceDocument; onChange: (invoice: ParsedInvoiceDocument) => void;
  onSubmit: () => void; onCancel: () => void;
}) {
  const inputClass = 'w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:bg-slate-800 dark:text-white';
  const total = invoiceTotal(invoice.lineItems, invoice.charges);
  const mismatch = invoice.statedTotal !== undefined && Math.abs(total - invoice.statedTotal) > 0.01;
  const format = (value: number) => `${invoice.currency} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return <form onSubmit={event => { event.preventDefault(); onSubmit(); }} className="mt-4 space-y-4">
    <p className="text-sm">Review the extracted invoice. Correct unclear text and check that every product is included before looking up customs information.</p>
    {invoice.extractedText && <details><summary className="cursor-pointer text-sm">View text read from your invoice</summary><pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-slate-100 p-3 text-xs dark:bg-slate-800">{invoice.extractedText}</pre></details>}
    <div className="grid gap-3 sm:grid-cols-2">
      {(['invoiceNumber', 'exporterName', 'importerName', 'currency'] as const).map((key, index) => <label key={key} className="text-xs">
        {['Invoice number', 'Exporter', 'Importer', 'Invoice currency (e.g. USD, SAR)'][index]}
        <input required className={inputClass} maxLength={key === 'currency' ? 3 : 255} value={invoice[key]} onChange={event => onChange({ ...invoice, [key]: key === 'currency' ? event.target.value.toUpperCase() : event.target.value })} />
      </label>)}
    </div>
    <div className="rounded border border-slate-200 p-3 text-sm space-y-2">
      <p>{invoice.lineItems.length} products · Goods subtotal: {format(invoice.lineItems.reduce((sum, item) => sum + item.totalValue, 0))}</p>
      {(invoice.charges ?? []).map((charge, index) => <label className="flex items-center gap-3" key={index}>
        <span className="flex-1">{charge.label}</span><input aria-label={charge.label} type="number" step="0.01" required className={`${inputClass} max-w-40`} value={charge.amount} onChange={event => onChange({ ...invoice, charges: invoice.charges?.map((row, i) => i === index ? { ...row, amount: Number(event.target.value) } : row) })} />
      </label>)}
      <p className="font-semibold">Invoice total: {format(total)}</p>
      {invoice.statedTotal !== undefined && <p>Document total: {format(invoice.statedTotal)} · {mismatch ? 'Difference requires review' : 'Reconciled'}</p>}
      {!!invoice.charges?.length && <p className="text-xs text-slate-500">Duty estimates will include these adjustments, allocated across products by value. Review their customs treatment.</p>}
    </div>
    <div className="upload-products overflow-auto"><table className="w-full text-left text-xs"><thead><tr>{['Product description', 'Quantity', 'Unit price', 'Origin (ISO-2)', 'Declared HS code', ''].map((label, i) => <th key={i} className="p-1">{label}</th>)}</tr></thead>
      <tbody>{invoice.lineItems.map((item, index) => <tr key={index}>
        {(['description', 'quantity', 'unitValue', 'countryOfOrigin', 'declaredHsCode'] as const).map(key => <td key={key} className="p-1"><input
          aria-label={`${key} item ${index + 1}`} className={`${inputClass} ${key === 'description' ? 'min-w-64' : 'min-w-24'}`}
          required={key !== 'declaredHsCode'} type={key === 'quantity' || key === 'unitValue' ? 'number' : 'text'}
          min={key === 'quantity' ? '0.001' : '0'} step="any" maxLength={key === 'countryOfOrigin' ? 2 : undefined}
          value={item[key] ?? ''} onChange={event => {
            const updated = { ...item, [key]: key === 'quantity' || key === 'unitValue' ? Number(event.target.value) : event.target.value };
            if (key === 'quantity' || key === 'unitValue') updated.totalValue = Math.round(updated.quantity * updated.unitValue * 100) / 100;
            onChange({ ...invoice, lineItems: invoice.lineItems.map((row, i) => i === index ? updated : row) });
          }} /></td>)}
        <td><button type="button" className="p-2 text-red-600" onClick={() => onChange({ ...invoice, lineItems: invoice.lineItems.filter((_, i) => i !== index) })}>Remove</button></td>
      </tr>)}</tbody></table></div>
    {!invoice.lineItems.length && <p className="text-sm text-amber-700">The text was read, but the product table needs manual entry. Add each product using the extracted text above.</p>}
    <button type="button" className="text-sm text-emerald-700" onClick={() => onChange({ ...invoice, lineItems: [...invoice.lineItems, { lineNumber: invoice.lineItems.length + 1, description: '', quantity: 1, unitValue: 0, totalValue: 0, countryOfOrigin: '', declaredHsCode: null }] })}>+ Add product</button>
    {mismatch && <label className="block text-sm text-amber-700"><input type="checkbox" checked={false} onChange={() => onChange({ ...invoice, statedTotal: undefined })} /> I reviewed the difference and want to use the corrected total.</label>}
    <div className="upload-review-actions"><button type="submit" disabled={!invoice.lineItems.length || mismatch} className="rounded bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-40">Look up HS codes, duty and regulatory status</button><button type="button" onClick={onCancel} className="text-sm">Cancel</button></div>
  </form>;
}
