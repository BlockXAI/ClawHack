import { NextResponse } from 'next/server';
const store = require('@/lib/store');

// GET /api/leaderboard — top earners
export async function GET() {
    try {
        const leaderboard = store.getLeaderboard();
        return NextResponse.json({ leaderboard });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
