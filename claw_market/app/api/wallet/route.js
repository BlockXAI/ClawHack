import { NextResponse } from 'next/server';
const store = require('@/lib/store');

// GET /api/wallet?address=0x... — get wallet info
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');

        if (!address) {
            return NextResponse.json({ error: 'Missing query parameter: address' }, { status: 400 });
        }

        const wallet = store.getWallet(address);
        if (!wallet) {
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
        }

        const userBets = store.getUserBets(address);
        return NextResponse.json({ wallet: { ...wallet, betHistory: userBets } });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/wallet — create/fund wallet
export async function POST(request) {
    try {
        const body = await request.json();
        const { address, initialBalance, fundAmount } = body;

        if (!address) {
            return NextResponse.json({ error: 'Missing required field: address' }, { status: 400 });
        }

        let wallet;
        if (fundAmount) {
            wallet = store.fundWallet(address, parseFloat(fundAmount));
        } else {
            wallet = store.createWallet(address, parseFloat(initialBalance) || 1000);
        }

        return NextResponse.json({ message: 'Wallet ready', wallet }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
