import type { ProductDetails } from './product-profile';

// Product vocabulary only: no tariff codes, rates or regulatory determinations.
// Manufacturer descriptions establish the vehicle types; abbreviated invoice
// aliases remain an inference, exposed separately from user-supplied details.
const families = [
  { pattern: /\bC\/?X[- /]?(?:3|5|7|9|30|50|60|70|80|90)\b/gi,
    name: 'Mazda CX SUV', vehicleClass: 'passenger' as const,
    reference: 'https://newsroom.mazda.com/en/publicity/release/2021/202110/211007a.html' },
  { pattern: /\bD(?:[- /]?MAX|\/MX)\b/gi,
    name: 'Isuzu D-MAX pickup', vehicleClass: 'goods' as const,
    reference: 'https://www.isuzu.co.jp/world/product/p_car/d-max/' },
];

export interface ProductIdentity {
  details: ProductDetails;
  inferences: { text: string; reference: string }[];
  conflict: boolean;
}

export function recognizeProduct(description: string, supplied: ProductDetails): ProductIdentity {
  const result: ProductIdentity = { details: { ...supplied }, inferences: [], conflict: false };
  // Never interpret a SKU, OEM number, or an unrelated appliance as a vehicle.
  const text = description.replace(/\[(?:Item|Unit):[^\]]*\]/gi, ' ').replace(/\([^)]*\)/g, ' ');
  if (!/\b(?:bumper|fender|grille|hood|bonnet|lamp|apron|mud|fan|towing|engine)\b/i.test(text) ||
    /\b(?:computer|furniture|cabinet|bicycle|motorcycle|not for|not suitable|except)\b/i.test(text)) return result;
  const hits = families.flatMap(family => [...text.matchAll(family.pattern)].map(match => ({ family, token: match[0] })));
  const classes = new Set(hits.map(hit => hit.family.vehicleClass));
  if (classes.size > 1) { result.conflict = true; return result; }
  if (!hits.length) return result;
  const { family, token } = hits[0];
  // An explicit correction always wins over recognition.
  if (!supplied.vehicleClass) result.details.vehicleClass = family.vehicleClass;
  if (!supplied.use) result.details.use = 'motor vehicle replacement part';
  result.inferences.push({ text: `Invoice model ${token} interpreted as ${family.name}; check vehicle fitment.`, reference: family.reference });
  return result;
}
