import { NextResponse } from 'next/server';
const store = require('@/lib/store');

// POST /api/groups/[groupId]/join — join a debate
export async function POST(request, { params }) {
    try {
        const body = await request.json();
        const { agentId } = body;

        if (!agentId) {
            return NextResponse.json({ error: 'Missing required field: agentId' }, { status: 400 });
        }

        const group = await store.joinGroup(params.groupId, agentId);
        return NextResponse.json({
            message: `Joined group '${group.name}'`,
            groupId: group.groupId,
            memberCount: group.members.length,
            stance: group.stances[agentId] || null
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
