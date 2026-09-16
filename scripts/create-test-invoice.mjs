import { writeFile } from 'node:fs/promises';
const invoice = { invoiceNumber: 'TEST-SOURCE-LOOKUP', exporterName: 'Test Exporter', importerName: 'Test Importer', currency: 'USD', totalAmount: 2000,
  lineItems: [{ description: 'Laptop computer', quantity: 2, unitValue: 1000, totalValue: 2000, countryOfOrigin: 'CN', declaredHsCode: null }] };
await writeFile('scratch/test-invoice.json', JSON.stringify(invoice, null, 2));
const stream = 'BT /F1 14 Tf 50 740 Td (Invoice No: TEST-PDF-READING) Tj 0 -30 Td (USD) Tj 0 -30 Td (Laptop computer 2 1000 2000) Tj ET';
const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
let pdf = '%PDF-1.4\n'; const offsets = [0];
objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
const xref = Buffer.byteLength(pdf);
pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
await writeFile('scratch/test-invoice.pdf', pdf);
const { default: sharp } = await import('sharp');
await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="600"><rect width="100%" height="100%" fill="white"/><g font-family="Arial" font-size="42" fill="black"><text x="50" y="100">Invoice No: TEST-OCR-READING</text><text x="50" y="200">USD</text><text x="50" y="300">Laptop computer 2 1000 2000</text></g></svg>')).png().toFile('scratch/test-invoice.png');
console.log('Created synthetic PDF, image and JSON test invoices.');
