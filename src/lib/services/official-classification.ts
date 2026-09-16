export { classifyFromOfficialSources, SOURCE_URLS } from './classification-engine';
export type { SourceEvidence } from './classification-engine';
export { parseTariffResponse } from './zatca-client';
import { searchZatca } from './zatca-client';
export async function searchTariff(query: string, type: 1 | 3) { return (await searchZatca(query, type)).rows; }
