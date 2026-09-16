import { NextResponse } from 'next/server';

// No FASAH integration is configured. Never fabricate a declaration or clearance.
export async function POST() {
  return NextResponse.json({ success: false, error: 'FASAH submission is not connected. Review and export classification results; official clearance must be completed through the authorized service.' }, { status: 501 });
}
