import type { InvoiceEntity, LineItemEntity } from '@/types/invoice';

export const SOURCE_RECHECK_DAYS = 30; // Workspace reminder, not a customs validity period.
export function needsSourceRefresh(item: LineItemEntity, now = Date.now()) {
  const date = Date.parse(item.classificationEvidence?.checkedAt ?? '');
  return !Number.isFinite(date) || date > now + 300000 || now - date > SOURCE_RECHECK_DAYS * 86400000;
}
export function hasZatcaCode(item: LineItemEntity) {
  const e = item.classificationEvidence;
  return !!(item.matchedHsCode && /^\d{12}$/.test(item.matchedHsCode) && e?.sourceMode === 'ZATCA_ONLY' && e.engineVersion === 2 && e.tariffConfirmed);
}
export function clearanceIssues(item: LineItemEntity, now = Date.now()): string[] {
  const issues: string[] = [];
  if (!hasZatcaCode(item)) issues.push('Confirm HS code with ZATCA');
  if (item.regulatoryStatus === 'PROHIBITED') issues.push('Import prohibited in the source record');
  if (item.regulatoryStatus === 'RESTRICTED') issues.push('Resolve the import restriction');
  if (!item.classificationEvidence?.regulationConfirmed || item.regulatoryStatus === 'UNKNOWN') issues.push('Confirm import controls');
  if (item.dutyRate === null || item.calculatedDutyFee === null || item.calculatedVatFee === null) issues.push('Complete duty and VAT assessment');
  if (needsSourceRefresh(item, now)) issues.push('Recheck source date');
  if (!item.verifiedByUser) issues.push('Review product scope and classification');
  return issues;
}
export interface CollectedCode {
  hsCode: string; latest: LineItemEntity; checkedAt: string | null;
  products: {description: string; invoiceId: string; invoiceNumber: string; lineNumber: number; origin: string; reviewed: boolean}[];
  reviewedCount: number; refreshNeeded: boolean; ratesObserved: (number | null)[];
}
export function collectHsCodes(invoices: InvoiceEntity[], now = Date.now()): CollectedCode[] {
  // Duplicate uploads of the same document and line do not inflate usage counts.
  const observations = new Map<string, {invoice: InvoiceEntity; item: LineItemEntity}>();
  const checked = (item: LineItemEntity) => Date.parse(item.classificationEvidence?.checkedAt ?? '') || 0;
  for (const invoice of invoices) for (const item of invoice.lineItems) {
    if (!hasZatcaCode(item)) continue;
    const key = `${invoice.fileHash || invoice.id}:${item.lineNumber}:${item.matchedHsCode}`;
    const previous = observations.get(key);
    if (!previous || checked(item) > checked(previous.item) || (checked(item) === checked(previous.item) && item.verifiedByUser)) observations.set(key,{invoice,item});
  }
  const groups = new Map<string, CollectedCode>();
  for (const {invoice,item} of observations.values()) {
    const hsCode = item.matchedHsCode!;
    let group = groups.get(hsCode);
    if (!group) { group = {hsCode,latest:item,checkedAt:item.classificationEvidence?.checkedAt ?? null,products:[],reviewedCount:0,refreshNeeded:false,ratesObserved:[]}; groups.set(hsCode,group); }
    if (checked(item) > checked(group.latest)) { group.latest = item; group.checkedAt = item.classificationEvidence?.checkedAt ?? null; }
    group.products.push({description:item.description,invoiceId:invoice.id,invoiceNumber:invoice.invoiceNumber,lineNumber:item.lineNumber,origin:item.countryOfOrigin,reviewed:item.verifiedByUser});
    if (item.verifiedByUser) group.reviewedCount++;
    if (!group.ratesObserved.includes(item.dutyRate)) group.ratesObserved.push(item.dutyRate);
  }
  return [...groups.values()].map(group=>({...group,refreshNeeded:needsSourceRefresh(group.latest,now)})).sort((a,b)=>a.hsCode.localeCompare(b.hsCode));
}
export function makeReviewPack(invoice: InvoiceEntity, now = Date.now()) {
  const issues = invoice.lineItems.map(item=>({lineNumber:item.lineNumber,description:item.description,issues:clearanceIssues(item,now)}));
  const completeFees = invoice.lineItems.length > 0 && invoice.lineItems.every(item=>hasZatcaCode(item) && item.calculatedDutyFee !== null && item.calculatedVatFee !== null);
  const sum = (key: 'calculatedDutyFee' | 'calculatedVatFee') => Math.round(invoice.lineItems.reduce((n,item)=>n+(item[key] ?? 0),0)*100)/100;
  return { preparedAt:new Date(now).toISOString(), purpose:'Clearance preparation and review; not a customs declaration or clearance approval',
    invoice, classificationChecksComplete: issues.length > 0 && issues.every(row=>!row.issues.length), issues,
    estimates:{currency:invoice.currency,allLinesAssessed:completeFees,duty:completeFees?sum('calculatedDutyFee'):null,vat:completeFees?sum('calculatedVatFee'):null},
    documentRequirements:[...new Set(invoice.lineItems.flatMap(item=>item.classificationEvidence?.certificateRequirements ? [item.classificationEvidence.certificateRequirements] : item.requiredCertificates))],
    documentVerification:'Not assessed by this report', sourceRecheckReminderDays:SOURCE_RECHECK_DAYS,
  };
}
export function csvDocument(rows: (string | number | null | undefined)[][]) {
  return '\uFEFF'+rows.map(row=>row.map(value=>{
    let cell = String(value ?? '');
    if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(cell)) cell = "'"+cell;
    return '"'+cell.replaceAll('"','""')+'"';
  }).join(',')).join('\r\n');
}
