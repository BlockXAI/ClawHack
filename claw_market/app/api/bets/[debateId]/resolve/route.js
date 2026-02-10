import { NextResponse } from 'next/server';
const store = require('@/lib/store');

// POST /api/bets/[debateId]/resolve — resolve debate and distribute winnings
export async function POST(request, { params }) {
    try {
        const body = await request.json();
        const { winnerAgentId } = body;

        if (!winnerAgentId) {
            return NextResponse.json({ error: 'Missing required field: winnerAgentId' }, { status: 400 });
        }

        const result = store.resolveBet(params.debateId, winnerAgentId);
        return NextResponse.json({
            message: 'Debate resolved and winnings distributed',
            debateId: params.debateId,
            winner: winnerAgentId,
            totalPool: result.pool.totalPool,
            rake: result.rake,
            payouts: result.payouts
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
