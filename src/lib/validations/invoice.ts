import { z } from 'zod';

export const roleEnum = z.enum(['ADMIN', 'AGENT', 'AUDITOR']);
export const invoiceStatusEnum = z.enum(['PENDING', 'PROCESSING', 'VERIFIED', 'CLEARED']);
export const regulatoryStatusEnum = z.enum(['UNKNOWN', 'REGULATED', 'NON_REGULATED', 'RESTRICTED', 'PROHIBITED']);

export const certificateTypeEnum = z.enum([
  'PCoC',     // Saber Product Certificate of Conformity
  'SCoC',     // Saber Shipment Certificate of Conformity
  'G-Mark',   // Gulf Conformity Mark (low-voltage & toys)
  'IECEE',    // SASO National Recognition Certificate
  'SFDA',     // Saudi Food & Drug Authority MDMA/Clearance
  'SASO-EE',  // SASO Energy Efficiency Standard
  'CST',      // Communications, Space & Technology Commission Type Approval
  'CITC',     // Legacy CITC Telecom Approval
]);

export const productDetailsSchema = z.object({
  material: z.string().trim().max(100).optional(),
  use: z.string().trim().max(300).optional(),
  vehicleClass: z.enum(['passenger', 'goods', 'bus', 'tractor', 'special']).optional(),
}).strict();

// Base line-item object schema before refinements (enables safe .partial() extension)
export const baseLineItemObject = z.object({
  productDetails: productDetailsSchema.optional(),
  lineNumber: z
    .number({ required_error: 'Line number is required' })
    .int('Line number must be an integer')
    .positive('Line number must be greater than 0'),
  description: z
    .string({ required_error: 'Item description is required' })
    .trim()
    .min(3, 'Item description must contain at least 3 characters')
    .max(2000, 'Description cannot exceed 2000 characters'),
  quantity: z
    .number({ required_error: 'Quantity is required' })
    .positive('Quantity must be greater than 0'),
  unitValue: z
    .number({ required_error: 'Unit value is required' })
    .nonnegative('Unit value cannot be negative'),
  totalValue: z
    .number({ required_error: 'Total value is required' })
    .nonnegative('Total value cannot be negative'),
  countryOfOrigin: z
    .string({ required_error: 'Country of origin is required' })
    .trim()
    .length(2, 'Country of origin must be a valid 2-letter ISO code')
    .toUpperCase(),
  declaredHsCode: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : (val ? val.replace(/\D/g, '') : null))
    .refine(val => !val || /^\d{6,12}$/.test(val), 'Declared HS Code must be between 6 and 12 digits'),
  matchedHsCode: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : (val ? val.replace(/\D/g, '') : null))
    .refine(val => !val || /^\d{8,12}$/.test(val), 'ZATCA Integrated Tariff Code must be between 8 and 12 digits'),
  dutyRate: z
    .number()
    .min(0, 'Duty rate cannot be negative')
    .max(100, 'Duty rate cannot exceed 100%')
    .default(0),
  vatRate: z
    .number()
    .default(15.00),
  calculatedDutyFee: z
    .number()
    .nonnegative()
    .default(0),
  calculatedVatFee: z
    .number()
    .nonnegative()
    .default(0),
  regulatoryStatus: regulatoryStatusEnum.default('UNKNOWN'),
  requiredCertificates: z
    .array(z.string().trim())
    .default([]),
  confidenceScore: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .nullable(),
  verifiedByUser: z
    .boolean()
    .default(false),
});

// Individual line-item schema with arithmetic validation
export const invoiceLineItemSchema = baseLineItemObject.refine(
  (data) => {
    const calculatedTotal = data.quantity * data.unitValue;
    return Math.abs(calculatedTotal - data.totalValue) < 0.50; // Tolerance for currency conversions
  },
  {
    message: 'Total value does not match (Quantity × Unit Value)',
    path: ['totalValue'],
  }
);

// Backward-compatible alias
export const lineItemSchema = invoiceLineItemSchema;

// Validation schema for creating an entire invoice batch
export const invoiceBatchCreateSchema = z.object({
  charges: z.array(z.object({ label: z.string().trim().min(1).max(255), amount: z.number().finite() })).max(30).default([]),
  invoiceNumber: z
    .string({ required_error: 'Invoice number is required' })
    .trim()
    .min(1, 'Invoice number cannot be empty')
    .max(100),
  exporterName: z
    .string({ required_error: 'Exporter name is required' })
    .trim()
    .min(2, 'Exporter name must be at least 2 characters')
    .max(255),
  importerName: z
    .string({ required_error: 'Importer name is required' })
    .trim()
    .min(2, 'Importer name must be at least 2 characters')
    .max(255),
  currency: z
    .string({ required_error: 'Currency is required' })
    .trim()
    .length(3, 'Currency must be a 3-letter ISO currency code')
    .toUpperCase()
    .default('SAR'),
  totalAmount: z
    .number({ required_error: 'Total amount is required' })
    .positive('Total invoice amount must be greater than 0'),
  storagePath: z
    .string({ required_error: 'Supabase storage path is required' })
    .min(5, 'Invalid storage path'),
  fileHash: z
    .string({ required_error: 'File SHA-256 hash is required' })
    .length(64, 'Invalid SHA-256 hash length'),
  lineItems: z
    .array(invoiceLineItemSchema)
    .min(1, 'Invoice must contain at least one line item').max(100, 'Split invoices with more than 100 products'),
});

// Backward-compatible alias
export const invoiceUploadSchema = invoiceBatchCreateSchema;

// Partial update schema for agent inline edits and compliance overrides
export const lineItemUpdateSchema = baseLineItemObject
  .partial()
  .required({
    lineNumber: true,
  });

// Schema for manual tariff and regulation lookup
export const tariffLookupQuerySchema = z.object({
  productDetails: productDetailsSchema.optional(),
  customsValue: z.number().finite().nonnegative().optional(),
  description: z.string().trim().min(2, 'Description is required for classification lookup'),
  countryOfOrigin: z.string().trim().length(2).toUpperCase(),
  declaredHsCode: z.string().trim().optional(),
});

// Backward-compatible alias
export const classificationLookupSchema = tariffLookupQuerySchema;

// TypeScript Inferred Types
export type Role = z.infer<typeof roleEnum>;
export type InvoiceStatus = z.infer<typeof invoiceStatusEnum>;
export type RegulatoryStatus = z.infer<typeof regulatoryStatusEnum>;
export type CertificateType = z.infer<typeof certificateTypeEnum>;

export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemSchema>;
export type InvoiceBatchCreateInput = z.infer<typeof invoiceBatchCreateSchema>;
export type LineItemUpdateInput = z.infer<typeof lineItemUpdateSchema>;
export type TariffLookupQueryInput = z.infer<typeof tariffLookupQuerySchema>;

// Backward-compatible type aliases
export type LineItemInput = InvoiceLineItemInput;
export type InvoiceUploadInput = InvoiceBatchCreateInput;
export type ClassificationLookupInput = TariffLookupQueryInput;
