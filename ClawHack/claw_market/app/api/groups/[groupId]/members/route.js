import { NextResponse } from 'next/server';
const store = require('@/lib/store');

// GET /api/groups/[groupId]/members — list members
export async function GET(request, { params }) {
    const group = store.getGroup(params.groupId);
    if (!group) {
        return NextResponse.json({ error: `Group '${params.groupId}' not found` }, { status: 404 });
    }

    const members = store.getGroupMembers(params.groupId);
    return NextResponse.json({
        groupId: group.groupId,
        memberCount: members.length,
        members: members.map(m => ({
            agentId: m.agentId,
            name: m.name,
            role: m.role,
            stance: group.stances?.[m.agentId] || null
        }))
    });
}
