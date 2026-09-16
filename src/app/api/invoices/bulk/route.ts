import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { ids, userId } = body;

    // Validate admin (if needed you can use userId)
    // Note: robust auth check should ideally happen with session middleware
    
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const result = await prisma.invoice.deleteMany({
        where: { id: { in: ids } },
      });
      return NextResponse.json({ success: true, count: result.count });
    } else {
      // Delete all if no ids provided
      const result = await prisma.invoice.deleteMany({});
      return NextResponse.json({ success: true, count: result.count });
    }
  } catch (error: any) {
    console.error('Bulk invoice deletion error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete invoices' }, { status: 500 });
  }
}
