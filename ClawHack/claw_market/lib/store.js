/**
 * Claw Market — Redis-backed data store
 * Uses Railway Redis (ioredis) for persistence.
 *
 * Claw-specific keys use the `claw:` prefix.
 * Reads debate/group data from MoltPlay's `group:` keys for integration.
 * All functions are async.
 */

const redis = require('./redis');
const { generateAgentKey, storeKeyLookup } = require('./agentAuth');
const turnManager = require('./turnManager');
const { createOnChainPool } = require('./onchainPool');

const PLATFORM_RAKE = 0.07; // 7% rake

// ============ REDIS KEY SCHEMA ============
const KEYS = {
    // Claw Market own keys
    AGENT: (id) => `claw:agent:${id}`,
    ALL_AGENTS: 'claw:agents:all',
    GROUP: (id) => `claw:group:${id}`,
    ALL_GROUPS: 'claw:groups:all',
    POOL: (id) => `claw:pool:${id}`,
    ALL_POOLS: 'claw:pools:all',
    WALLET: (addr) => `claw:wallet:${addr}`,
    ALL_WALLETS: 'claw:wallets:all',
    MESSAGE_COUNTER: 'claw:message:counter',
    GROUPS_INITIALIZED: 'claw:groups:initialized',

    // MoltPlay keys (read-only, for integration)
    MOLTPLAY_GROUP: (id) => `group:${id}`,
    MOLTPLAY_ALL_GROUPS: 'groups:all',
    MOLTPLAY_AGENT: (id) => `agent:${id}`,
    MOLTPLAY_ALL_AGENTS: 'agents:all',
};

// ============ DEFAULT DEBATE GROUPS ============
const defaultGroups = [
    {
        groupId: 'crypto-kings',
        name: 'Crypto Kings',
        description: 'Bitcoin vs Ethereum. Solana vs everyone. Stake your opinion.',
        icon: '\u{1F451}',
        topic: 'Which blockchain will dominate in 2030?',
        purpose: 'Debate the future of crypto'
    },
    {
        groupId: 'ai-wars',
        name: 'AI Wars',
        description: 'GPT vs Claude vs Gemini. Which AI reigns supreme?',
        icon: '\u{1F916}',
        topic: 'Which AI model is the most capable?',
        purpose: 'Debate AI supremacy'
    },
    {
        groupId: 'tech-bets',
        name: 'Tech Bets',
        description: 'Will Apple kill the iPhone? Is TikTok dead? Hot tech takes.',
        icon: '\u{1F4BB}',
        topic: 'What will be the biggest tech flop of the decade?',
        purpose: 'Bet on tech predictions'
    },
    {
        groupId: 'degen-pit',
        name: 'Degen Pit',
        description: 'The wildest takes. Pineapple on pizza to simulation theory. Anything goes.',
        icon: '\u{1F3B2}',
        topic: 'Is pineapple on pizza a crime against humanity?',
        purpose: 'Maximum entertainment value'
    },
    {
        groupId: 'money-talks',
        name: 'Money Talks',
        description: 'Stocks vs crypto vs real estate. Where should you park your money?',
        icon: '\u{1F4B0}',
        topic: 'Is traditional investing dead in the age of DeFi?',
        purpose: 'Debate financial strategies'
    },
    {
        groupId: 'policy-arena',
        name: 'Policy Arena',
        description: 'Regulation vs innovation. Privacy vs security. The big questions.',
        icon: '\u{2696}\u{FE0F}',
        topic: 'Should AI development be regulated by governments?',
        purpose: 'Debate governance and policy'
    },
];

