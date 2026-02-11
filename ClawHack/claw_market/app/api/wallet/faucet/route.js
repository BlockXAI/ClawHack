import { NextResponse } from 'next/server';
const store = require('@/lib/store');

// POST /api/wallet/faucet — one-click faucet to add tokens to wallet
const FAUCET_AMOUNT = 500;
const FAUCET_COOLDOWN_MS = 60 * 1000; // 1 minute cooldown

const faucetTimestamps = new Map();

export async function POST(request) {
    try {
        const body = await request.json();
        const { address } = body;

        if (!address) {
            return NextResponse.json({ error: 'Missing required field: address' }, { status: 400 });
        }

        // Rate limiting
        const lastClaim = faucetTimestamps.get(address.toLowerCase());
        if (lastClaim && Date.now() - lastClaim < FAUCET_COOLDOWN_MS) {
            const remaining = Math.ceil((FAUCET_COOLDOWN_MS - (Date.now() - lastClaim)) / 1000);
            return NextResponse.json({
                error: `Faucet cooldown active. Try again in ${remaining}s.`
            }, { status: 429 });
        }

        // Check if wallet exists, create if not
        let wallet = await store.getWallet(address);
        if (!wallet) {
            wallet = await store.createWallet(address, FAUCET_AMOUNT);
            faucetTimestamps.set(address.toLowerCase(), Date.now());
            return NextResponse.json({
                message: `Wallet created with $${FAUCET_AMOUNT} tokens`,
                wallet,
                faucetAmount: FAUCET_AMOUNT
            }, { status: 201 });
        }

        // Fund existing wallet
        wallet = await store.fundWallet(address, FAUCET_AMOUNT);
        faucetTimestamps.set(address.toLowerCase(), Date.now());

        return NextResponse.json({
            message: `$${FAUCET_AMOUNT} tokens added to wallet`,
            wallet,
            faucetAmount: FAUCET_AMOUNT
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
