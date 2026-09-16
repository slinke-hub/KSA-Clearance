import type { Invoice, InvoiceLineItem } from '@prisma/client';
import type { SourceEvidence } from './official-classification';

export function serializeInvoice(invoice: Invoice & { lineItems: InvoiceLineItem[] }) {
  return { ...invoice, status: invoice.lineItems.every(item => (item.classificationEvidence as unknown as SourceEvidence)?.engineVersion === 2 && item.verifiedByUser) ? 'VERIFIED' : 'PENDING', totalAmount: Number(invoice.totalAmount), lineItems: [...invoice.lineItems].sort((a, b) => a.lineNumber - b.lineNumber).map(item => {
    const stored = item.classificationEvidence as unknown as SourceEvidence | null;
    const evidence = stored?.sourceMode === 'ZATCA_ONLY' ? stored : stored ? {
      checkedAt: stored.checkedAt, zatcaUrl: stored.zatcaUrl, tariffConfirmed: stored.tariffConfirmed,
      regulationConfirmed: false, matchReason: stored.matchReason, tariffDescription: stored.tariffDescription,
      importStatus: stored.importStatus, valuation: stored.valuation, candidates: stored.candidates,
      regulation: 'Not provided by ZATCA', certificateRequirements: null,
      warnings: ['Earlier multi-source result. Recheck ZATCA to retrieve current import requirements.'],
    } : null;
    const trusted = !!evidence?.tariffConfirmed;
    return { ...item, classificationEvidence: evidence, quantity: Number(item.quantity), unitValue: Number(item.unitValue), totalValue: Number(item.totalValue),
      vatRate: Number(item.vatRate), matchedHsCode: trusted ? item.matchedHsCode : null,
      dutyRate: trusted && item.dutyRate !== null ? Number(item.dutyRate) : null,
      calculatedDutyFee: trusted && item.calculatedDutyFee !== null ? Number(item.calculatedDutyFee) : null,
      calculatedVatFee: trusted && item.calculatedVatFee !== null ? Number(item.calculatedVatFee) : null,
      regulatoryStatus: evidence?.regulationConfirmed ? item.regulatoryStatus : 'UNKNOWN',
      requiredCertificates: evidence?.certificateRequirements ? [evidence.certificateRequirements] : [],
      verifiedByUser: stored?.engineVersion === 2 && trusted && !!evidence?.regulationConfirmed && item.verifiedByUser,
      confidenceScore: null,
    };
  }) };
}
