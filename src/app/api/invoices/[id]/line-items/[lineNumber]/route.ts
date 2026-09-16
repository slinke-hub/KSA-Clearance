import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { classifyFromOfficialSources, SourceEvidence } from '@/lib/services/official-classification';
import { z } from 'zod';
import { productDetailsSchema } from '@/lib/validations/invoice';

const updateSchema = z.object({ matchedHsCode: z.string().regex(/^\d{12}$/).optional(),
  productDetails: productDetailsSchema.optional(),
  refreshSources: z.boolean().optional(),
  verifiedByUser: z.boolean().optional(), userId: z.string().optional() }).strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; lineNumber: string }> }) {
  try {
    const { id: invoiceId, lineNumber } = await params;
    const body = updateSchema.parse(await req.json());
    const item = await prisma.invoiceLineItem.findFirst({ where: { invoiceId, lineNumber: Number(lineNumber) } });
    if (!item) return NextResponse.json({ success: false, error: 'Line item not found' }, { status: 404 });
    const valuation = (item.classificationEvidence as unknown as SourceEvidence | null)?.valuation;
    const productDetails = body.productDetails ?? (item.classificationEvidence as unknown as SourceEvidence | null)?.productDetails;
    const previousEvidence = item.classificationEvidence as unknown as SourceEvidence | null;
    const codeToCheck = body.matchedHsCode ?? (!body.productDetails && previousEvidence?.selectionStatus === 'DECLARED' ? item.matchedHsCode : item.declaredHsCode);
    const classification = body.matchedHsCode || body.refreshSources || body.productDetails ? await classifyFromOfficialSources(item.description, valuation?.customsValue ?? Number(item.totalValue), codeToCheck, valuation, productDetails) : null;
    if (body.matchedHsCode && classification && classification.matchedHsCode !== body.matchedHsCode) {
      return NextResponse.json({ success: false, error: 'This exact code could not be confirmed by ZATCA. No changes saved.' }, { status: 422 });
    }
    const evidence = classification?.classificationEvidence ?? item.classificationEvidence as unknown as SourceEvidence | null;
    if (body.verifiedByUser && (evidence?.engineVersion !== 2 || evidence?.sourceMode !== 'ZATCA_ONLY' || !evidence?.tariffConfirmed || !evidence.regulationConfirmed ||
      ['PROHIBITED', 'RESTRICTED'].includes(classification?.regulatoryStatus ?? item.regulatoryStatus) ||
      (classification ? classification.dutyRate === null : item.dutyRate === null))) {
      return NextResponse.json({ success: false, error: 'Resolve missing tariff, duty and ZATCA regulatory information before verification.' }, { status: 422 });
    }
    const updated = await prisma.$transaction(async tx => {
      const updatedItem = await tx.invoiceLineItem.update({ where: { id: item.id }, data: {
        ...(classification ? { ...classification, classificationEvidence: JSON.parse(JSON.stringify(classification.classificationEvidence)) } : {}),
        verifiedByUser: body.verifiedByUser ?? (classification ? false : item.verifiedByUser),
      } });
      await tx.invoice.update({ where: { id: invoiceId }, data: { status: 'PENDING' } });
      await tx.auditLog.create({ data: { userId: body.userId || 'user-agent-01', action: classification ? 'HS_CODE_SOURCE_LOOKUP' : 'LINE_ITEM_REVIEWED',
        entityType: 'InvoiceLineItem', entityId: item.id,
        details: JSON.parse(JSON.stringify({ previousHsCode: item.matchedHsCode, matchedHsCode: updatedItem.matchedHsCode, verifiedByUser: updatedItem.verifiedByUser, productDetails, matchReason: evidence?.matchReason })),
      } });
      return updatedItem;
    });
    return NextResponse.json({ success: true, data: { item: updated } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof z.ZodError ? 'Invalid update' : 'Unable to update item' }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}
