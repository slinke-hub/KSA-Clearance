import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

const response = await fetch('http://localhost:3000/api/invoices');
assert.equal(response.status, 200);
const body = await response.json();
const hash = createHash('sha256').update(await readFile('scratch/test-invoice.pdf')).digest('hex');
const testInvoice = body.data.find(invoice => invoice.invoiceNumber === 'TEST-PDF-READING' && invoice.fileHash === hash && invoice.exporterName === 'Synthetic Test Exporter');
assert.ok(testInvoice, 'Synthetic browser test invoice was saved');
assert.equal(testInvoice.currency, 'USD');
assert.equal(testInvoice.status, 'PENDING');
const item = testInvoice.lineItems[0];
assert.equal(item.matchedHsCode, '847130000002');
assert.equal(item.dutyRate, 0);
assert.equal(item.calculatedDutyFee, 0);
assert.equal(item.calculatedVatFee, 300);
assert.equal(item.regulatoryStatus, 'REGULATED');
assert.equal(item.verifiedByUser, false);
assert.ok(item.classificationEvidence.tabseerGuidance);
assert.match(item.classificationEvidence.saberUrl, /847130000002/);
const badOverride = await fetch(`http://localhost:3000/api/invoices/${testInvoice.id}/line-items/1`, {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchedHsCode: '123', verifiedByUser: true }),
});
assert.equal(badOverride.status, 400);
const clear = await fetch(`http://localhost:3000/api/invoices/${testInvoice.id}/clear`, { method: 'POST' });
assert.equal(clear.status, 501);
console.log('Browser PDF upload persisted correct live HS, duty, VAT, regulatory status, currency and all source evidence. Invalid overrides and unconnected clearance rejected.');

// Clean up only this script's exact synthetic fixture; preserve every user invoice.
const prisma = new PrismaClient();
try {
  await prisma.$transaction(async tx => {
    const owned = await tx.invoice.findFirst({ where: { id: testInvoice.id, fileHash: hash, invoiceNumber: 'TEST-PDF-READING', exporterName: 'Synthetic Test Exporter' } });
    assert.ok(owned);
    await tx.auditLog.deleteMany({ where: { entityId: { in: [testInvoice.id, ...testInvoice.lineItems.map(line => line.id)] } } });
    await tx.invoice.delete({ where: { id: owned.id } });
  });
  console.log('Removed only the synthetic test invoice and its test audit records.');
} finally { await prisma.$disconnect(); }
