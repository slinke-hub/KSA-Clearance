import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invoiceUploadSchema } from '@/lib/validations/invoice';
import { classifyFromOfficialSources } from '@/lib/services/official-classification';
import { serializeInvoice } from '@/lib/services/serialize-invoice';
import { allocateInvoiceValues, invoiceTotal } from '@/lib/services/invoice-valuation';
import { databaseUnavailable, databaseUnavailableMessage } from '@/lib/services/database-error';

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        lineItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Transform decimal to string/number if needed, but Next.js NextResponse handles it mostly.
    return NextResponse.json({ success: true, data: invoices.map(serializeInvoice) });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { success: false, error: databaseUnavailable(error) ? 'The invoice database is temporarily unavailable. Please retry shortly.' : 'Failed to fetch invoices' },
      { status: databaseUnavailable(error) ? 503 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = invoiceUploadSchema.parse(body);
    const total = invoiceTotal(validated.lineItems, validated.charges);
    if (Math.abs(total - validated.totalAmount) > 0.01) return NextResponse.json({ success: false, error: 'Invoice total does not reconcile with products and adjustments.' }, { status: 400 });
    const values = allocateInvoiceValues(validated.lineItems, validated.charges);
    if (values.some(value => value.customsValue < 0)) return NextResponse.json({ success: false, error: 'Invoice adjustments exceed goods value.' }, { status: 400 });
    // Fail before lengthy external lookups if the invoice cannot be persisted.
    await prisma.$queryRaw`SELECT 1`;
    // Resolve sources before opening a database transaction. Cache duplicate products in this upload.
    const results: Awaited<ReturnType<typeof classifyFromOfficialSources>>[] = [];
    const cache = new Map<string, ReturnType<typeof classifyFromOfficialSources>>();
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(3, validated.lineItems.length) }, async () => {
      while (cursor < validated.lineItems.length) {
        const index = cursor++, item = validated.lineItems[index], valuation = values[index];
        const key = JSON.stringify([item.description, valuation, item.declaredHsCode, item.productDetails]);
        const result = cache.get(key) ?? classifyFromOfficialSources(item.description, valuation.customsValue, item.declaredHsCode, valuation, item.productDetails);
        cache.set(key, result);
        results[index] = await result;
      }
    }));

    // Hardcode user-agent-01 or fetch from auth
    const userId = 'user-agent-01';
    
    // Upsert the profile to ensure foreign key constraint doesn't fail
    await prisma.profile.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        fullName: 'Agent 01',
        role: 'AGENT'
      }
    });

    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: validated.invoiceNumber,
        exporterName: validated.exporterName,
        importerName: validated.importerName,
        currency: validated.currency,
        totalAmount: validated.totalAmount,
        charges: validated.charges as any,
        storagePath: validated.storagePath,
        fileHash: validated.fileHash,
        status: 'PENDING',
        createdById: userId,
        lineItems: {
          create: validated.lineItems.map((item, index) => {
            const classification = results[index];

            return {
              lineNumber: item.lineNumber,
              description: item.description,
              quantity: item.quantity,
              unitValue: item.unitValue,
              totalValue: item.totalValue,
              countryOfOrigin: item.countryOfOrigin,
              declaredHsCode: item.declaredHsCode || undefined,
              matchedHsCode: classification.matchedHsCode || undefined,
              dutyRate: classification.dutyRate ?? undefined,
              vatRate: classification.vatRate ?? undefined,
              calculatedDutyFee: classification.calculatedDutyFee ?? undefined,
              calculatedVatFee: classification.calculatedVatFee ?? undefined,
              regulatoryStatus: classification.regulatoryStatus as any,
              requiredCertificates: classification.requiredCertificates,
              confidenceScore: classification.confidenceScore,
              classificationEvidence: JSON.parse(JSON.stringify(classification.classificationEvidence)),
              verifiedByUser: false,
            };
          }),
        },
      },
      include: {
        lineItems: true,
      },
    });

    // Write audit log outside the transaction — best-effort, non-blocking.
    // Using the top-level prisma client avoids inheriting a closed transaction context.
    prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'INVOICE_UPLOADED',
        entityType: 'Invoice',
        entityId: newInvoice.id,
        details: {
          invoiceNumber: newInvoice.invoiceNumber,
          fileHash: newInvoice.fileHash,
          lineItemCount: newInvoice.lineItems.length,
          totalAmount: Number(newInvoice.totalAmount),
        },
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      },
    }).catch((auditErr) => {
      // Non-fatal — log to console but never surface to the client
      console.warn('[AuditLog] Failed to write audit entry:', auditErr?.message);
    });

    // Source lookup is complete; human product-scope review remains pending.

    return NextResponse.json({ success: true, data: serializeInvoice(newInvoice) }, { status: 201 });
  } catch (error: any) {
    console.error('Validation or ingestion error:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: databaseUnavailable(error) ? databaseUnavailableMessage : 'The invoice could not be saved. Please retry. Your invoice preview has been kept.' },
      { status: databaseUnavailable(error) ? 503 : 500 }
    );
  }
}
