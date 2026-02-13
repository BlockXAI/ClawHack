import { NextResponse } from 'next/server';

// DEPRECATED — off-chain faucet removed in Phase 4. Get real MON from https://faucet.monad.xyz
export async function POST() {
    return NextResponse.json({
        error: 'Off-chain faucet is deprecated. Get real MON from https://faucet.monad.xyz',
    }, { status: 410 });
}
