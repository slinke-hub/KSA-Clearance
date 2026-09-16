import { SAUDI_TARIFF_CATALOG } from '../constants/tariff-catalog';
import { classifyLineItem } from '../services/classifier';
import { UserEntity, LineItemEntity, InvoiceEntity, AuditLogEntity } from '@/types/invoice';

export type { UserEntity, LineItemEntity, InvoiceEntity, AuditLogEntity };

// Initial Mock Users
export const SYSTEM_USERS: UserEntity[] = [
  {
    id: 'user-agent-01',
    email: 'khalid.clearance@zatca-agency.sa',
    name: 'Khalid Al-Otaibi (Clearance Agent)',
    role: 'AGENT',
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-01-10'),
  },
  {
    id: 'user-admin-01',
    email: 'admin.customs@zatca-agency.sa',
    name: 'Sarah Al-Ghamdi (Managing Director)',
    role: 'ADMIN',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'user-auditor-01',
    email: 'auditor.compliance@zatca-agency.sa',
    name: 'Fahad Al-Shehri (SASO/ZATCA Auditor)',
    role: 'AUDITOR',
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
  },
];

// Initial In-Memory Seed Data
function createInitialInvoices(): InvoiceEntity[] {
  const inv1ItemsRaw = [
    {
      lineNumber: 1,
      description: "Lenovo ThinkPad X1 Carbon Gen 12 Laptop Core Ultra 7 32GB RAM",
      quantity: 50,
      unitValue: 6200.00,
      totalValue: 310000.00,
      countryOfOrigin: "CN",
      declaredHsCode: "8471.30.00",
    },
    {
      lineNumber: 2,
      description: "Apple iPhone 16 Pro Max 256GB Desert Titanium (5G Wireless Phone)",
      quantity: 100,
      unitValue: 4500.00,
      totalValue: 450000.00,
      countryOfOrigin: "CN",
      declaredHsCode: "8517.13.00",
    },
    {
      lineNumber: 3,
      description: "Samsung 32-inch 4K UHD LED Computer Displays for IT Workstations",
      quantity: 80,
      unitValue: 1250.00,
      totalValue: 100000.00,
      countryOfOrigin: "CN",
      declaredHsCode: "8528.52.00",
    },
    {
      lineNumber: 4,
      description: "Heavy Duty Molded Plastic Cable Trays and Gaskets Headings 3926",
      quantity: 200,
      unitValue: 45.00,
      totalValue: 9000.00,
      countryOfOrigin: "CN",
      declaredHsCode: "3926.90.00",
    }
  ];

  const inv1Items: LineItemEntity[] = inv1ItemsRaw.map((raw) => {
    const classification = classifyLineItem(raw.description, raw.totalValue, raw.declaredHsCode, raw.countryOfOrigin);
    return {
      id: `item-${raw.lineNumber}-inv1`,
      invoiceId: 'inv-sa-2026-001',
      lineNumber: raw.lineNumber,
      description: raw.description,
      quantity: raw.quantity,
      unitValue: raw.unitValue,
      totalValue: raw.totalValue,
      countryOfOrigin: raw.countryOfOrigin,
      declaredHsCode: raw.declaredHsCode,
      matchedHsCode: classification.matchedHsCode,
      dutyRate: classification.dutyRate,
      vatRate: classification.vatRate,
      calculatedDutyFee: classification.calculatedDutyFee,
      calculatedVatFee: classification.calculatedVatFee,
      regulatoryStatus: classification.regulatoryStatus,
      requiredCertificates: classification.requiredCertificates,
      confidenceScore: classification.confidenceScore,
      verifiedByUser: true,
      createdAt: new Date('2026-09-10T08:30:00Z'),
      updatedAt: new Date('2026-09-10T09:15:00Z'),
    };
  });

  const totalAmount1 = inv1Items.reduce((sum, item) => sum + item.totalValue, 0);

  const inv1: InvoiceEntity = {
    id: 'inv-sa-2026-001',
    invoiceNumber: 'INV-SZ-2026-8891',
    exporterName: 'Shenzhen Apex Digital Technologies Co., Ltd',
    importerName: 'Al-Madar Advanced Technology Trading Est. (Riyadh, KSA)',
    currency: 'SAR',
    totalAmount: totalAmount1,
    storagePath: 'invoices/2026/INV-SZ-2026-8891.pdf',
    fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'VERIFIED',
    createdById: 'user-agent-01',
    createdBy: SYSTEM_USERS[0],
    lineItems: inv1Items,
    createdAt: new Date('2026-09-10T08:30:00Z'),
    updatedAt: new Date('2026-09-10T09:15:00Z'),
  };

  const inv2ItemsRaw = [
    {
      lineNumber: 1,
      description: "Industrial Multi-Stage Centrifugal Water Pumps 45kW Cast Iron",
      quantity: 6,
      unitValue: 28500.00,
      totalValue: 171000.00,
      countryOfOrigin: "DE",
      declaredHsCode: "8413.70.00",
    },
    {
      lineNumber: 2,
      description: "High Pressure Flanged Gate and Globe Control Valves Class 600",
      quantity: 40,
      unitValue: 3400.00,
      totalValue: 136000.00,
      countryOfOrigin: "DE",
      declaredHsCode: "8481.80.00",
    },
    {
      lineNumber: 3,
      description: "High Tensile Steel Hex Bolts and Washers M24 DIN 933",
      quantity: 1200,
      unitValue: 18.50,
      totalValue: 22200.00,
      countryOfOrigin: "DE",
      declaredHsCode: "7318.15.00",
    }
  ];

  const inv2Items: LineItemEntity[] = inv2ItemsRaw.map((raw) => {
    const classification = classifyLineItem(raw.description, raw.totalValue, raw.declaredHsCode, raw.countryOfOrigin);
    return {
      id: `item-${raw.lineNumber}-inv2`,
      invoiceId: 'inv-sa-2026-002',
      lineNumber: raw.lineNumber,
      description: raw.description,
      quantity: raw.quantity,
      unitValue: raw.unitValue,
      totalValue: raw.totalValue,
      countryOfOrigin: raw.countryOfOrigin,
      declaredHsCode: raw.declaredHsCode,
      matchedHsCode: classification.matchedHsCode,
      dutyRate: classification.dutyRate,
      vatRate: classification.vatRate,
      calculatedDutyFee: classification.calculatedDutyFee,
      calculatedVatFee: classification.calculatedVatFee,
      regulatoryStatus: classification.regulatoryStatus,
      requiredCertificates: classification.requiredCertificates,
      confidenceScore: classification.confidenceScore,
      verifiedByUser: false,
      createdAt: new Date('2026-09-12T11:00:00Z'),
      updatedAt: new Date('2026-09-12T11:00:00Z'),
    };
  });

  const totalAmount2 = inv2Items.reduce((sum, item) => sum + item.totalValue, 0);

  const inv2: InvoiceEntity = {
    id: 'inv-sa-2026-002',
    invoiceNumber: 'INV-MUN-2026-4412',
    exporterName: 'Bavaria Industrietechnik Maschinenbau GmbH',
    importerName: 'Saudi Aramco Base Oil Company (Luberef), Yanbu',
    currency: 'SAR',
    totalAmount: totalAmount2,
    storagePath: 'invoices/2026/INV-MUN-2026-4412.xlsx',
    fileHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    status: 'PROCESSING',
    createdById: 'user-agent-01',
    createdBy: SYSTEM_USERS[0],
    lineItems: inv2Items,
    createdAt: new Date('2026-09-12T11:00:00Z'),
    updatedAt: new Date('2026-09-12T11:00:00Z'),
  };

  return [inv1, inv2];
}

