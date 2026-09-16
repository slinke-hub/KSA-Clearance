export interface SaudiTariffEntry {
  hsCode: string; // 12-digit official ZATCA Integrated Tariff code
  descriptionEn: string;
  descriptionAr: string;
  dutyRate: number; // percentage, e.g. 5.00
  isRegulated: boolean;
  regulatoryStatus: 'REGULATED' | 'NON_REGULATED' | 'RESTRICTED' | 'PROHIBITED';
  requiredRegs: string[]; // SASO Technical Regulations
  requiredCertificates: string[]; // ["PCoC", "SCoC", "G-Mark", "IECEE", "SFDA", "SASO-EE", "CST"]
  keywordsEn: string[];
  keywordsAr: string[];
}

export const SAUDI_TARIFF_CATALOG: SaudiTariffEntry[] = [
  {
    hsCode: "847130000000",
    descriptionEn: "Portable automatic data processing machines, weighing not more than 10 kg (Laptops, Notebooks, Tablets)",
    descriptionAr: "آلات معالجة بيانات رقمية محمولة لا يزيد وزنها عن 10 كغ (حواسيب محمولة، أجهزة لوحية)",
    dutyRate: 0.00,
    isRegulated: true,
    regulatoryStatus: "REGULATED",
    requiredRegs: ["SASO Technical Regulation for Telecommunication Devices", "SASO RoHS"],
    requiredCertificates: ["PCoC", "SCoC", "IECEE", "CST"],
    keywordsEn: ["laptop", "notebook", "tablet", "portable computer", "macbook", "thinkpad"],
    keywordsAr: ["لابتوب", "حاسوب محمول", "جهاز لوحي", "كمبيوتر محمول"]
  },
  {
    hsCode: "851713000000",
    descriptionEn: "Smartphones and cellular network telephones for wireless transmission",
    descriptionAr: "هواتف ذكية وهواتف أخرى للشبكات الخلوية للاتصال اللاسلكي",
    dutyRate: 0.00,
    isRegulated: true,
    regulatoryStatus: "REGULATED",
    requiredRegs: ["SASO Technical Regulation for Telecommunication Devices", "SASO RoHS"],
    requiredCertificates: ["PCoC", "SCoC", "IECEE", "CST"],
    keywordsEn: ["smartphone", "phone", "iphone", "samsung galaxy", "mobile phone", "cellular"],
    keywordsAr: ["هاتف ذكي", "جوال", "موبايل", "هاتف خلوي"]
  },
  {
    hsCode: "852852000000",
    descriptionEn: "Monitors capable of directly connecting to and designed for use with an automatic data processing machine",
    descriptionAr: "شاشات عرض قادرة على الاتصال مباشرة ومصممة للاستخدام مع آلات المعالجة الآلية للبيانات",
    dutyRate: 5.00,
    isRegulated: true,
    regulatoryStatus: "REGULATED",
    requiredRegs: ["SASO Technical Regulation for Low-Voltage Electrical Equipment", "SASO RoHS"],
    requiredCertificates: ["PCoC", "SCoC", "IECEE"],
    keywordsEn: ["monitor", "display", "led screen", "computer display", "lcd monitor"],
    keywordsAr: ["شاشة عرض", "شاشة كمبيوتر", "مونيتور"]
  },
  {
    hsCode: "841510000000",
    descriptionEn: "Air conditioning machines, window or wall types, self-contained or split-system",
    descriptionAr: "آلات تكييف هواء، من الأنواع المصممة لتثبت في نافذة أو جدار، بنظام وحدة واحدة أو مجزأة (سبليت)",
    dutyRate: 5.00,
    isRegulated: true,
    regulatoryStatus: "REGULATED",
    requiredRegs: ["SASO Technical Regulation for Low-Voltage Electrical Equipment", "SASO 2874 Energy Efficiency"],
    requiredCertificates: ["PCoC", "SCoC", "G-Mark", "SASO-EE"],
    keywordsEn: ["air conditioner", "ac unit", "split ac", "hvac", "cooling unit", "chiller"],
    keywordsAr: ["مكيف هواء", "سبليت", "تكييف", "وحدة تبريد"]
  },
  {
    hsCode: "841821000000",
    descriptionEn: "Household refrigerators, compression-type",
    descriptionAr: "ثلاجات منزلية، تعمل بنظام الضغط",
    dutyRate: 5.00,
    isRegulated: true,
    regulatoryStatus: "REGULATED",
    requiredRegs: ["SASO Low Voltage Equipment TR", "SASO 2892 Energy Efficiency"],
    requiredCertificates: ["PCoC", "SCoC", "G-Mark", "SASO-EE"],
    keywordsEn: ["refrigerator", "fridge", "freezer", "household cooler"],
    keywordsAr: ["ثلاجة", "فريزر", "براد"]
  },
  {
    hsCode: "850440900000",
    descriptionEn: "Static converters (Power supplies, Inverters, Rectifiers, Battery chargers)",
    descriptionAr: "محولات كهربائية استاتيكية (شواحن بطاريات، مقومات، محولات طاقة)",
    dutyRate: 5.00,
    isRegulated: true,
    regulatoryStatus: "REGULATED",
    requiredRegs: ["SASO Technical Regulation for Low-Voltage Electrical Equipment", "SASO RoHS"],
    requiredCertificates: ["PCoC", "SCoC", "IECEE"],
    keywordsEn: ["power supply", "charger", "inverter", "ac adapter", "rectifier"],
    keywordsAr: ["شاحن", "محول طاقة", "انفرتر", "شاحن بطارية"]
  },
  {
    hsCode: "901890000000",
    descriptionEn: "Instruments and appliances used in medical, surgical or veterinary sciences (Diagnostic Monitors, Electro-medical apparatus)",
    descriptionAr: "أدوات وأجهزة مستعملة في العلوم الطبية أو الجراحية أو البيطرية (أجهزة تشخيص طبي)",
    dutyRate: 0.00,
    isRegulated: true,
    regulatoryStatus: "RESTRICTED",
    requiredRegs: ["SFDA Medical Devices Interim Regulation (MDMA)", "SASO Technical Regulations"],
    requiredCertificates: ["SFDA", "SCoC"],
    keywordsEn: ["medical device", "patient monitor", "surgical instrument", "diagnostic ultrasound", "ecg", "defibrillator"],
    keywordsAr: ["جهاز طبي", "مراقبة مرضى", "جهاز تخطيط قلب", "معدات طبية", "تشخيص طبي"]
  },
  {
    hsCode: "401511000000",
    descriptionEn: "Surgical gloves of vulcanised rubber other than hard rubber",
    descriptionAr: "قفازات جراحية من مطاط مبركن غير صلب",
    dutyRate: 5.00,
    isRegulated: true,
    regulatoryStatus: "REGULATED",
    requiredRegs: ["SFDA Medical Devices Regulations", "SASO Technical Regulations"],
    requiredCertificates: ["SFDA", "SCoC"],
    keywordsEn: ["surgical gloves", "medical gloves", "latex gloves", "nitrile gloves"],
    keywordsAr: ["قفازات جراحية", "قفازات طبية", "قفازات لاتكس"]
  },
  {
    hsCode: "870829900000",
    descriptionEn: "Parts and accessories of motor vehicle bodies, other (Bumpers, Panels, Filters)",
    descriptionAr: "أجزاء ولوازم أخرى لأبدان سيارات الركاب والشاحنات",
    dutyRate: 5.00,
    isRegulated: true,
    regulatoryStatus: "REGULATED",
    requiredRegs: ["SASO Technical Regulation for Auto Spare Parts"],
    requiredCertificates: ["PCoC", "SCoC"],
    keywordsEn: ["brake pads", "oil filter", "shock absorber", "auto spare part", "bumper", "clutch"],
    keywordsAr: ["قطع غيار سيارات", "فحمات فرامل", "فلتر زيت", "مساعدات", "صدام"]
  },
  {
    hsCode: "848180000000",
    descriptionEn: "Taps, cocks, valves and similar appliances for pipes, boiler shells, tanks or vats (Industrial Control Valves)",
    descriptionAr: "حنفيات وصمامات وأجهزة مماثلة للأنابيب أو المراجل أو الخزانات (صمامات صناعية)",
    dutyRate: 5.00,
    isRegulated: true,
    regulatoryStatus: "REGULATED",
    requiredRegs: ["SASO Technical Regulation for Machinery Safety", "SASO Pressure Equipment"],
    requiredCertificates: ["PCoC", "SCoC"],
    keywordsEn: ["valve", "industrial valve", "ball valve", "gate valve", "solenoid valve", "pneumatic valve"],
    keywordsAr: ["صمام", "محبس", "صمام صناعي", "فالف"]
  },
  {
    hsCode: "841370000000",
    descriptionEn: "Centrifugal pumps, other than submersible or fuel dispensing",
    descriptionAr: "مضخات طرد مركزي أخرى غير غاطسة",
    dutyRate: 5.00,
    isRegulated: true,
    regulatoryStatus: "REGULATED",
    requiredRegs: ["SASO Technical Regulation for Machinery Safety"],
    requiredCertificates: ["PCoC", "SCoC"],
    keywordsEn: ["centrifugal pump", "water pump", "industrial pump", "slurry pump"],
    keywordsAr: ["مضخة طرد مركزي", "مضخة مياه", "مضخة صناعية"]
  },
  {
    hsCode: "392690000000",
    descriptionEn: "Other articles of plastics and articles of other materials of headings 39.01 to 39.14 (Gaskets, Washers, Plastic Enclosures)",
    descriptionAr: "مصنوعات أخرى من لدائن (بلاستيك)، أختام، حشوات، وأغلفة بلاستيكية",
    dutyRate: 6.50,
    isRegulated: false,
    regulatoryStatus: "NON_REGULATED",
    requiredRegs: ["SASO General Product Safety Directive"],
    requiredCertificates: ["SCoC"],
    keywordsEn: ["plastic enclosure", "plastic gasket", "nylon spacer", "pvc fitting", "plastic part"],
    keywordsAr: ["قطع بلاستيكية", "عازل بلاستيك", "حشوة بلاستيك", "لدائن"]
  },
  {
    hsCode: "731815000000",
    descriptionEn: "Other screws and bolts, whether or not with their nuts or washers, of iron or steel",
    descriptionAr: "براغي ومسامير لولبية أخرى، وإن كانت بعزقاتها أو ورداتها، من حديد أو صلب",
    dutyRate: 5.00,
    isRegulated: true,
    regulatoryStatus: "REGULATED",
    requiredRegs: ["SASO Technical Regulation for Building Materials - Fasteners"],
    requiredCertificates: ["PCoC", "SCoC"],
    keywordsEn: ["screw", "bolt", "hex bolt", "stainless steel screw", "fastener", "rivet"],
    keywordsAr: ["برغي", "مسمار", "براغي صلب", "مسامير ملولبة"]
  },
  {
    hsCode: "300490000000",
    descriptionEn: "Medicaments consisting of mixed or unmixed products for therapeutic or prophylactic uses, in measured doses",
    descriptionAr: "أدوية تتكون من منتجات مخلوطة أو غير مخلوطة لأغراض علاجية أو وقائية، محضرة في جرعات",
    dutyRate: 0.00,
    isRegulated: true,
    regulatoryStatus: "RESTRICTED",
    requiredRegs: ["SFDA Drug Sector Registration & Import Clearance"],
    requiredCertificates: ["SFDA", "SCoC"],
    keywordsEn: ["medicament", "pharmaceutical", "antibiotic", "tablet medicine", "injection", "paracetamol"],
    keywordsAr: ["دواء", "أدوية بشرية", "علاج", "مستحضرات صيدلانية"]
  },
  {
    hsCode: "150920000000",
    descriptionEn: "Extra virgin olive oil and its fractions, not chemically modified",
    descriptionAr: "زيت زيتون بكر ممتاز وجزيئاته، غير معدل كيميائياً",
    dutyRate: 5.00,
    isRegulated: true,
    regulatoryStatus: "REGULATED",
    requiredRegs: ["SFDA Food Safety Regulations", "SASO Technical Regulations for Edible Oils"],
    requiredCertificates: ["SFDA", "SCoC"],
    keywordsEn: ["olive oil", "extra virgin olive oil", "edible oil", "cooking oil"],
    keywordsAr: ["زيت زيتون", "زيت بكر ممتاز", "زيوت غذائية"]
  },
  {
    hsCode: "950300000000",
    descriptionEn: "Tricycles, scooters, pedal cars and similar wheeled toys; dolls' carriages; dolls; other toys",
    descriptionAr: "دراجات ثلاثية العجلات، سكوتر، سيارات بدالات ولعب أطفال مماثلة ذات عجلات؛ دمى ولعب أطفال أخرى",
    dutyRate: 5.00,
    isRegulated: true,
    regulatoryStatus: "REGULATED",
    requiredRegs: ["Gulf Technical Regulation on Children's Toys (BD-131704-01)"],
    requiredCertificates: ["G-Mark", "PCoC", "SCoC"],
    keywordsEn: ["toy", "children toy", "doll", "puzzle", "action figure", "educational toy"],
    keywordsAr: ["لعبة أطفال", "ألعاب أطفال", "دمية", "لعبة بلاستيكية"]
  }
];