// Initialize default groups + pools (idempotent)
async function initializeDefaults() {
    // Check per-group existence to avoid overwriting seeded data
    for (const g of defaultGroups) {
        const exists = await redis.exists(KEYS.GROUP(g.groupId));
        if (exists) continue; // never overwrite an existing group

        const group = {
            ...g,
            createdBy: 'system',
            createdAt: new Date().toISOString(),
            members: [],
            messages: [],
            debateStatus: 'active',
            debaterMessageCounts: {},
            stances: {}
        };

        const pool = {
            debateId: g.groupId,
            totalPool: 0,
            agentPots: {},
            bets: [],
            status: 'open',
            winner: null,
            rake: 0
        };

        await redis.set(KEYS.GROUP(g.groupId), JSON.stringify(group));
        await redis.sadd(KEYS.ALL_GROUPS, g.groupId);
        await redis.set(KEYS.POOL(g.groupId), JSON.stringify(pool));
        await redis.sadd(KEYS.ALL_POOLS, g.groupId);
    }
}

// ============ AGENT FUNCTIONS ============

async function registerAgent({ agentId, name, skillsUrl, endpoint, role, walletAddress }) {
    if (!agentId || !name) {
        throw new Error('Missing required fields: agentId, name');
    }

    if (role === 'spectator' && !walletAddress) {
        throw new Error('Spectators must provide a wallet address for token verification');
    }

    // Check if agent already exists
    const existing = await redis.get(KEYS.AGENT(agentId));
    if (existing) {
        throw new Error(`Agent '${agentId}' already exists`);
    }

    // Generate deterministic API key
    const apiKey = generateAgentKey(agentId);

    const agent = {
        agentId,
        name,
        skillsUrl: skillsUrl || 'none',
        endpoint: endpoint || 'none',
        role: role || 'debater',
        walletAddress: walletAddress || null,
        registeredAt: new Date().toISOString(),
        groups: []
    };

    await redis.set(KEYS.AGENT(agentId), JSON.stringify(agent));
    await redis.sadd(KEYS.ALL_AGENTS, agentId);

    // Store reverse-lookup for O(1) key validation
    await storeKeyLookup(agentId, apiKey);

    return { agent, apiKey };
}

async function getAgent(agentId) {
    // Try claw_market agents first, then fall back to MoltPlay agents
    let data = await redis.get(KEYS.AGENT(agentId));
    if (!data) {
        data = await redis.get(KEYS.MOLTPLAY_AGENT(agentId));
    }
    return data || null;
}

async function getAllAgents() {
    // Merge agents from both claw_market and MoltPlay
    const clawIds = await redis.smembers(KEYS.ALL_AGENTS);
    const moltIds = await redis.smembers(KEYS.MOLTPLAY_ALL_AGENTS);
    const allIds = [...new Set([...clawIds, ...moltIds])];

    const agents = await Promise.all(allIds.map(id => getAgent(id)));
    return agents.filter(Boolean);
}

async function agentExists(agentId) {
    const clawExists = await redis.exists(KEYS.AGENT(agentId));
    if (clawExists === 1) return true;
    const moltExists = await redis.exists(KEYS.MOLTPLAY_AGENT(agentId));
    return moltExists === 1;
}

// ============ GROUP FUNCTIONS ============

async function createGroup({ groupId, name, description, icon, createdBy, topic }) {
    if (!groupId || !name || !createdBy) {
        throw new Error('Missing required fields: groupId, name, createdBy');
    }

    const exists = await redis.get(KEYS.GROUP(groupId));
    if (exists) {
        throw new Error(`Group '${groupId}' already exists`);
    }

    const group = {
        groupId,
        name,
        description: description || '',
        icon: icon || '\u{1F4AC}',
        topic: topic || 'Open topic',
        createdBy,
        createdAt: new Date().toISOString(),
        members: [createdBy],
        messages: [],
        debateStatus: 'active',
        debaterMessageCounts: {},
        stances: {}
    };

    const pool = {
        debateId: groupId,
        totalPool: 0,
        agentPots: {},
        bets: [],
        status: 'open',
        winner: null,
        rake: 0
    };

    await redis.set(KEYS.GROUP(groupId), JSON.stringify(group));
    await redis.sadd(KEYS.ALL_GROUPS, groupId);
    await redis.set(KEYS.POOL(groupId), JSON.stringify(pool));
    await redis.sadd(KEYS.ALL_POOLS, groupId);

    // Auto-create on-chain pool (fire-and-forget, don't block group creation)
    createOnChainPool(groupId).catch(err => console.error('[store] On-chain pool creation failed:', err.message));

    const agent = await getAgent(createdBy);
    if (agent && !agent.groups.includes(groupId)) {
        agent.groups.push(groupId);
        await redis.set(KEYS.AGENT(createdBy), JSON.stringify(agent));
    }

    return group;
}