class InvoiceMemoryStore {
  private invoices: Map<string, InvoiceEntity> = new Map();
  private auditLogs: AuditLogEntity[] = [];

  constructor() {
    const initial = createInitialInvoices();
    for (const inv of initial) {
      this.invoices.set(inv.id, inv);
    }

    // Initial audit log
    this.auditLogs.push({
      id: 'audit-001',
      userId: 'user-agent-01',
      action: 'INVOICE_UPLOADED',
      entityType: 'Invoice',
      entityId: 'inv-sa-2026-001',
      details: {
        invoiceNumber: 'INV-SZ-2026-8891',
        lineItemsCount: 4,
        totalAmount: 869000.00,
      },
      ipAddress: '197.24.120.45',
      timestamp: new Date('2026-09-10T08:30:00Z'),
    });

    this.auditLogs.push({
      id: 'audit-002',
      userId: 'user-agent-01',
      action: 'HS_CODE_VERIFIED',
      entityType: 'InvoiceLineItem',
      entityId: 'item-1-inv1',
      details: {
        matchedHsCode: '847130000000',
        confidenceScore: 0.98,
        requiredCertificates: ['PCoC', 'SCoC', 'IECEE', 'CST'],
      },
      ipAddress: '197.24.120.45',
      timestamp: new Date('2026-09-10T09:15:00Z'),
    });
  }