export const CERTIFICATE_DEFINITIONS: Record<string, {
  code: string;
  nameEn: string;
  nameAr: string;
  issuer: string;
  descriptionEn: string;
  descriptionAr: string;
  badgeColor: string;
}> = {
  "PCoC": {
    code: "PCoC",
    nameEn: "Product Certificate of Conformity",
    nameAr: "شهادة مطابقة المنتج",
    issuer: "Saber / SASO Approved Conformity Body",
    descriptionEn: "Mandatory annual certification registered on Saber platform before shipping regulated goods to Saudi Arabia.",
    descriptionAr: "شهادة سنوية إلزامية تسجل عبر منصة سابر قبل شحن البضائع الخاضعة للوائح الفنية إلى المملكة.",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300"
  },
  "SCoC": {
    code: "SCoC",
    nameEn: "Shipment Certificate of Conformity",
    nameAr: "شهادة مطابقة الإرسالية",
    issuer: "Saber (saber.sa)",
    descriptionEn: "Mandatory per-consignment customs clearance certificate issued via Saber based on valid commercial invoice.",
    descriptionAr: "شهادة مطابقة صادرة لكل شحنة إرسالية عبر منصة سابر استناداً إلى الفاتورة التجارية.",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300"
  },
  "G-Mark": {
    code: "G-Mark",
    nameEn: "Gulf Conformity Mark",
    nameAr: "شارة المطابقة الخليجية",
    issuer: "GSO / Tabseer / Notified Bodies",
    descriptionEn: "Mandatory Gulf conformity symbol for low-voltage electrical appliances and children's toys entering GCC markets.",
    descriptionAr: "شارة المطابقة الخليجية الإلزامية للأجهزة الكهربائية منخفضة الجهد ولعب الأطفال.",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300"
  },
  "IECEE": {
    code: "IECEE",
    nameEn: "National Recognition Certificate (IECEE)",
    nameAr: "شهادة الاعتراف الوطنية (IECEE)",
    issuer: "SASO",
    descriptionEn: "Required for mobile phones, chargers, laptops, tablets, lighting fixtures, and power banks.",
    descriptionAr: "إلزامية للهواتف النقالة، الشواحن، الحواسيب المحمولة، الإضاءة، وبنوك الطاقة.",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300"
  },
  "SFDA": {
    code: "SFDA",
    nameEn: "SFDA Clearance & MDMA Approval",
    nameAr: "موافقة وترخيص هيئة الغذاء والدواء",
    issuer: "Saudi Food and Drug Authority (SFDA)",
    descriptionEn: "Required for food, pharmaceuticals, cosmetics, medical devices and surgical consumables.",
    descriptionAr: "مطلوبة للأغذية، الأدوية، مستحضرات التجميل، والأجهزة والمستلزمات الطبية.",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300"
  },
  "SASO-EE": {
    code: "SASO-EE",
    nameEn: "SASO Energy Efficiency Label",
    nameAr: "بطاقة كفاءة الطاقة (SASO)",
    issuer: "SASO / SEEC",
    descriptionEn: "Mandatory energy efficiency rating for air conditioners, refrigerators, washing machines, and electric motors.",
    descriptionAr: "ملصق كفاءة الطاقة الإلزامي للمكيفات، الثلاجات، الغسالات، والمحركات الكهربائية.",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/30 dark:text-teal-300"
  },
  "CST": {
    code: "CST",
    nameEn: "CST Telecommunications Type Approval",
    nameAr: "اعتماد نوعي لهيئة الاتصالات والفضاء والتقنية",
    issuer: "CST Saudi Arabia",
    descriptionEn: "Mandatory equipment type approval for devices utilizing radio spectrum, Wi-Fi, 4G/5G, or Bluetooth.",
    descriptionAr: "اعتماد نوعي إلزامي للأجهزة التي تستخدم الترددات اللاسلكية أو شبكات الجيل الرابع والخامس.",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-300"
  }
};
