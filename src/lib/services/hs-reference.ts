import catalog from '@/data/hs-reference.json';
import { words, type ProductProfile } from './product-profile';

export interface ReferenceSuggestion {
  hsCode: string; description: string; page: number; endPage: number;
  source: string; url: string; sha256: string; score: number; retrievedAt: string;
}

export function searchHsReference(profile: ProductProfile, declared?: string | null): ReferenceSuggestion[] {
  const deleted = new Set(catalog.records.filter(row => row.kind === 'deleted').map(row => row.hsCode));
  const matches = catalog.records.filter(row => row.kind !== 'deleted' && !deleted.has(row.hsCode)).flatMap(row => {
    if (declared && !row.hsCode.startsWith(declared)) return [];
    const tokens = new Set(words(row.description));
    if (!tokens.size || profile.exclusions.some(term => words(term).every(word => tokens.has(word)))) return [];
    const hits = profile.concepts.filter(group => group.some(term => {
      const keys = words(term); return keys.length > 0 && keys.every(word => tokens.has(word));
    })).length;
    const score = Math.round(100 * hits / Math.max(1, profile.concepts.length));
    if (score < 50 && row.hsCode !== declared) return [];
    return [{ hsCode: row.hsCode, description: row.description.trim(), page: row.page, endPage: row.endPage,
      source: `SABER · ${catalog.filename}`, url: `${catalog.url}#page=${row.page}`, sha256: catalog.sha256, retrievedAt: catalog.retrievedAt, score }];
  }).sort((a,b) => b.score-a.score || a.hsCode.localeCompare(b.hsCode));
  return matches.filter((row,index) => matches.findIndex(other => other.hsCode === row.hsCode) === index).slice(0,10);
}
