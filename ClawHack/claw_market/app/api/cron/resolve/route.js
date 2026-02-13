import { NextResponse } from 'next/server';
const { resolveAllPending } = require('@/lib/oracle');

// GET /api/cron/resolve — Vercel cron safety net
// Scans all groups in 'voting' status and resolves them.
// Protected by CRON_SECRET to prevent unauthorized triggers.
export async function GET(request) {
    // Verify cron secret (Vercel sends this automatically for cron jobs)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const results = await resolveAllPending();

        return NextResponse.json({
            message: 'Cron resolution sweep complete',
            timestamp: new Date().toISOString(),
            resolved: results.resolved,
            failed: results.failed,
            skippedCount: results.skipped.length,
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
