import { NextResponse } from 'next/server';
const store = require('@/lib/store');
const { requireAdmin } = require('@/lib/auth');

// POST /api/bets/[debateId]/resolve — resolve debate and distribute winnings (ADMIN ONLY)
export async function POST(request, { params }) {
    try {
        const auth = requireAdmin(request);
        if (!auth.authorized) return auth.response;

        const body = await request.json();
        const { winnerAgentId } = body;

        if (!winnerAgentId) {
            return NextResponse.json({ error: 'Missing required field: winnerAgentId' }, { status: 400 });
        }

        const result = await store.resolveBet(params.debateId, winnerAgentId);
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