  getAllInvoices(): InvoiceEntity[] {
    return Array.from(this.invoices.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getInvoiceById(id: string): InvoiceEntity | null {
    return this.invoices.get(id) || null;
  }

  createInvoice(data: Omit<InvoiceEntity, 'id' | 'createdAt' | 'updatedAt'>): InvoiceEntity {
    const id = `inv-${Date.now()}`;
    const newInvoice: InvoiceEntity = {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.invoices.set(id, newInvoice);
    return newInvoice;
  }

  updateInvoice(id: string, updates: Partial<InvoiceEntity>): InvoiceEntity | null {
    const existing = this.invoices.get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.invoices.set(id, updated);
    return updated;
  }

  updateLineItem(
    invoiceId: string,
    lineNumber: number,
    updates: Partial<LineItemEntity>
  ): { invoice: InvoiceEntity; item: LineItemEntity } | null {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) return null;

    const itemIndex = invoice.lineItems.findIndex((it) => it.lineNumber === lineNumber);
    if (itemIndex === -1) return null;

    const currentItem = invoice.lineItems[itemIndex];
    const updatedItem: LineItemEntity = {
      ...currentItem,
      ...updates,
      updatedAt: new Date(),
    };

    // If matchedHsCode changed or dutyRate changed, recompute fees
    if (updates.dutyRate !== undefined || updates.matchedHsCode !== undefined) {
      const dutyRate = updates.dutyRate !== undefined ? updates.dutyRate : updatedItem.dutyRate;
      const dutyFee = dutyRate === null ? null : Number(((updatedItem.totalValue * dutyRate) / 100).toFixed(2));
      const vatFee = dutyFee === null ? null : Number((((updatedItem.totalValue + dutyFee) * updatedItem.vatRate) / 100).toFixed(2));
      updatedItem.calculatedDutyFee = dutyFee;
      updatedItem.calculatedVatFee = vatFee;
      updatedItem.dutyRate = dutyRate;
    }

    const updatedLineItems = [...invoice.lineItems];
    updatedLineItems[itemIndex] = updatedItem;

    // Recalculate total amount if items changed
    const newTotal = updatedLineItems.reduce((acc, curr) => acc + curr.totalValue, 0);

    const updatedInvoice: InvoiceEntity = {
      ...invoice,
      totalAmount: newTotal,
      lineItems: updatedLineItems,
      updatedAt: new Date(),
    };

    this.invoices.set(invoiceId, updatedInvoice);
    return { invoice: updatedInvoice, item: updatedItem };
  }

  createAuditLog(log: Omit<AuditLogEntity, 'id' | 'timestamp'>): AuditLogEntity {
    const newLog: AuditLogEntity = {
      ...log,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date(),
    };
    this.auditLogs.unshift(newLog);
    return newLog;
  }

  getAuditLogs(limit: number = 50): AuditLogEntity[] {
    return this.auditLogs.slice(0, limit);
  }
}

// Global in-memory singleton for robust development resilience
const globalStore = globalThis as unknown as {
  invoiceStore: InvoiceMemoryStore | undefined;
};

export const invoiceStore = globalStore.invoiceStore ?? new InvoiceMemoryStore();
if (process.env.NODE_ENV !== 'production') globalStore.invoiceStore = invoiceStore;
