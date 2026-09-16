import type { classifyFromOfficialSources } from './classification-engine';

/** @deprecated The synchronous demo classifier cannot provide current ZATCA results. */
export function classifyLineItem(
  description: string, totalValue: number, declaredHsCode?: string | null, countryOfOrigin?: string,
): Awaited<ReturnType<typeof classifyFromOfficialSources>> {
  throw new Error('Legacy classification is disabled. Use the asynchronous ZATCA classification engine.');
}

export function formatHsCode(code: string): string {
  const clean = code.replace(/[^0-9]/g, '');
  if (clean.length === 12) return `${clean.slice(0, 4)}.${clean.slice(4, 6)}.${clean.slice(6, 8)}.${clean.slice(8, 12)}`;
  if (clean.length === 8) return `${clean.slice(0, 4)}.${clean.slice(4, 6)}.${clean.slice(6, 8)}`;
  return clean;
}
