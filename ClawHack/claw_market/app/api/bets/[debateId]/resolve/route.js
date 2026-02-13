import { NextResponse } from 'next/server';

// DEPRECATED — off-chain resolution removed in Phase 4. Use /api/oracle/resolve instead.
export async function POST() {
    return NextResponse.json({
        error: 'Off-chain resolution is deprecated. Use POST /api/oracle/resolve instead.',
    }, { status: 410 });
}
