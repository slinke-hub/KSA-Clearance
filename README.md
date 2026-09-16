# Saudi Customs Clearance & Regulatory Classification Agency Platform

An enterprise-grade, production-ready web application built for a Saudi Customs Clearance Agency to automate commercial invoice ingestion, line-item parsing, and regulatory classification.

## Regulatory Compliance Engines

1. **ZATCA Integrated Customs Tariff**:
   - Official 12-digit national HS code classification (e.g., `8471.30.00.0000`, `8517.13.00.0000`, `9018.90.00.0000`).
   - Automated customs duty fee computation (`0%`, `5%`, `6.5%`, `12%`, etc.).
   - Official ZATCA 15% VAT valuation rule:
     $$\text{Taxable Base} = \text{CIF Value} + \text{Customs Duty}$$
     $$\text{VAT (15\%)} = \text{Taxable Base} \times 15\%$$

2. **Saber (saber.sa) & SASO Technical Regulations**:
   - Categorization into **Regulated** (requires PCoC / SCoC), **Non-Regulated** (self-declaration), or **Restricted**.
   - Identification of required certificates:
     - **PCoC**: Product Certificate of Conformity (annual Saber registration)
     - **SCoC**: Shipment Certificate of Conformity (per-consignment Saber clearance)

3. **Tabseer & Conformity Assessment Standards**:
   - **G-Mark**: Gulf Conformity Mark for low-voltage appliances and children's toys.
   - **IECEE**: National Recognition Certificate for smartphones, chargers, laptops, and lighting.
   - **SFDA**: Saudi Food & Drug Authority MDMA and drug sector import clearances.
   - **SASO-EE**: SASO 2874 / SASO 2870 Energy Efficiency ratings.
   - **CST**: Communications, Space & Technology Commission telecom type approvals.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript (strict mode)
- **Styling & UI**: Tailwind CSS, Lucide Icons, Shadcn UI style tokens, TanStack Table layout, Framer Motion
- **Bilingual**: English and Arabic with instantaneous `dir="ltr"` / `dir="rtl"` layout switching
- **Database & ORM**: PostgreSQL with Prisma ORM (`prisma/schema.prisma`), pgvector ready, with resilient local fallback
- **Queue & Async Jobs**: BullMQ + Redis client with automatic in-memory background worker fallback
- **Validation**: Strict Zod schemas on all API boundaries and forms
- **Security & RBAC**: `AGENT`, `ADMIN`, and `AUDITOR` roles with SHA-256 tamper checks and immutable audit logging

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Run Locally in Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Production Build
```bash
npm run build
npm start
```

---

## Environment Variables (.env)

```env
# PostgreSQL Database (Optional for local demo; uses resilient in-memory DAL if unset)
DATABASE_URL="postgresql://postgres:password@localhost:5432/ksa_clearance?schema=public"

# Redis for BullMQ Queue (Optional; uses built-in in-memory async worker if unset)
REDIS_URL="redis://localhost:6379"

# NextAuth / App Secret
NEXTAUTH_SECRET="your-secure-random-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

---

## API Endpoints

- `GET /api/invoices`: List all ingested commercial invoices.
- `POST /api/invoices`: Ingest and parse a commercial invoice (validated via Zod `invoiceUploadSchema`).
- `GET /api/invoices/[id]`: Retrieve single invoice with line items, duty, and VAT breakdown.
- `PATCH /api/invoices/[id]/line-items/[lineNumber]`: Override HS code, update verification, and record audit log.
- `POST /api/invoices/[id]/clear`: Transmit and approve consignment clearance via FASAH.
- `GET /api/audit-logs`: Retrieve tamper-evident cryptographic audit trail.
- `POST /api/classification/lookup`: Ad-hoc classification search (validated via `classificationLookupSchema`).
