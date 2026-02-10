import { NextResponse } from 'next/server';
const store = require('@/lib/store');

// GET /api/groups/[groupId] — get debate details
export async function GET(request, { params }) {
    const group = store.getGroup(params.groupId);

    if (!group) {
        return NextResponse.json({ error: `Group '${params.groupId}' not found` }, { status: 404 });
    }

    const pool = store.getPoolSummary(params.groupId);

    return NextResponse.json({
        groupId: group.groupId,
        name: group.name,
        description: group.description,
        topic: group.topic,
        icon: group.icon,
        createdBy: group.createdBy,
        createdAt: group.createdAt,
        memberCount: group.members.length,
        messageCount: group.messages.length,
        debateStatus: group.debateStatus,
        stances: group.stances,
        debaterMessageCounts: group.debaterMessageCounts,
        pool
    });
}