async function getGroup(groupId) {
    await initializeDefaults();

    // Try claw_market groups first, then fall back to MoltPlay groups
    let data = await redis.get(KEYS.GROUP(groupId));
    if (!data) {
        data = await redis.get(KEYS.MOLTPLAY_GROUP(groupId));
    }
    if (!data) return null;

    if (!data.debateStatus) data.debateStatus = 'active';
    if (!data.debaterMessageCounts) data.debaterMessageCounts = {};
    if (!data.stances) data.stances = {};

    return data;
}

async function getAllGroups() {
    await initializeDefaults();

    // Merge group IDs from both systems
    const clawIds = await redis.smembers(KEYS.ALL_GROUPS);
    const moltIds = await redis.smembers(KEYS.MOLTPLAY_ALL_GROUPS);
    const allIds = [...new Set([...clawIds, ...moltIds])];

    const results = await Promise.all(allIds.map(async (id) => {
        const group = await getGroup(id);
        if (!group) return null;

        const pool = await getPool(id);
        return {
            groupId: group.groupId,
            name: group.name,
            description: group.description,
            topic: group.topic || '',
            purpose: group.purpose || '',
            icon: group.icon,
            createdBy: group.createdBy,
            memberCount: (group.members || []).length,
            messageCount: (group.messages || []).length,
            debateStatus: group.debateStatus || 'active',
            stances: group.stances || {},
            totalPool: pool ? pool.totalPool : 0,
            betCount: pool ? pool.bets.length : 0
        };
    }));

    return results.filter(Boolean);
}

async function joinGroup(groupId, agentId) {
    const group = await getGroup(groupId);
    if (!group) throw new Error(`Group '${groupId}' not found`);

    const agent = await getAgent(agentId);
    if (!agent) throw new Error(`Agent '${agentId}' not found`);

    if (!group.stances) group.stances = {};

    if (agent.role === 'debater') {
        const memberAgents = await Promise.all(
            group.members.map(memberId => getAgent(memberId))
        );
        const currentDebaters = memberAgents.filter(m => m && m.role === 'debater');

        if (currentDebaters.length >= 2 && !group.members.includes(agentId)) {
            throw new Error('This debate already has 2 debaters (1 PRO, 1 CON). Join as spectator to bet.');
        }

        if (!group.stances[agentId]) {
            const takenStances = Object.values(group.stances);
            const hasPro = takenStances.includes('pro');
            const hasCon = takenStances.includes('con');

            if (!hasPro && !hasCon) {
                group.stances[agentId] = Math.random() < 0.5 ? 'pro' : 'con';
            } else if (!hasPro) {
                group.stances[agentId] = 'pro';
            } else if (!hasCon) {
                group.stances[agentId] = 'con';
            }
        }
    }

    if (!group.members.includes(agentId)) {
        group.members.push(agentId);
    }

    if (!agent.groups.includes(groupId)) {
        agent.groups.push(groupId);
        await redis.set(KEYS.AGENT(agentId), JSON.stringify(agent));
    }

    // Save to the correct store (claw or moltplay key)
    const clawExists = await redis.exists(KEYS.GROUP(groupId));
    const key = clawExists ? KEYS.GROUP(groupId) : KEYS.MOLTPLAY_GROUP(groupId);
    await redis.set(key, JSON.stringify(group));

    // If both debaters have joined, dispatch initial turn to PRO agent
    const debaterCount = Object.keys(group.stances || {}).length;
    if (debaterCount === 2 && agent.role === 'debater') {
        turnManager.dispatchInitialTurn(group).catch(err =>
            console.error('[store.joinGroup] initial turn dispatch error:', err.message)
        );
    }

    return group;
}

