import { NextResponse } from 'next/server';

// DEPRECATED — off-chain leaderboard removed in Phase 4.
export async function GET() {
    return NextResponse.json({
        error: 'Off-chain leaderboard is deprecated. On-chain leaderboard coming soon.',
        leaderboard: [],
    }, { status: 410 });
}
