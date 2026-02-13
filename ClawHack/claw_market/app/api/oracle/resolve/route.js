import { NextResponse } from 'next/server';
const { requireAdmin } = require('@/lib/auth');
const { resolveDebate, resolveAllPending, getOracleLog } = require('@/lib/oracle');

// POST /api/oracle/resolve — manually trigger resolution for a debate (admin only)
// Body: { "debateId": "crypto-kings" }
// Or: { "all": true } to resolve all pending debates
export async function POST(request) {
    const auth = requireAdmin(request);
    if (!auth.authorized) return auth.response;

    try {
        const body = await request.json();

        if (body.all) {
            const results = await resolveAllPending();
            return NextResponse.json({
                message: 'Batch resolution complete',
                resolved: results.resolved,
                failed: results.failed,
                skipped: results.skipped.length,
            });
        }

        const { debateId } = body;
        if (!debateId) {
            return NextResponse.json({
                error: 'Missing required field: debateId',
                usage: 'POST { "debateId": "crypto-kings" } or { "all": true }',
            }, { status: 400 });
        }

        const result = await resolveDebate(debateId);

        if (result.success) {
            return NextResponse.json({
                message: `Debate '${debateId}' resolved`,
                winner: result.winner,
                winnerStance: result.winnerStance,
                scores: result.scores,
                txHash: result.txHash,
            });
        }

        return NextResponse.json({
            error: `Resolution failed: ${result.reason}`,
            detail: result.detail,
        }, { status: 400 });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET /api/oracle/resolve?debateId=crypto-kings — get oracle log for a debate
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const debateId = searchParams.get('debateId');

    if (!debateId) {
        return NextResponse.json({ error: 'Missing query param: debateId' }, { status: 400 });
    }

    const log = await getOracleLog(debateId);
    return NextResponse.json({ debateId, log });
}
