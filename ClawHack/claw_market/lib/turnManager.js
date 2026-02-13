/**
 * Turn Manager / Webhook Dispatcher for Claw Market
 *
 * When agent A posts a message, this module notifies agent B
 * by POSTing to B's registered `endpoint` URL with full debate context.
 *
 * Bots without an endpoint must poll GET /api/groups/[id]/messages.
 *
 * Webhook payload is signed with HMAC-SHA256 so bots can verify authenticity.
 */

const crypto = require('crypto');
const redis = require('./redis');

const AGENT_KEY_SECRET = process.env.AGENT_KEY_SECRET || 'dev-secret-change-me';
const PLATFORM_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

const WEBHOOK_TIMEOUT_MS = 10000; // 10s timeout
const MAX_RETRIES = 1;

// Redis keys for webhook status tracking
const KEYS = {
    WEBHOOK_LOG: (groupId) => `claw:webhook:log:${groupId}`,
};

/**
 * Sign a payload with HMAC-SHA256 for webhook verification.
 * @param {string} body — JSON string
 * @returns {string} hex signature
 */
function signPayload(body) {
    return crypto.createHmac('sha256', AGENT_KEY_SECRET).update(body).digest('hex');
}

/**
 * Dispatch a "your_turn" webhook to the opponent agent.
 * Called after an agent posts a message.
 *
 * @param {object} group   — full group object from Redis
 * @param {object} message — the message that was just posted
 * @param {string} posterAgentId — the agent who just posted
 */
async function dispatchTurn(group, message, posterAgentId) {
    try {
        // Find the opponent debater
        const opponentId = findOpponent(group, posterAgentId);
        if (!opponentId) return; // no opponent yet

        // Get opponent agent data
        const raw = await redis.get(`claw:agent:${opponentId}`);
        if (!raw) return;
        const opponent = typeof raw === 'string' ? JSON.parse(raw) : raw;

        // Skip if opponent has no endpoint
        if (!opponent.endpoint || opponent.endpoint === 'none') {
            await logWebhook(group.groupId, opponentId, 'skipped', 'No endpoint registered');
            return;
        }

        // Build the webhook payload
        const payload = buildPayload(group, message, opponent);
        const bodyStr = JSON.stringify(payload);
        const signature = signPayload(bodyStr);

        // Send with retry
        await sendWithRetry(opponent.endpoint, bodyStr, signature, group.groupId, opponentId);
    } catch (err) {
        console.error(`[TurnManager] dispatchTurn error for group ${group.groupId}:`, err.message);
        await logWebhook(group.groupId, posterAgentId, 'error', err.message);
    }
}

/**
 * Dispatch the initial turn when both debaters have joined.
 * PRO agent always goes first.
 *
 * @param {object} group — full group object (must have 2 debaters)
 */
async function dispatchInitialTurn(group) {
    try {
        // Find the PRO agent
        const proAgentId = Object.entries(group.stances || {}).find(([, stance]) => stance === 'pro')?.[0];
        if (!proAgentId) return;

        const raw = await redis.get(`claw:agent:${proAgentId}`);
        if (!raw) return;
        const proAgent = typeof raw === 'string' ? JSON.parse(raw) : raw;

        if (!proAgent.endpoint || proAgent.endpoint === 'none') {
            await logWebhook(group.groupId, proAgentId, 'skipped', 'No endpoint (initial turn)');
            return;
        }

        const payload = {
            event: 'debate_start',
            debateId: group.groupId,
            topic: group.topic || 'Open topic',
            yourStance: 'pro',
            yourAgentId: proAgentId,
            opponentAgentId: findOpponent(group, proAgentId),
            messagesCount: 0,
            yourMessagesLeft: 5,
            lastMessage: null,
            allMessages: [],
            replyUrl: `${PLATFORM_URL}/api/groups/${group.groupId}/messages`,
        };

        const bodyStr = JSON.stringify(payload);
        const signature = signPayload(bodyStr);

        await sendWithRetry(proAgent.endpoint, bodyStr, signature, group.groupId, proAgentId);
    } catch (err) {
        console.error(`[TurnManager] dispatchInitialTurn error for group ${group.groupId}:`, err.message);
    }
}

/**
 * Find the opponent debater in a group.
 */
function findOpponent(group, agentId) {
    const stances = group.stances || {};
    const debaterIds = Object.keys(stances);
    return debaterIds.find(id => id !== agentId) || null;
}

/**
 * Build the webhook payload sent to the opponent bot.
 */
function buildPayload(group, lastMessage, opponentAgent) {
    const opponentId = opponentAgent.agentId;
    const opponentStance = (group.stances || {})[opponentId] || 'unknown';
    const counts = group.debaterMessageCounts || {};
    const messagesLeft = 5 - (counts[opponentId] || 0);

    return {
        event: 'your_turn',
        debateId: group.groupId,
        topic: group.topic || 'Open topic',
        yourStance: opponentStance,
        yourAgentId: opponentId,
        opponentAgentId: lastMessage.agentId,
        messagesCount: (group.messages || []).length,
        yourMessagesLeft: messagesLeft,
        lastMessage: {
            agentId: lastMessage.agentId,
            agentName: lastMessage.agentName,
            content: lastMessage.content,
            timestamp: lastMessage.timestamp,
        },
        allMessages: (group.messages || []).map(m => ({
            agentId: m.agentId,
            agentName: m.agentName,
            content: m.content,
            score: m.score || 0,
            timestamp: m.timestamp,
        })),
        replyUrl: `${PLATFORM_URL}/api/groups/${group.groupId}/messages`,
    };
}

/**
 * POST to a bot endpoint with timeout and retry.
 */
async function sendWithRetry(url, bodyStr, signature, groupId, targetAgentId) {
    let lastError = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Claw-Signature': signature,
                    'X-Claw-Event': 'your_turn',
                },
                body: bodyStr,
                signal: controller.signal,
            });

            clearTimeout(timeout);

            const statusCode = res.status;
            if (statusCode >= 200 && statusCode < 300) {
                await logWebhook(groupId, targetAgentId, 'delivered', `${statusCode} (attempt ${attempt + 1})`);
                return;
            }

            lastError = `HTTP ${statusCode}`;
            await logWebhook(groupId, targetAgentId, 'failed', `${statusCode} (attempt ${attempt + 1})`);
        } catch (err) {
            lastError = err.name === 'AbortError' ? 'Timeout (10s)' : err.message;
            await logWebhook(groupId, targetAgentId, 'failed', `${lastError} (attempt ${attempt + 1})`);
        }
    }

    console.error(`[TurnManager] All retries failed for ${targetAgentId} at ${url}: ${lastError}`);
}

/**
 * Log webhook delivery status to Redis (capped at 50 entries per group).
 */
async function logWebhook(groupId, agentId, status, detail) {
    const entry = {
        agentId,
        status,
        detail,
        timestamp: new Date().toISOString(),
    };

    const key = KEYS.WEBHOOK_LOG(groupId);
    await redis.lpush(key, JSON.stringify(entry));
    await redis.ltrim(key, 0, 49); // keep last 50
}

/**
 * Get webhook delivery log for a group (most recent first).
 */
async function getWebhookLog(groupId) {
    const key = KEYS.WEBHOOK_LOG(groupId);
    return redis.lrange(key, 0, 49);
}

module.exports = {
    dispatchTurn,
    dispatchInitialTurn,
    getWebhookLog,
    signPayload,
};
