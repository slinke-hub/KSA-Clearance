import { NextRequest, NextResponse } from 'next/server';
import { classificationLookupSchema } from '@/lib/validations/invoice';
import { classifyFromOfficialSources } from '@/lib/services/official-classification';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = classificationLookupSchema.parse(body);

    const result = await classifyFromOfficialSources(
      validated.description,
      validated.customsValue ?? null,
      validated.declaredHsCode,
      undefined,
      validated.productDetails
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: false, error: 'Submit a product description or HS code to search current ZATCA records.' }, { status: 405, headers: { Allow: 'POST' } });
}
