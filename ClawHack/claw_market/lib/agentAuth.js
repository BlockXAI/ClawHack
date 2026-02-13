/**
 * Agent authentication for Claw Market bot API.
 *
 * Each agent receives a unique API key on registration.
 * Write endpoints require the key via `X-Agent-Key` header.
 * Key = "claw_" + HMAC-SHA256(agentId, AGENT_KEY_SECRET).
 *
 * A reverse-lookup Redis key (`claw:agentkey:<key>` → agentId)
 * provides O(1) validation without scanning.
 */

const crypto = require('crypto');
const { NextResponse } = require('next/server');
const redis = require('./redis');

const AGENT_KEY_SECRET = process.env.AGENT_KEY_SECRET || 'dev-secret-change-me';

const KEYS = {
    AGENT: (id) => `claw:agent:${id}`,
    AGENT_KEY_LOOKUP: (key) => `claw:agentkey:${key}`,
};

/**
 * Generate a deterministic API key for an agent.
 * @param {string} agentId
 * @returns {string} key prefixed with "claw_"
 */
function generateAgentKey(agentId) {
    const hmac = crypto.createHmac('sha256', AGENT_KEY_SECRET);
    hmac.update(agentId);
    return 'claw_' + hmac.digest('hex');
}

/**
 * Store the reverse-lookup mapping in Redis.
 * Called once during agent registration.
 * @param {string} agentId
 * @param {string} apiKey
 */
async function storeKeyLookup(agentId, apiKey) {
    await redis.set(KEYS.AGENT_KEY_LOOKUP(apiKey), agentId);
}

/**
 * Verify the `X-Agent-Key` header on a request.
 * Returns the authenticated agentId if valid.
 *
 * @param {Request} request
 * @returns {{ authorized: boolean, agentId?: string, agent?: object, response?: NextResponse }}
 */
async function verifyAgentKey(request) {
    const key = request.headers.get('x-agent-key') || '';

    if (!key) {
        return {
            authorized: false,
            response: NextResponse.json(
                { error: 'Missing X-Agent-Key header. Register at POST /api/agents to get one.' },
                { status: 401 }
            ),
        };
    }

    // O(1) reverse lookup
    const agentId = await redis.get(KEYS.AGENT_KEY_LOOKUP(key));

    if (!agentId) {
        return {
            authorized: false,
            response: NextResponse.json(
                { error: 'Invalid API key.' },
                { status: 401 }
            ),
        };
    }

    // Fetch full agent object
    const raw = await redis.get(KEYS.AGENT(agentId));
    if (!raw) {
        return {
            authorized: false,
            response: NextResponse.json(
                { error: 'Agent not found for this key.' },
                { status: 401 }
            ),
        };
    }

    const agent = typeof raw === 'string' ? JSON.parse(raw) : raw;

    return { authorized: true, agentId, agent };
}

/**
 * Middleware-style helper: verify key AND ensure the authenticated agentId
 * matches the agentId in the request body. Prevents impersonation.
 *
 * @param {Request} request  — the incoming request (will be cloned for body read)
 * @param {string}  bodyAgentId — the agentId from the already-parsed body
 * @returns {{ authorized: boolean, agentId?: string, agent?: object, response?: NextResponse }}
 */
async function verifyAgentKeyMatchesBody(request, bodyAgentId) {
    const auth = await verifyAgentKey(request);
    if (!auth.authorized) return auth;

    if (auth.agentId !== bodyAgentId) {
        return {
            authorized: false,
            response: NextResponse.json(
                { error: `Key belongs to '${auth.agentId}', but request body says '${bodyAgentId}'. Cannot impersonate another agent.` },
                { status: 403 }
            ),
        };
    }

    return auth;
}

module.exports = {
    generateAgentKey,
    storeKeyLookup,
    verifyAgentKey,
    verifyAgentKeyMatchesBody,
};
