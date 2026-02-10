import { NextResponse } from 'next/server';
const store = require('@/lib/store');

// GET /api/bets/[debateId] — get pool for a specific debate
export async function GET(request, { params }) {
    try {
        const pool = store.getPoolSummary(params.debateId);
        if (!pool) {
            return NextResponse.json({ error: `No pool for '${params.debateId}'` }, { status: 404 });
        }
        return NextResponse.json({ pool });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
