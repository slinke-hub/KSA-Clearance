// Search vocabulary only: HS codes and tariff facts must come from ZATCA.
const names = [
  ['laptop', 'notebook', 'portable computer', 'حاسوب محمول'],
  ['smartphone', 'mobile phone', 'هاتف ذكي'],
  ['headlamp', 'headlight', 'مصباح أمامي'],
  ['bumper', 'مصد'],
  ['radiator', 'مبرد'],
  ['brake pad', 'brake lining', 'بطانة فرامل'],
  ['ball bearing', 'محمل كروي'],
  ['air filter', 'مرشح هواء'],
  ['oil filter', 'مرشح زيت'],
  ['spark plug', 'شمعة إشعال'],
  ['bonnet', 'hood'],
] as const;

function includesName(text: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}])${escaped}(?:s)?(?![\\p{L}])`, 'iu').test(text);
}

export function productNames(text: string): string[][] {
  return names.filter(group => group.some(name => includesName(text, name))).map(group => [...group]);
}

export function productSearchTerms(text: string): string[] {
  const clean = text.replace(/\b(?:lh|rh|left|right|front|rear|assembly|assy|oem|pcs|set)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim();
  const groups = productNames(clean);
  // Preserve real words for the search API; stemming is for ranking only.
  const phrase = clean.split(' ').slice(0, 6).join(' ');
  return [...new Set([phrase, ...groups.flat(), ...clean.split(' ').filter(word => word.length > 3)])]
    .filter(Boolean).slice(0, 4);
}
