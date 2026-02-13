import { NextResponse } from 'next/server';

// DEPRECATED — off-chain wallets removed in Phase 4. Use real wallet via RainbowKit.
export async function POST() {
    return NextResponse.json({
        error: 'Off-chain wallets are deprecated. Connect a real wallet to bet on-chain with MON.',
    }, { status: 410 });
}
