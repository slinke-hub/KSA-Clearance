import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: { fullName: true, role: true }
        }
      }
    });
    
    const enriched = logs.map((log) => ({
      ...log,
      user: {
        name: log.user?.fullName || 'System Agent',
        role: log.user?.role || 'AGENT',
        email: 'system@zatca.sa',
      }
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
