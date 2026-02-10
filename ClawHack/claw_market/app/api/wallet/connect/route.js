import { NextResponse } from 'next/server';
const store = require('@/lib/store');

// POST /api/wallet/connect — self-service wallet creation (no admin key needed)
// Creates a wallet with a fixed starting balance (capped, non-exploitable)
const DEFAULT_STARTING_BALANCE = 1000;

export async function POST(request) {
    try {
        const body = await request.json();
        const { address } = body;

        if (!address) {
            return NextResponse.json({ error: 'Missing required field: address' }, { status: 400 });
        }

        // Check if wallet already exists
        const existing = await store.getWallet(address);
        if (existing) {
            return NextResponse.json({ message: 'Wallet already exists', wallet: existing });
        }

        // Create with fixed starting balance — no user-specified amounts
        const wallet = await store.createWallet(address, DEFAULT_STARTING_BALANCE);
        return NextResponse.json({ message: 'Wallet created', wallet }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
