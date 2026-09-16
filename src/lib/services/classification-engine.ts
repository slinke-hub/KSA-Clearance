import { buildProductProfile, type ProductDetails } from './product-profile';
import { currentDuty, rankTariffs, selectTariff, zatcaControls, type ControlStatus } from './tariff-decision';
import { searchZatca, ZATCA_SEARCH_URL, type SearchResult, type TariffRow } from './zatca-client';
import { money } from './invoice-valuation';
import { searchHsReference, type ReferenceSuggestion } from './hs-reference';

export const SOURCE_URLS = { zatca: ZATCA_SEARCH_URL };
export interface SourceEvidence {
  referenceSuggestions?: ReferenceSuggestion[];
  valuation?: { customsValue: number; allocatedCharges: number };
  checkedAt: string; zatcaUrl: string; sourceMode?: 'ZATCA_ONLY'; engineVersion?: 2;
  tariffConfirmed: boolean; regulationConfirmed: boolean;
  regulationBasis?: 'ZATCA_CUSTOMS_CONTROLS';
  matchReason: string; tariffDescription: string | null; regulation: string | null;
  certificateRequirements: string | null; importStatus: string | null; warnings: string[];
  productDetails?: ProductDetails; normalizedDescription?: string; missingDetails?: string[];
  recognizedDetails?: ProductDetails;
  productInferences?: { text: string; reference: string }[];
  selectionStatus?: 'SUGGESTED' | 'DECLARED' | 'NEEDS_DETAILS' | 'NO_MATCH' | 'SOURCE_UNAVAILABLE';
  searchAttempts?: { query: string; type: 1 | 3; outcome: string; retrievedAt?: string }[];
  dutyExplanation?: string; feeFormula?: string; candidateCount?: number;
  candidates: { hsCode: string; description: string; heading?: string; score?: number; reasons?: string[];
    dutyRate?: number | null; regulatoryStatus?: ControlStatus; requirements?: string[] }[];
}