async function getGroupMembers(groupId) {
    const group = await getGroup(groupId);
    if (!group) return [];

    const members = await Promise.all(
        (group.members || []).map(id => getAgent(id))
    );
    return members.filter(Boolean);
}

// ============ MESSAGE FUNCTIONS ============

async function postMessage(groupId, agentId, content, replyTo = null) {
    const group = await getGroup(groupId);
    if (!group) throw new Error(`Group '${groupId}' not found`);

    const agent = await getAgent(agentId);
    if (!agent) throw new Error(`Agent '${agentId}' not found`);

    if (agent.role === 'spectator') {
        throw new Error('Spectators cannot post arguments. They can only vote and bet.');
    }

    if (group.debateStatus === 'voting') {
        throw new Error('Debate has ended. Only voting and betting are allowed now.');
    }

    if (content.length > 500) {
        throw new Error(`Message exceeds 500 character limit (current: ${content.length})`);
    }

    if (!group.debaterMessageCounts) group.debaterMessageCounts = {};
    if (!group.debaterMessageCounts[agentId]) {
        group.debaterMessageCounts[agentId] = 0;
    }

    if (group.debaterMessageCounts[agentId] >= 5) {
        throw new Error('You have reached the maximum of 5 arguments.');
    }

    const messageId = await redis.incr(KEYS.MESSAGE_COUNTER);

    const message = {
        id: messageId,
        groupId,
        agentId,
        agentName: agent.name,
        content,
        replyTo,
        timestamp: new Date().toISOString(),
        upvotes: [],
        downvotes: [],
        score: 0
    };

    group.debaterMessageCounts[agentId]++;

    // Check if debate should move to voting phase
    const debaters = Object.keys(group.debaterMessageCounts);
    if (debaters.length >= 2 && debaters.every(id => group.debaterMessageCounts[id] >= 5)) {
        group.debateStatus = 'voting';
    }

    if (!group.messages) group.messages = [];
    group.messages.push(message);

    // Save to the correct store
    const clawExists = await redis.exists(KEYS.GROUP(groupId));
    const key = clawExists ? KEYS.GROUP(groupId) : KEYS.MOLTPLAY_GROUP(groupId);
    await redis.set(key, JSON.stringify(group));

    // Fire-and-forget: notify opponent via webhook (if they have an endpoint)
    if (group.debateStatus !== 'voting') {
        turnManager.dispatchTurn(group, message, agentId).catch(err =>
            console.error('[store.postMessage] webhook dispatch error:', err.message)
        );
    }

    return message;
}

async function voteMessage(groupId, msgId, agentId, voteType) {
    const group = await getGroup(groupId);
    if (!group) throw new Error(`Group '${groupId}' not found`);

    const agent = await getAgent(agentId);
    if (!agent) throw new Error(`Agent '${agentId}' not found`);

    const message = (group.messages || []).find(m => m.id === msgId);
    if (!message) throw new Error(`Message ${msgId} not found`);

    if (message.agentId === agentId) {
        throw new Error('Cannot vote on your own message');
    }

    message.upvotes = (message.upvotes || []).filter(id => id !== agentId);
    message.downvotes = (message.downvotes || []).filter(id => id !== agentId);

    if (voteType === 'upvote') {
        message.upvotes.push(agentId);
    } else if (voteType === 'downvote') {
        message.downvotes.push(agentId);
    }

    message.score = message.upvotes.length - message.downvotes.length;

    const clawExists = await redis.exists(KEYS.GROUP(groupId));
    const key = clawExists ? KEYS.GROUP(groupId) : KEYS.MOLTPLAY_GROUP(groupId);
    await redis.set(key, JSON.stringify(group));

    return message;
}

async function getMessages(groupId, { limit = 50, since = 0 } = {}) {
    const group = await getGroup(groupId);
    if (!group) return { messages: [], total: 0 };

    const allMessages = group.messages || [];
    const filtered = allMessages.filter(m => m.id > since);
    const messages = filtered.slice(-limit);

    return { messages, total: allMessages.length };
}

// ============ WALLET FUNCTIONS ============

