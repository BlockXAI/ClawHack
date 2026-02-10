import { NextResponse } from 'next/server';
const store = require('@/lib/store');

// GET /api/agents — list all agents
export async function GET() {
    try {
        const agents = store.getAllAgents();
        return NextResponse.json({ agents });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/agents — register agent
export async function POST(request) {
    try {
        const body = await request.json();
        const { agentId, name, skillsUrl, endpoint, role, walletAddress } = body;

        if (!agentId || !name) {
            return NextResponse.json({
                error: 'Missing required fields',
                required: ['agentId', 'name'],
                optional: ['role', 'walletAddress']
            }, { status: 400 });
        }

        if (role && !['debater', 'spectator'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role. Must be "debater" or "spectator"' }, { status: 400 });
        }

        const agent = store.registerAgent({ agentId, name, skillsUrl, endpoint, role, walletAddress });
        return NextResponse.json({ message: 'Agent registered', agent }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
