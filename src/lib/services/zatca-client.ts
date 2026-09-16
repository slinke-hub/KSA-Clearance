export const ZATCA_SEARCH_URL = 'https://eservices.zatca.gov.sa/sites/sc/en/tariff/Pages/TariffPages/TariffSearch.aspx';
export interface TariffDetail {
  DutyRate: number; DutyType: number; MinimumDutyRate: number; EffectDate: string;
  ImportStatusName: string; ImportStatusID?: string;
}
export interface TariffRow {
  HarmonizedCode: string; DescriptionEnglish: string; DescriptionArabic: string;
  RestrictionStatus?: number;
  Procedures?: { Code?: number; ReleaseNote: string; ProcedureType?: number }[];
  TariffDetails: TariffDetail[];
}
export interface SearchResult { rows: TariffRow[]; query: string; type: 1 | 3; url: string; retrievedAt: string }

export function parseTariffResponse(text: string): TariffRow[] {
  const payload = JSON.parse(text);
  if (payload.Code === 404 && payload.data === null) return [];
  if (payload.Code !== 0 || !Array.isArray(payload.data)) throw new Error('Unrecognized ZATCA response');
  return payload.data.map((row: any) => {
    if (!row || !/^\d{12}$/.test(row.HarmonizedCode) ||
      (typeof row.DescriptionEnglish !== 'string' && typeof row.DescriptionArabic !== 'string') ||
      !Array.isArray(row.TariffDetails)) throw new Error('Incomplete ZATCA tariff record');
    for (const detail of row.TariffDetails) {
      if (!detail || typeof detail.DutyRate !== 'number' || !Number.isFinite(detail.DutyRate) ||
        typeof detail.DutyType !== 'number' || typeof detail.MinimumDutyRate !== 'number' ||
        typeof detail.EffectDate !== 'string' || !Number.isFinite(Date.parse(detail.EffectDate)) ||
        typeof detail.ImportStatusName !== 'string') throw new Error('Incomplete ZATCA duty record');
    }
    const validProcedures = Array.isArray(row.Procedures) && row.Procedures.every((p: any) => p && typeof p.ReleaseNote === 'string');
    return { HarmonizedCode: row.HarmonizedCode, DescriptionEnglish: row.DescriptionEnglish ?? '', DescriptionArabic: row.DescriptionArabic ?? '',
      RestrictionStatus: typeof row.RestrictionStatus === 'number' ? row.RestrictionStatus : undefined,
      Procedures: validProcedures ? row.Procedures.map((p: any) => ({ Code: p.Code, ReleaseNote: p.ReleaseNote, ProcedureType: p.ProcedureType })) : undefined,
      TariffDetails: row.TariffDetails };
  });
}

// Cache source retrieval, never product decisions or monetary results.
const cache = new Map<string, { expires: number; promise: Promise<{ text: string; retrievedAt: string }> }>();
let active = 0;
const waiting: (() => void)[] = [];
// Recover transient failures before sharing the lookup with other invoice lines.
export async function fetchZatca(url: string, headers?: Record<string, string>) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'eservices.zatca.gov.sa') throw new Error('Only ZATCA requests are allowed');
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, { headers, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(30000) });
      if ([408, 429, 500, 502, 503, 504].includes(response.status) && attempt < 2) {
        const retryAfter = Number(response.headers.get('retry-after'));
        if (retryAfter > 10) throw new Error(`ZATCA returned HTTP ${response.status}; retry later`);
        await response.body?.cancel();
        await new Promise(resolve => setTimeout(resolve, Math.max(500 * 2 ** attempt, retryAfter * 1000 || 0)));
        continue;
      }
      if (!response.ok) throw new Error(`ZATCA returned HTTP ${response.status}`);
      return response;
    } catch (error) {
      const transient = error instanceof Error && ['TimeoutError', 'AbortError', 'TypeError'].includes(error.name);
      if (!transient || attempt >= 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
}
async function request(url: string, headers?: Record<string, string>) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'eservices.zatca.gov.sa') throw new Error('Only ZATCA requests are allowed');
  const existing = cache.get(url);
  if (existing && existing.expires > Date.now()) return existing.promise;
  if (cache.size >= 300) cache.delete(cache.keys().next().value!);
  const promise = (async () => {
    if (active >= 3) await new Promise<void>(resolve => waiting.push(resolve));
    else active++;
    try {
      const response = await fetchZatca(url, headers);
      const text = await response.text();
      if (text.length > 5_000_000) throw new Error('ZATCA response too large');
      return { text, retrievedAt: new Date().toISOString() };
    } finally { const next = waiting.shift(); if (next) next(); else active--; }
  })();
  const entry = { expires: Date.now() + 300000, promise };
  cache.set(url, entry);
  // Briefly retain failures to avoid repeatedly hitting an unavailable source in large uploads.
  promise.catch(() => { entry.expires = Date.now() + 15000; });
  return promise;
}

async function clientKey() {
  const { text } = await request('https://eservices.zatca.gov.sa/sites/sc/Style%20Library/AngularAssets/ng-zatca.js');
  const key = text.match(/includes\("api\/Tariff"\)\s*\?\s*\w+\s*=\s*"([^"]+)"/)?.[1];
  if (!key) throw new Error('ZATCA public search configuration changed');
  return key;
}

export async function searchZatca(query: string, type: 1 | 3): Promise<SearchResult> {
  if (!query.trim() || query.length > 120 || (type === 3 && !/^\d{4,12}$/.test(query))) throw new Error('Invalid tariff search');
  const key = await clientKey();
  const url = `https://eservices.zatca.gov.sa/Portal/api/Tariff/GetSubHarmonizedTariffs/${type}/${encodeURIComponent(query)}`;
  const result = await request(url, { 'zatca-apikey': key });
  return { rows: parseTariffResponse(result.text), query, type, url, retrievedAt: result.retrievedAt };
}