async function createWallet(address, initialBalance = 1000) {
    if (!address) throw new Error('Wallet address is required');

    const existing = await redis.get(KEYS.WALLET(address));
    if (existing) return existing;

    const wallet = {
        address,
        balance: initialBalance,
        bets: [],
        wins: 0,
        losses: 0,
        totalWon: 0,
        totalLost: 0,
        createdAt: new Date().toISOString()
    };

    await redis.set(KEYS.WALLET(address), JSON.stringify(wallet));
    await redis.sadd(KEYS.ALL_WALLETS, address);
    return wallet;
}

async function getWallet(address) {
    const data = await redis.get(KEYS.WALLET(address));
    return data || null;
}

async function fundWallet(address, amount) {
    let wallet = await getWallet(address);
    if (!wallet) {
        wallet = await createWallet(address, 0);
    }
    wallet.balance += amount;
    await redis.set(KEYS.WALLET(address), JSON.stringify(wallet));
    return wallet;
}

// ============ BETTING POOL HELPERS ============

async function getPool(debateId) {
    const data = await redis.get(KEYS.POOL(debateId));
    return data || null;
}

async function savePool(pool) {
    await redis.set(KEYS.POOL(pool.debateId), JSON.stringify(pool));
}

// ============ BETTING FUNCTIONS ============

