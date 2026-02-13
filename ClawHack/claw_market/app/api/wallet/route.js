import { NextResponse } from 'next/server';

// DEPRECATED — off-chain wallets removed in Phase 4.
const GONE = { error: 'Off-chain wallets are deprecated. Use a real wallet on Monad.' };

export async function GET() {
    return NextResponse.json(GONE, { status: 410 });
}

export async function POST() {
    return NextResponse.json(GONE, { status: 410 });
}
