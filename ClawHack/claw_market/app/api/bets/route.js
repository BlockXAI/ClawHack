import { NextResponse } from 'next/server';
const store = require('@/lib/store');

// GET /api/bets — list all betting pools
export async function GET() {
    try {
        const pools = await store.getAllPools();
        return NextResponse.json({ pools });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/bets — place a bet
export async function POST(request) {
    try {
        const body = await request.json();
        const { walletAddress, debateId, agentId, amount } = body;

        if (!walletAddress || !debateId || !agentId || !amount) {
            return NextResponse.json({
                error: 'Missing required fields',
                required: ['walletAddress', 'debateId', 'agentId', 'amount']
            }, { status: 400 });
        }

        const result = await store.placeBet(debateId, walletAddress, agentId, parseFloat(amount));
        return NextResponse.json({
            message: 'Bet placed successfully',
            bet: result.bet,
            pool: result.pool
        }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