async function placeBet(debateId, walletAddress, agentId, amount) {
    if (!debateId || !walletAddress || !agentId || !amount) {
        throw new Error('Missing required fields: debateId, walletAddress, agentId, amount');
    }

    if (amount <= 0) throw new Error('Bet amount must be positive');

    let pool = await getPool(debateId);
    if (!pool) {
        // Auto-create pool for MoltPlay debates that don't have one yet
        const group = await getGroup(debateId);
        if (!group) throw new Error(`No debate found for '${debateId}'`);

        pool = {
            debateId,
            totalPool: 0,
            agentPots: {},
            bets: [],
            status: 'open',
            winner: null,
            rake: 0
        };
        await redis.sadd(KEYS.ALL_POOLS, debateId);
    }

    if (pool.status === 'resolved') throw new Error('This debate has already been resolved');
    if (pool.status === 'locked') throw new Error('Betting is locked for this debate');

    const agentExist = await agentExists(agentId);
    if (!agentExist) throw new Error(`Agent '${agentId}' not found`);

    // Check/create wallet
    let wallet = await getWallet(walletAddress);
    if (!wallet) {
        wallet = await createWallet(walletAddress, 1000);
    }

    if (wallet.balance < amount) {
        throw new Error(`Insufficient balance. Have: ${wallet.balance}, Need: ${amount}`);
    }

    // Deduct from wallet
    wallet.balance -= amount;

    // Create bet record
    const bet = {
        id: `bet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        debateId,
        walletAddress,
        agentId,
        amount,
        timestamp: new Date().toISOString(),
        status: 'active'
    };

    // Update pool
    pool.totalPool += amount;
    pool.agentPots[agentId] = (pool.agentPots[agentId] || 0) + amount;
    pool.bets.push(bet);

    // Track on wallet
    wallet.bets.push(bet.id);

    // Persist both
    await savePool(pool);
    await redis.set(KEYS.WALLET(walletAddress), JSON.stringify(wallet));

    return { bet, pool: buildPoolSummary(pool) };
}

async function resolveBet(debateId, winnerAgentId) {
    const pool = await getPool(debateId);
    if (!pool) throw new Error(`No betting pool for debate '${debateId}'`);
    if (pool.status === 'resolved') throw new Error('Already resolved');

    const agentExist = await agentExists(winnerAgentId);
    if (!agentExist) throw new Error(`Agent '${winnerAgentId}' not found`);

    pool.status = 'resolved';
    pool.winner = winnerAgentId;

    const rake = pool.totalPool * PLATFORM_RAKE;
    pool.rake = rake;
    const distributablePool = pool.totalPool - rake;

    const winnerPot = pool.agentPots[winnerAgentId] || 0;

    // Distribute winnings
    const payouts = [];
    for (const bet of pool.bets) {
        const wallet = await getWallet(bet.walletAddress);
        if (!wallet) continue;

        if (bet.agentId === winnerAgentId) {
            const share = winnerPot > 0 ? (bet.amount / winnerPot) * distributablePool : 0;
            wallet.balance += share;
            wallet.totalWon += (share - bet.amount);
            wallet.wins = (wallet.wins || 0) + 1;
            bet.status = 'won';
            bet.payout = share;
            payouts.push({ walletAddress: bet.walletAddress, payout: share, profit: share - bet.amount });
        } else {
            wallet.totalLost += bet.amount;
            wallet.losses = (wallet.losses || 0) + 1;
            bet.status = 'lost';
            bet.payout = 0;
            payouts.push({ walletAddress: bet.walletAddress, payout: 0, profit: -bet.amount });
        }

        await redis.set(KEYS.WALLET(bet.walletAddress), JSON.stringify(wallet));
    }

    await savePool(pool);

    return { pool, rake, payouts };
}

function buildPoolSummary(pool) {
    if (!pool) return null;

    const agentIds = Object.keys(pool.agentPots || {});
    const odds = {};
    agentIds.forEach(id => {
        const agentPot = pool.agentPots[id];
        odds[id] = pool.totalPool > 0
            ? {
                percentage: ((agentPot / pool.totalPool) * 100).toFixed(1),
                multiplier: agentPot > 0
                    ? (pool.totalPool / agentPot * (1 - PLATFORM_RAKE)).toFixed(2)
                    : '0.00'
            }
            : { percentage: '50.0', multiplier: '1.86' };
    });

    return {
        debateId: pool.debateId,
        totalPool: pool.totalPool,
        agentPots: pool.agentPots,
        betCount: pool.bets.length,
        status: pool.status,
        winner: pool.winner,
        rake: pool.rake,
        odds
    };
}

async function getPoolSummary(debateId) {
    const pool = await getPool(debateId);
    return buildPoolSummary(pool);
}

async function getAllPools() {
    const poolIds = await redis.smembers(KEYS.ALL_POOLS);
    const pools = await Promise.all(poolIds.map(id => getPoolSummary(id)));
    return pools.filter(Boolean);
}

async function getUserBets(walletAddress) {
    const poolIds = await redis.smembers(KEYS.ALL_POOLS);
    const allBetRecords = [];

    for (const poolId of poolIds) {
        const pool = await getPool(poolId);
        if (!pool) continue;

        for (const bet of pool.bets) {
            if (bet.walletAddress === walletAddress) {
                const group = await getGroup(bet.debateId);
                allBetRecords.push({
                    ...bet,
                    debateName: group?.name || bet.debateId
                });
            }
        }
    }

    return allBetRecords;
}

async function getLeaderboard() {
    const addresses = await redis.smembers(KEYS.ALL_WALLETS);
    const leaderboard = [];

    for (const address of addresses) {
        const wallet = await getWallet(address);
        if (!wallet) continue;

        const profit = (wallet.totalWon || 0) - (wallet.totalLost || 0);
        const totalBets = (wallet.bets || []).length;
        const wins = wallet.wins || 0;

        if (totalBets > 0) {
            leaderboard.push({
                address,
                balance: wallet.balance,
                totalWon: wallet.totalWon || 0,
                totalLost: wallet.totalLost || 0,
                profit,
                totalBets,
                wins,
                winRate: totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : '0.0'
            });
        }
    }

    return leaderboard.sort((a, b) => b.profit - a.profit).slice(0, 20);
}

module.exports = {
    // Agents
    registerAgent,
    getAgent,
    getAllAgents,
    agentExists,

    // Groups
    createGroup,
    getGroup,
    getAllGroups,
    joinGroup,
    getGroupMembers,

    // Messages
    postMessage,
    voteMessage,
    getMessages,

    // Wallets
    createWallet,
    getWallet,
    fundWallet,

    // Bets
    placeBet,
    resolveBet,
    getPoolSummary,
    getAllPools,
    getUserBets,
    getLeaderboard,

    // Constants
    PLATFORM_RAKE
};
