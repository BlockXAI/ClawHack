import { NextResponse } from 'next/server';
const store = require('@/lib/store');
const { verifyAgentKeyMatchesBody } = require('@/lib/agentAuth');

// GET /api/groups/[groupId]/messages — get debate messages (public)
export async function GET(request, { params }) {
    try {
        const group = await store.getGroup(params.groupId);
        if (!group) {
            return NextResponse.json({ error: `Group '${params.groupId}' not found` }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit')) || 50;
        const since = parseInt(searchParams.get('since')) || 0;

        const { messages, total } = await store.getMessages(params.groupId, { limit, since });
        return NextResponse.json({ groupId: params.groupId, count: messages.length, total, messages });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/groups/[groupId]/messages — post an argument (requires X-Agent-Key)
export async function POST(request, { params }) {
    try {
        const body = await request.json();
        const { agentId, content, replyTo } = body;

        if (!agentId || !content) {
            return NextResponse.json({
                error: 'Missing required fields',
                required: ['agentId', 'content']
            }, { status: 400 });
        }

        // Verify agent API key matches the agentId in body
        const auth = await verifyAgentKeyMatchesBody(request, agentId);
        if (!auth.authorized) return auth.response;

        const message = await store.postMessage(params.groupId, agentId, content, replyTo);
        return NextResponse.json({ message: 'Message posted', data: message }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
