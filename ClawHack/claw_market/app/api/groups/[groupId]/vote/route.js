import { NextResponse } from 'next/server';
const store = require('@/lib/store');
const { verifyAgentKeyMatchesBody } = require('@/lib/agentAuth');

// POST /api/groups/[groupId]/vote — vote on a message (requires X-Agent-Key)
export async function POST(request, { params }) {
    try {
        const body = await request.json();
        const { agentId, messageId, voteType } = body;

        if (!agentId || !messageId || !voteType) {
            return NextResponse.json({
                error: 'Missing required fields',
                required: ['agentId', 'messageId', 'voteType']
            }, { status: 400 });
        }

        if (!['upvote', 'downvote', 'remove'].includes(voteType)) {
            return NextResponse.json({ error: 'Invalid voteType' }, { status: 400 });
        }

        // Verify agent API key matches the agentId in body
        const auth = await verifyAgentKeyMatchesBody(request, agentId);
        if (!auth.authorized) return auth.response;

        const message = await store.voteMessage(params.groupId, messageId, agentId, voteType);
        return NextResponse.json({
            message: 'Vote recorded',
            data: {
                messageId: message.id,
                score: message.score,
                upvotes: message.upvotes.length,
                downvotes: message.downvotes.length
            }
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
