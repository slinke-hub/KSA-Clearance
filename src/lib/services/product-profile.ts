import { recognizeProduct } from './product-identity';
import { productNames, productSearchTerms } from './product-vocabulary';

export interface ProductDetails {
  material?: string;
  use?: string;
  vehicleClass?: 'passenger' | 'goods' | 'bus' | 'tractor' | 'special';
}
export interface ProductProfile {
  normalizedDescription: string;
  category: string;
  prefixes: string[];
  searchTerms: string[];
  concepts: string[][];
  exclusions: string[];
  missingDetails: string[];
  details: ProductDetails;
  inferences: { text: string; reference: string }[];
}

const stop = new Set(['the','and','for','with','other','item','unit','pcs','sets','new','replacement','part','parts','of','to','in','or']);
export function words(text: string): string[] {
  return [...new Set((text.toLowerCase().match(/[\p{L}]+/gu) ?? []).map(word => word.replace(/ies$/, 'y').replace(/s$/, ''))
    .filter(word => word.length > 2 && !stop.has(word)))];
}
export function normalizeProduct(description: string) {
  return description.normalize('NFKC')
    .replace(/\[(?:Item|Unit):[^\]]*\]/gi, ' ').replace(/\([^)]*\d[^)]*\)/g, ' ')
    .replace(/\bH\.?\s*LAMP\b/gi, 'headlamp').replace(/\bR\.?\s*LAMP\b/gi, 'rear lamp')
    .replace(/\bC\.?\s*LAMP\b/gi, 'corner lamp').replace(/\bF\.?\s*(?=BUMPER|FENDER|SIDE|MUD|APRON|LAMP)/gi, 'front ')
    .replace(/\bR\.?\s*(?=BUMPER|MUD)/gi, 'rear ').replace(/\bMLDG\b/gi, 'moulding')
    .replace(/\bASS['’]?Y\b/gi, 'assembly').replace(/\bW\/MOTOR\b/gi, 'with motor')
    .replace(/\bENG\./gi, 'engine')
    .replace(/\bFAN LEAF\b/gi, 'fan blade').replace(/\bFOOT STEP\b/gi, 'running board')
    .replace(/\bMUD FLAP\b/gi, 'mudguard').replace(/\bHOOD\b/gi, 'bonnet')
    .replace(/\b[A-Z0-9/-]*\d[A-Z0-9/.-]*\b/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function buildProductProfile(description: string, supplied: ProductDetails = {}): ProductProfile {
  const explicit = `${description} ${supplied.use ?? ''}`.toLowerCase();
  const stated: ProductDetails = { ...supplied,
    material: supplied.material || explicit.match(/\b(?:steel|rubber|plastic|aluminium|aluminum|wood|cotton)\b/)?.[0],
    vehicleClass: supplied.vehicleClass ?? (/passenger car|\bsuv\b/.test(explicit) ? 'passenger' : /goods vehicle|\bpickup\b/.test(explicit) ? 'goods' : undefined),
  };
  const identity = recognizeProduct(description, stated);
  const details = identity.details;
  const text = normalizeProduct(description + ' ' + (details.use ?? ''));
  const profile: ProductProfile = { normalizedDescription: text, category: 'general', prefixes: [], searchTerms: [],
    concepts: [], exclusions: [], missingDetails: [], details, inferences: identity.inferences };
  const set = (category: string, prefixes: string[], concepts: string[][], exclusions: string[] = [], missing: string[] = []) => {
    Object.assign(profile, { category, prefixes, concepts, exclusions, missingDetails: missing });
  };
  // Vocabulary supplies search categories, never a national leaf code, rate or regulation.
  if (/headlamp|headlight|مصباح أمامي|مصابيح أمامية/.test(text) && /hiking|camping|head.?mounted|helmet/.test(text)) set('portable headlamp', ['851310'], [['portable','lamp']], ['automotive','motorcycle']);
  else if (/headlamp|headlight/.test(text) && /motorcycle/.test(text)) set('motorcycle headlamp', ['851220'], [['motorcycle lighting','إنارة للدراجات النارية']], ['automotive','للسيارات']);
  else if (/headlamp|headlight|مصباح أمامي|مصابيح أمامية/.test(text)) set('vehicle headlamp', ['851220'], [['automotive lighting', 'إنارة للسيارات']], ['motorcycle','داخل السيارات','signal','إشارة']);
  else if (/turn signal|indicator lamp|brake light|stop lamp|side lamp|corner lamp/.test(text)) set('vehicle signal lamp', ['851220'], [['visual signal','video signal','إشارة مرئية للسيارات']], ['motorcycle','triangle']);
  else if (/rear lamp|front lamp/.test(text)) set('vehicle lamp', ['851220'], [['automotive lighting','signal device','إنارة للسيارات','إشارة مرئية للسيارات']], ['motorcycle'], ['Specify the lamp function (lighting, signalling/braking, or combined assembly).']);
  else if (/reflector/.test(text)) set('reflector', [], [['reflector','عاكس']], ['aerial','antenna','surgical'], ['Specify material and whether the reflector is optical, electrical or a passive body fitting.']);
  else if (/bumper/.test(text)) set('vehicle bumper or part', ['870810'], [['bumper','مصد']], [], details.vehicleClass ? [] : ['Specify the vehicle class: passenger car/SUV, goods vehicle, bus, tractor or special-purpose vehicle.']);
  else if (/fan.*(?:blade|shroud)/.test(text)) set('fan part', ['841490'], [['fan','مراوح'],['part','blade','جزء','أجزاء']], [], /blade/.test(text) || details.use ? [] : ['Confirm the shroud is a dedicated fan part and describe its application.']);
  else if (/\bfan\b|مروحة/.test(text)) set('fan', ['841459'], [['fan','مراوح']], ['nuclear'], /vehicle|car|automotive|مركب|سيار/.test(text+' '+details.use) ? [] : ['Specify whether the fan is for a vehicle, machinery, or a room.']);
  else if (/mudguard|running board/.test(text)) set('vehicle mudguard or step', ['870829'], [['running board','mudguard','واقيات الأوحال','درج']], [], /mudguard/.test(text) && !details.material ? ['Confirm material and that this is a vehicle mudguard rather than a general rubber/plastic sheet.'] : []);
  else if (/moulding|grille|towing cover|lower engine cover/.test(text)) set('vehicle body trim', ['870829'], [['body','أبدان']], [], details.material && details.use ? [] : ['Confirm material and body-fitting function; trim must not be classified as a complete bonnet or fender.']);
  else if (/apron|fender|side panel/.test(text)) set('vehicle body panel', ['870829'], [['panel','fender','الجوانب','الرفارف','واجهات']], [], /apron/.test(text) && !/structural|body panel/.test(text) ? ['Confirm whether the apron is a structural body panel or bumper trim.'] : []);
  else if (/tank/.test(text)) set('tank or reservoir', [], [['tank','reservoir','خزان']], ['lorry','lorrie','ship','trailer'], details.material && details.use ? [] : ['Specify the tank material, contents and function (air intake, fuel, washer fluid, coolant, etc.).']);
  else if (/laptop|notebook|حاسوب محمول|لابتوب/.test(text)) set('laptop', ['847130'], [['laptop','notebook','حاسوب محمول']], ['tablet']);
  else if (/tablet|جهاز لوحي/.test(text)) set('tablet', ['847130'], [['tablet','لوحي']], ['laptop']);
  else if (/smartphone|mobile phone|هاتف ذكي|جوال/.test(text)) set('smartphone', ['851713'], [['smartphone','هاتف ذكي']]);
  if (/^vehicle (?:body|mudguard|bumper)/.test(profile.category) && /computer|furniture|cabinet|bicycle/.test(text)) {
    set('general', [], words(text).slice(0,6).map(word=>[word]));
  }
  if (!profile.concepts.length) {
    const names = productNames(text);
    profile.concepts = names.length ? names : words(text).slice(0, 6).map(word => [word]);
  }
  if (profile.category === 'fan' && /vehicle|car|automotive|مركب|سيار/.test(text+' '+details.use)) {
    profile.concepts.push(['vehicle','مركبات']); profile.exclusions.push('table','wall','ceiling','ground');
  }
  if (identity.conflict && !stated.vehicleClass) profile.missingDetails.push('The description names different vehicle classes; specify the intended vehicle class.');
  profile.searchTerms = productSearchTerms(text);
  return profile;
}