export async function classifyFromOfficialSources(description: string, customsValue: number | null, declaredHsCode?: string | null,
  valuation?: SourceEvidence['valuation'], productDetails: ProductDetails = {}, source: typeof searchZatca = searchZatca) {
  if (customsValue !== null && (!Number.isFinite(customsValue) || customsValue < 0)) throw new Error('Invalid customs value');
  const declared = declaredHsCode?.replace(/[\s.-]/g, '') || null;
  if (declared && !/^\d{6,12}$/.test(declared)) throw new Error('HS code must contain 6 to 12 digits');
  const profile = buildProductProfile(description, productDetails);
  const referenceSuggestions = searchHsReference(profile, declared);
  const evidence: SourceEvidence = { engineVersion: 2, sourceMode: 'ZATCA_ONLY', checkedAt: new Date().toISOString(),
    zatcaUrl: ZATCA_SEARCH_URL, valuation, tariffConfirmed: false, regulationConfirmed: false,
    regulationBasis: 'ZATCA_CUSTOMS_CONTROLS', matchReason: 'No tariff selected.', tariffDescription: null,
    regulation: null, certificateRequirements: null, importStatus: null, candidates: [], searchAttempts: [],
    productDetails, recognizedDetails: profile.details, productInferences: profile.inferences, referenceSuggestions,
    normalizedDescription: profile.normalizedDescription, missingDetails: profile.missingDetails,
    warnings: ['Regulated / Non-regulated describes controls listed in ZATCA, not SABER technical-regulation coverage.',
      'Amounts are estimates in invoice currency. Customs exchange rates, exemptions and additional assessments are not included.'],
  };
  const records = new Map<string, TariffRow>();
  let succeeded = false, failed = false;
  const seen = new Set<string>();
  async function retrieve(query: string, type: 1 | 3) {
    const key = `${type}:${query}`;
    if (seen.has(key) || seen.size >= 4) return;
    seen.add(key);
    try {
      const response: SearchResult = await source(query, type);
      succeeded = true;
      evidence.searchAttempts!.push({ query, type, outcome: response.rows.length ? 'Records found' : 'No records', retrievedAt: response.retrievedAt });
      for (const row of response.rows) if (!declared || row.HarmonizedCode.startsWith(declared.length === 12 ? declared.slice(0,6) : declared)) records.set(row.HarmonizedCode, row);
    } catch (error) {
      failed = true;
      const http = error instanceof Error ? error.message.match(/HTTP \d{3}/)?.[0] : undefined;
      evidence.searchAttempts!.push({ query, type, outcome: http ? `Source unavailable (${http})` : 'Source unavailable (connection or response failure)' });
    }
  }
  // Exact-code intent remains constrained to that code family; it is never silently replaced.
  if (declared) await retrieve(declared.slice(0,6), 3);
  else {
    // The PDF supplies search leads only. All assigned tariffs and fees still require a live record.
    if (referenceSuggestions.length) await retrieve(referenceSuggestions[0].hsCode.slice(0,6), 3);
    for (const prefix of profile.prefixes.slice(0,2)) await retrieve(prefix, 3);
    let ranked = rankTariffs([...records.values()], profile);
    // Parts and residual descriptions need their heading context from ZATCA.
    if (!failed && ranked.length && ranked[0].score < 50 && profile.prefixes.length) await retrieve(profile.prefixes[0].slice(0,4), 3);
    ranked = rankTariffs([...records.values()], profile);
    if (!failed && !selectTariff(ranked, profile)) {
      for (const query of profile.searchTerms) {
        await retrieve(query, 1);
        if (failed || selectTariff(rankTariffs([...records.values()], profile), profile)) break;
      }
    }
  }
  const ranked = rankTariffs([...records.values()], profile);
  const selected = selectTariff(ranked, profile, declared);
  evidence.candidateCount = ranked.length;
  const relevant = ranked.filter(candidate => !candidate.excluded && candidate.score > 0);
  const displayed = selected ? [selected.candidate, ...relevant.filter(x=>x!==selected.candidate)] : relevant;
  evidence.candidates = displayed.slice(0,20).map(candidate => {
    const duty = currentDuty(candidate.row), controls = zatcaControls(candidate.row, duty.detail);
    return { hsCode: candidate.row.HarmonizedCode, description: candidate.row.DescriptionEnglish || candidate.row.DescriptionArabic,
      heading: candidate.heading, score: candidate.score, reasons: candidate.reasons,
      dutyRate: duty.rate, regulatoryStatus: controls.status, requirements: controls.requirements };
  });
  let matchedHsCode: string | null = null, dutyRate: number | null = null;
  let regulatoryStatus: ControlStatus = 'UNKNOWN';
  let blocked = false;
  if (selected) {
    const row = selected.candidate.row, duty = currentDuty(row), controls = zatcaControls(row, duty.detail);
    matchedHsCode = row.HarmonizedCode; dutyRate = duty.rate; regulatoryStatus = controls.status;
    evidence.selectionStatus = selected.method; evidence.matchReason = [...profile.inferences.map(x=>x.text), selected.reason].join(' ');
    evidence.tariffConfirmed = true; evidence.regulationConfirmed = controls.confirmed;
    evidence.tariffDescription = row.DescriptionEnglish || row.DescriptionArabic;
    evidence.importStatus = duty.detail?.ImportStatusName ?? null;
    evidence.regulation = controls.reason;
    evidence.certificateRequirements = controls.requirements.join('; ') || null;
    evidence.dutyExplanation = duty.reason;
    blocked = controls.status === 'PROHIBITED';
    if (blocked) evidence.warnings.push('ZATCA prohibits import of this item. No payable-duty or landed-cost estimate is produced.');
    if (duty.rate === null) evidence.warnings.push(duty.reason);
    if (!controls.confirmed) evidence.warnings.push(controls.reason);
    if (selected.method === 'DECLARED' && (selected.candidate.excluded || profile.missingDetails.length)) evidence.warnings.push('The supplied code was found, but product specifications do not establish that it is the correct classification.');
  } else {
    evidence.selectionStatus = failed || !succeeded ? 'SOURCE_UNAVAILABLE' : profile.missingDetails.length && ranked.length ? 'NEEDS_DETAILS' : 'NO_MATCH';
    evidence.matchReason = declared?.length === 12 ? 'The exact supplied code could not be confirmed; no alternative was assigned.' :
      profile.missingDetails.length && ranked.length ? 'Provide the listed product details to distinguish the ranked tariff candidates.' :
      ranked.length ? 'No candidate has a sufficiently strong and distinct product match.' : 'No matching current ZATCA tariff records were retrieved.';
  }
  if (failed) evidence.warnings.push('One or more ZATCA searches were unavailable. The candidate list may be incomplete.');
  // A partial search cannot justify automatic selection against an incomplete candidate set.
  if (failed && selected?.method === 'SUGGESTED') {
    matchedHsCode = null; dutyRate = null; regulatoryStatus = 'UNKNOWN';
    evidence.tariffConfirmed = false; evidence.regulationConfirmed = false; evidence.selectionStatus = 'SOURCE_UNAVAILABLE';
    evidence.tariffDescription = null; evidence.regulation = null; evidence.certificateRequirements = null; evidence.importStatus = null;
    evidence.matchReason = 'A required source search failed. Review the available candidates or retry before selecting a code.';
  }
  const calculatedDutyFee = customsValue === null || dutyRate === null || blocked ? null : money(customsValue * dutyRate / 100);
  const calculatedVatFee = customsValue === null || calculatedDutyFee === null ? null : money((customsValue + calculatedDutyFee) * 0.15);
  if (calculatedDutyFee !== null) evidence.feeFormula = `${customsValue!.toFixed(2)} × ${dutyRate}% = ${calculatedDutyFee.toFixed(2)} (invoice currency)`;
  return { matchedHsCode, dutyRate, vatRate: 15, calculatedDutyFee, calculatedVatFee, regulatoryStatus,
    requiredCertificates: evidence.certificateRequirements ? [evidence.certificateRequirements] : [],
    confidenceScore: null, verifiedByUser: false, classificationEvidence: evidence };
}
