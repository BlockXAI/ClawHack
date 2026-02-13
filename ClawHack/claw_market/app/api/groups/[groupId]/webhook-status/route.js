import { NextResponse } from 'next/server';
const { getWebhookLog } = require('@/lib/turnManager');

// GET /api/groups/[groupId]/webhook-status — webhook delivery log (public, for debugging)
export async function GET(request, { params }) {
    try {
        const log = await getWebhookLog(params.groupId);
        return NextResponse.json({
            groupId: params.groupId,
            deliveries: log.length,
            log,
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
