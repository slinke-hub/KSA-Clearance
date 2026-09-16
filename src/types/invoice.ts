export interface UserEntity {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'AGENT' | 'AUDITOR';
  createdAt: Date;
  updatedAt: Date;
}

export interface LineItemEntity {
  id: string;
  invoiceId: string;
  lineNumber: number;
  description: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  countryOfOrigin: string;
  declaredHsCode: string | null;
  matchedHsCode: string | null;
  dutyRate: number | null;
  vatRate: number;
  calculatedDutyFee: number | null;
  calculatedVatFee: number | null;
  regulatoryStatus: 'UNKNOWN' | 'REGULATED' | 'NON_REGULATED' | 'RESTRICTED' | 'PROHIBITED';
  classificationEvidence?: import('@/lib/services/official-classification').SourceEvidence | null;
  requiredCertificates: string[];
  confidenceScore: number | null;
  verifiedByUser: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceEntity {
  charges?: import('@/lib/services/invoice-valuation').InvoiceCharge[] | null;
  id: string;
  invoiceNumber: string;
  exporterName: string;
  importerName: string;
  currency: string;
  totalAmount: number;
  storagePath: string;
  fileHash: string;
  status: 'PENDING' | 'PROCESSING' | 'VERIFIED' | 'CLEARED';
  createdById: string;
  createdBy?: UserEntity;
  lineItems: LineItemEntity[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLogEntity {
  id: string;
  userId: string;
  user?: UserEntity;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, any> | null;
  ipAddress: string | null;
  timestamp: Date;
}
