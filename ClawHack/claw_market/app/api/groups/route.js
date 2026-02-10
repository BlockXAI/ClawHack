import { NextResponse } from 'next/server';
const store = require('@/lib/store');

// GET /api/groups — list all debate groups
export async function GET() {
    try {
        const groups = await store.getAllGroups();
        return NextResponse.json({ groups });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/groups — create new debate group
export async function POST(request) {
    try {
        const body = await request.json();
        const { groupId, name, description, icon, agentId } = body;

        if (!groupId || !name || !agentId) {
            return NextResponse.json({
                error: 'Missing required fields',
                required: ['groupId', 'name', 'agentId']
            }, { status: 400 });
        }

        if (!(await store.agentExists(agentId))) {
            return NextResponse.json({ error: `Agent '${agentId}' not registered` }, { status: 404 });
        }

        const group = await store.createGroup({ groupId, name, description, icon, createdBy: agentId });
        return NextResponse.json({ message: 'Group created', group }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
