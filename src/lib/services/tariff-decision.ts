import type { TariffDetail, TariffRow } from './zatca-client';
import { words, type ProductProfile } from './product-profile';

export function currentDuty(row: TariffRow, now = Date.now()): { detail: TariffDetail | null; rate: number | null; reason: string } {
  const active = row.TariffDetails.filter(d => Date.parse(d.EffectDate) <= now).sort((a,b) => Date.parse(b.EffectDate)-Date.parse(a.EffectDate));
  if (!active.length) return { detail: null, rate: null, reason: 'No effective duty record for the current date.' };
  const detail = active[0];
  const sameDate = active.filter(d => Date.parse(d.EffectDate) === Date.parse(detail.EffectDate));
  if (sameDate.some(d => d.DutyRate !== detail.DutyRate || d.DutyType !== detail.DutyType || d.MinimumDutyRate !== detail.MinimumDutyRate || d.ImportStatusName !== detail.ImportStatusName)) {
    return { detail: null, rate: null, reason: 'Conflicting current tariff records require review.' };
  }
  if (detail.DutyType !== 1 || detail.MinimumDutyRate !== 0 || detail.DutyRate < 0 || detail.DutyRate > 100) {
    return { detail, rate: null, reason: 'A specific, minimum or unsupported duty applies; a percentage estimate is unavailable.' };
  }
  return { detail, rate: detail.DutyRate, reason: `${detail.DutyRate}% ad valorem, effective ${detail.EffectDate.slice(0,10)}.` };
}

export type ControlStatus = 'UNKNOWN' | 'REGULATED' | 'NON_REGULATED' | 'RESTRICTED' | 'PROHIBITED';
export function zatcaControls(row: TariffRow, detail: TariffDetail | null) {
  const notes = row.Procedures?.map(p => p.ReleaseNote.trim()).filter(Boolean);
  const importStatus = detail?.ImportStatusName ?? '';
  const result = (status: ControlStatus, reason: string) => ({ status, reason, requirements: notes ?? [], confirmed: status !== 'UNKNOWN' });
  if (/ممنوع.*استيراد|import.*prohibit|prohibit.*import/i.test(importStatus)) return result('PROHIBITED', `ZATCA import status: ${importStatus}`);
  if (/مقيد|restricted/i.test(importStatus)) return result('RESTRICTED', `ZATCA import status: ${importStatus}`);
  // These labels describe listed customs controls, not SABER technical-regulation coverage.
  if (notes?.some(note => !/not required|not subject|\bno\b.*(?:permit|certificate).*required|لا يتطلب|لا يشترط|غير مطلوب/i.test(note) && /يتطلب.*(?:الاستيراد|استيراد)|يشترط.*(?:الاستيراد|استيراد)|\bimport\b.*(?:require|permit|certificate)|(?:require|permit|certificate).*\bimport\b/i.test(note))) {
    return result('REGULATED', 'ZATCA lists an import permit, conformity or other customs-control requirement.');
  }
  if (row.RestrictionStatus === 0 && notes?.length === 0 && /مسموح.*استيراد|allowed.*import|import.*allowed/i.test(importStatus)) {
    return result('NON_REGULATED', 'No controls are listed in this ZATCA record (flag 0, an explicit empty procedures list, and import permitted). This is not a SABER classification.');
  }
  return result('UNKNOWN', 'ZATCA does not provide enough consistent information to determine listed import controls.');
}

