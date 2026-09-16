import { PrismaClient } from '@prisma/client';
import { SAUDI_TARIFF_CATALOG } from '../src/lib/constants/tariff-catalog';

const prisma = new PrismaClient();

const SEED_PROFILES = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    fullName: 'Sarah Al-Ghamdi (Managing Director)',
    role: 'ADMIN' as const,
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    fullName: 'Khalid Al-Otaibi (Clearance Agent)',
    role: 'AGENT' as const,
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    fullName: 'Fahad Al-Shehri (SASO/ZATCA Auditor)',
    role: 'AUDITOR' as const,
  },
];

async function main() {
  console.log('🌱 Starting Supabase Saudi Customs Database Seeding...');

  // 1. Seed Profiles
  for (const p of SEED_PROFILES) {
    await prisma.profile.upsert({
      where: { id: p.id },
      update: {
        fullName: p.fullName,
        role: p.role,
      },
      create: {
        id: p.id,
        fullName: p.fullName,
        role: p.role,
      },
    });
  }
  console.log(`✅ Seeded ${SEED_PROFILES.length} Supabase profiles (ADMIN, AGENT, AUDITOR).`);

  // 2. Seed Saudi 12-Digit Tariff Catalog
  for (const tariff of SAUDI_TARIFF_CATALOG) {
    await prisma.saudiTariffCatalog.upsert({
      where: { hsCode: tariff.hsCode },
      update: {
        descriptionEn: tariff.descriptionEn,
        descriptionAr: tariff.descriptionAr,
        dutyRate: tariff.dutyRate,
        isRegulated: tariff.isRegulated,
        requiredRegs: tariff.requiredRegs,
      },
      create: {
        hsCode: tariff.hsCode,
        descriptionEn: tariff.descriptionEn,
        descriptionAr: tariff.descriptionAr,
        dutyRate: tariff.dutyRate,
        isRegulated: tariff.isRegulated,
        requiredRegs: tariff.requiredRegs,
      },
    });
  }
  console.log(`✅ Seeded ${SAUDI_TARIFF_CATALOG.length} official ZATCA 12-digit tariff entries into saudi_tariff_catalog.`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