function contains(text: string, phrase: string) {
  const needle = words(phrase);
  const haystack = new Set(words(text));
  return needle.length > 0 && needle.every(word => haystack.has(word));
}
export interface RankedTariff { row: TariffRow; score: number; reasons: string[]; excluded: boolean; heading: string }
export function rankTariffs(rows: TariffRow[], profile: ProductProfile): RankedTariff[] {
  const headings = rows.filter(row => !row.TariffDetails.length);
  return rows.filter(row => row.TariffDetails.length).map(row => {
    const leaf = `${row.DescriptionEnglish} ${row.DescriptionArabic}`;
    const parentText = headings.filter(h => {
      const prefix = h.HarmonizedCode.replace(/0+$/, '');
      return prefix.length >= 4 && prefix.length < 12 && row.HarmonizedCode.startsWith(prefix);
    }).map(h=>h.DescriptionEnglish || h.DescriptionArabic).join(' / ');
    const reasons: string[] = [];
    let excluded = profile.exclusions.some(phrase => contains(leaf, phrase));
    if (excluded) reasons.push('Conflicts with the stated product function or application.');
    const conceptHits = profile.concepts.filter(alternatives => alternatives.some(phrase => contains(leaf, phrase)));
    let score = profile.concepts.length ? Math.round(conceptHits.length / profile.concepts.length * 80) : 0;
    if (conceptHits.length) reasons.push(`Matches: ${conceptHits.map(x=>x.join(' / ')).join(', ')}.`);
    if (!conceptHits.length && profile.concepts.some(alternatives=>alternatives.some(phrase=>contains(parentText,phrase)))) {
      score = 40; reasons.push('The broader tariff heading provides matching product context.');
    }
    if (profile.prefixes.some(prefix=>row.HarmonizedCode.startsWith(prefix))) { score += 5; reasons.push('Within the product search category.'); }
    if (profile.details.material && /plastic|rubber|steel|aluminium|aluminum|wood|cotton|بلاستيك|مطاط|صلب/.test(leaf.toLowerCase())) {
      if (contains(leaf, profile.details.material)) { score += 10; reasons.push('Material matches.'); }
      else { score = 0; excluded = true; reasons.push('Material does not match the supplied specification.'); }
    }
    if (profile.category === 'vehicle bumper or part' && profile.details.vehicleClass) {
      const headings = { passenger:'87.03', goods:'87.04', bus:'87.02', tractor:'87.01', special:'87.05' };
      if (leaf.includes(headings[profile.details.vehicleClass])) { score = 90; reasons.push(`Vehicle class matches ${profile.details.vehicleClass}.`); }
      else if (/87[.]0[1-5]/.test(leaf)) score = 0;
    }
    const generic = /^\W*other\b/i.test(row.DescriptionEnglish) || /^\W*parts?\W*$/i.test(row.DescriptionEnglish) || /other parts|other.*accessories/i.test(row.DescriptionEnglish);
    if (generic) { score = Math.min(score, 45); reasons.push('Residual or parts heading requires additional scope review.'); }
    if (profile.category === 'vehicle body trim' && profile.details.material &&
      /body|fender|bonnet|grille/.test(profile.details.use ?? '') &&
      /other parts and accessories of bod/i.test(row.DescriptionEnglish) &&
      profile.prefixes.some(prefix=>row.HarmonizedCode.startsWith(prefix))) {
      score = 80; reasons.push('Material and body-fitting function supplied; this is trim, not a complete panel or bonnet.');
    }
    // A blade explicitly identified as a fan part can use the parts leaf when
    // ZATCA's parent heading independently establishes fans within its scope.
    if (profile.category === 'fan part' && /fan blade/.test(profile.normalizedDescription) &&
      profile.prefixes.some(prefix=>row.HarmonizedCode.startsWith(prefix)) &&
      /^\W*parts?\W*$/i.test(row.DescriptionEnglish) && contains(parentText, 'fans')) {
      score = 85; reasons.push('Explicit fan blade within the ZATCA fan heading and its parts subheading.');
    }
    if (excluded) score = 0;
    return { row, score: Math.min(100, score), reasons, excluded: excluded || score === 0, heading: parentText };
  }).sort((a,b)=>b.score-a.score || a.row.HarmonizedCode.localeCompare(b.row.HarmonizedCode));
}

export function selectTariff(ranked: RankedTariff[], profile: ProductProfile, declared?: string | null) {
  if (declared?.length === 12) {
    const exact = ranked.find(x=>x.row.HarmonizedCode === declared);
    return exact ? { candidate: exact, method: 'DECLARED' as const, reason: 'Exact supplied code exists in the current ZATCA response. Product scope still requires review.' } : null;
  }
  if (profile.missingDetails.length) return null;
  const top = ranked[0], second = ranked[1];
  if (!top || top.excluded || top.score < 75 || (second && top.score - second.score < 15)) return null;
  return { candidate: top, method: 'SUGGESTED' as const, reason: `${top.reasons.join(' ')} This is a suggested match requiring product-scope review.` };
}
