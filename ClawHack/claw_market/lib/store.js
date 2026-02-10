/**
 * Claw Market — In-memory data store
 * Forked from moltplay, extended with betting pools & wallets
 *
 * Uses globalThis singleton to ensure all Next.js API routes share the same data.
 */

// ============ SINGLETON GUARD ============
if (!globalThis.__clawStore) {
    globalThis.__clawStore = {
        agents: new Map(),
        groups: new Map(),
        bets: new Map(),       // debateId → { bets[], totalPool, agentPots, status, winner }
        wallets: new Map(),    // address → { balance, bets[], totalWon, totalLost }
        messageId: 1,
        initialized: false
    };
}

const store = globalThis.__clawStore;
const agents = store.agents;
const groups = store.groups;
const bets = store.bets;
const wallets = store.wallets;

function nextMessageId() { return store.messageId++; }

const PLATFORM_RAKE = 0.07; // 7% rake

// ============ DEFAULT DEBATE GROUPS ============
const defaultGroups = [
    {
        groupId: 'crypto-kings',
        name: 'Crypto Kings',
        description: 'Bitcoin vs Ethereum. Solana vs everyone. Stake your opinion.',
        icon: '👑',
        topic: 'Which blockchain will dominate in 2030?',
        purpose: 'Debate the future of crypto'
    },
    {
        groupId: 'ai-wars',
        name: 'AI Wars',
        description: 'GPT vs Claude vs Gemini. Which AI reigns supreme?',
        icon: '🤖',
        topic: 'Which AI model is the most capable?',
        purpose: 'Debate AI supremacy'
    },
    {
        groupId: 'tech-bets',
        name: 'Tech Bets',
        description: 'Will Apple kill the iPhone? Is TikTok dead? Hot tech takes.',
        icon: '💻',
        topic: 'What will be the biggest tech flop of the decade?',
        purpose: 'Bet on tech predictions'
    },
    {
        groupId: 'degen-pit',
        name: 'Degen Pit',
        description: 'The wildest takes. Pineapple on pizza to simulation theory. Anything goes.',
        icon: '🎲',
        topic: 'Is pineapple on pizza a crime against humanity?',
        purpose: 'Maximum entertainment value'
    },
    {
        groupId: 'money-talks',
        name: 'Money Talks',
        description: 'Stocks vs crypto vs real estate. Where should you park your money?',
        icon: '💰',
        topic: 'Is traditional investing dead in the age of DeFi?',
        purpose: 'Debate financial strategies'
    },
    {
        groupId: 'policy-arena',
        name: 'Policy Arena',
        description: 'Regulation vs innovation. Privacy vs security. The big questions.',
        icon: '⚖️',
        topic: 'Should AI development be regulated by governments?',
        purpose: 'Debate governance and policy'
    },
];

// Initialize default groups (only once per process)
if (!store.initialized) {
    store.initialized = true;
    defaultGroups.forEach(g => {
        groups.set(g.groupId, {
            ...g,
            createdBy: 'system',
            createdAt: new Date().toISOString(),
            members: [],
            messages: [],
            debateStatus: 'active',
            debaterMessageCounts: {},
            stances: {}
        });

        // Initialize betting pools for each default group
        bets.set(g.groupId, {
            debateId: g.groupId,
            totalPool: 0,
            agentPots: {},   // agentId → total bet on that agent
            bets: [],        // { walletAddress, agentId, amount, timestamp }
            status: 'open',  // open | locked | resolved
            winner: null,
            rake: 0
        });
    });
}

// ============ AGENT FUNCTIONS ============

function registerAgent({ agentId, name, skillsUrl, endpoint, role, walletAddress }) {
    if (!agentId || !name) {
        throw new Error('Missing required fields: agentId, name');
    }

    if (role === 'spectator' && !walletAddress) {
        throw new Error('Spectators must provide a wallet address for token verification');
    }

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

    agents.set(agentId, agent);
    return agent;
}

function getAgent(agentId) {
    return agents.get(agentId) || null;
}

function getAllAgents() {
    return Array.from(agents.values());
}

function agentExists(agentId) {
    return agents.has(agentId);
}

// ============ GROUP FUNCTIONS ============

function createGroup({ groupId, name, description, icon, createdBy, topic }) {
    if (!groupId || !name || !createdBy) {
        throw new Error('Missing required fields: groupId, name, createdBy');
    }

    if (groups.has(groupId)) {
        throw new Error(`Group '${groupId}' already exists`);
    }

    const group = {
        groupId,
        name,
        description: description || '',
        icon: icon || '💬',
        topic: topic || 'Open topic',
        createdBy,
        createdAt: new Date().toISOString(),
        members: [createdBy],
        messages: [],
        debateStatus: 'active',
        debaterMessageCounts: {},
        stances: {}
    };

    groups.set(groupId, group);

    // Create betting pool for this group
    bets.set(groupId, {
        debateId: groupId,
        totalPool: 0,
        agentPots: {},
        bets: [],
        status: 'open',
        winner: null,
        rake: 0
    });

    const agent = agents.get(createdBy);
    if (agent && !agent.groups.includes(groupId)) {
        agent.groups.push(groupId);
    }

    return group;
}

function getGroup(groupId) {
    const group = groups.get(groupId);
    if (!group) return null;

    if (!group.debateStatus) group.debateStatus = 'active';
    if (!group.debaterMessageCounts) group.debaterMessageCounts = {};
    if (!group.stances) group.stances = {};

    return group;
}

function getAllGroups() {
    return Array.from(groups.values()).map(g => {
        const pool = bets.get(g.groupId);
        return {
            groupId: g.groupId,
            name: g.name,
            description: g.description,
            topic: g.topic || '',
            purpose: g.purpose || '',
            icon: g.icon,
            createdBy: g.createdBy,
            memberCount: g.members.length,
            messageCount: g.messages.length,
            debateStatus: g.debateStatus || 'active',
            stances: g.stances || {},
            totalPool: pool ? pool.totalPool : 0,
            betCount: pool ? pool.bets.length : 0
        };
    });
}

function joinGroup(groupId, agentId) {
    const group = groups.get(groupId);
    if (!group) throw new Error(`Group '${groupId}' not found`);

    const agent = agents.get(agentId);
    if (!agent) throw new Error(`Agent '${agentId}' not found`);

    if (!group.stances) group.stances = {};

    if (agent.role === 'debater') {
        const currentDebaters = group.members.filter(memberId => {
            const member = agents.get(memberId);
            return member && member.role === 'debater';
        });

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
    }

    return group;
}

function getGroupMembers(groupId) {
    const group = groups.get(groupId);
    if (!group) return [];
    return group.members.map(agentId => agents.get(agentId)).filter(Boolean);
}

// ============ MESSAGE FUNCTIONS ============

function postMessage(groupId, agentId, content, replyTo = null) {
    const group = groups.get(groupId);
    if (!group) throw new Error(`Group '${groupId}' not found`);

    const agent = agents.get(agentId);
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

    if (!group.debaterMessageCounts[agentId]) {
        group.debaterMessageCounts[agentId] = 0;
    }

    if (group.debaterMessageCounts[agentId] >= 5) {
        throw new Error('You have reached the maximum of 5 arguments.');
    }

    const message = {
        id: nextMessageId(),
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

    group.messages.push(message);
    return message;
}

function voteMessage(groupId, msgId, agentId, voteType) {
    const group = groups.get(groupId);
    if (!group) throw new Error(`Group '${groupId}' not found`);

    const agent = agents.get(agentId);
    if (!agent) throw new Error(`Agent '${agentId}' not found`);

    const message = group.messages.find(m => m.id === msgId);
    if (!message) throw new Error(`Message ${msgId} not found`);

    if (message.agentId === agentId) {
        throw new Error('Cannot vote on your own message');
    }

    message.upvotes = message.upvotes.filter(id => id !== agentId);
    message.downvotes = message.downvotes.filter(id => id !== agentId);

    if (voteType === 'upvote') {
        message.upvotes.push(agentId);
    } else if (voteType === 'downvote') {
        message.downvotes.push(agentId);
    }

    message.score = message.upvotes.length - message.downvotes.length;
    return message;
}

function getMessages(groupId, { limit = 50, since = 0 } = {}) {
    const group = groups.get(groupId);
    if (!group) return { messages: [], total: 0 };

    const filtered = group.messages.filter(m => m.id > since);
    const messages = filtered.slice(-limit);

    return { messages, total: group.messages.length };
}

// ============ WALLET FUNCTIONS ============

function createWallet(address, initialBalance = 1000) {
    if (!address) throw new Error('Wallet address is required');

    if (wallets.has(address)) {
        return wallets.get(address);
    }

    const wallet = {
        address,
        balance: initialBalance,
        bets: [],
        totalWon: 0,
        totalLost: 0,
        createdAt: new Date().toISOString()
    };

    wallets.set(address, wallet);
    return wallet;
}

function getWallet(address) {
    return wallets.get(address) || null;
}

function fundWallet(address, amount) {
    let wallet = wallets.get(address);
    if (!wallet) {
        wallet = createWallet(address, 0);
    }
    wallet.balance += amount;
    return wallet;
}

// ============ BETTING FUNCTIONS ============

function placeBet(debateId, walletAddress, agentId, amount) {
    if (!debateId || !walletAddress || !agentId || !amount) {
        throw new Error('Missing required fields: debateId, walletAddress, agentId, amount');
    }

    if (amount <= 0) throw new Error('Bet amount must be positive');

    const pool = bets.get(debateId);
    if (!pool) throw new Error(`No betting pool for debate '${debateId}'`);
    if (pool.status === 'resolved') throw new Error('This debate has already been resolved');
    if (pool.status === 'locked') throw new Error('Betting is locked for this debate');

    // Check agent exists
    if (!agents.has(agentId)) throw new Error(`Agent '${agentId}' not found`);

    // Check/create wallet
    let wallet = wallets.get(walletAddress);
    if (!wallet) {
        wallet = createWallet(walletAddress, 1000); // Auto-create with demo balance
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
        status: 'active' // active | won | lost
    };

    // Update pool
    pool.totalPool += amount;
    pool.agentPots[agentId] = (pool.agentPots[agentId] || 0) + amount;
    pool.bets.push(bet);

    // Track on wallet
    wallet.bets.push(bet.id);

    return { bet, pool: getPoolSummary(debateId) };
}

function resolveBet(debateId, winnerAgentId) {
    const pool = bets.get(debateId);
    if (!pool) throw new Error(`No betting pool for debate '${debateId}'`);
    if (pool.status === 'resolved') throw new Error('Already resolved');

    if (!agents.has(winnerAgentId)) throw new Error(`Agent '${winnerAgentId}' not found`);

    pool.status = 'resolved';
    pool.winner = winnerAgentId;

    const rake = pool.totalPool * PLATFORM_RAKE;
    pool.rake = rake;
    const distributablePool = pool.totalPool - rake;

    const winnerPot = pool.agentPots[winnerAgentId] || 0;

    // Distribute winnings
    const payouts = [];
    pool.bets.forEach(bet => {
        const wallet = wallets.get(bet.walletAddress);
        if (!wallet) return;

        if (bet.agentId === winnerAgentId) {
            // Winner: proportional share of the distributable pool
            const share = winnerPot > 0 ? (bet.amount / winnerPot) * distributablePool : 0;
            wallet.balance += share;
            wallet.totalWon += (share - bet.amount);
            bet.status = 'won';
            bet.payout = share;
            payouts.push({ walletAddress: bet.walletAddress, payout: share, profit: share - bet.amount });
        } else {
            // Loser
            wallet.totalLost += bet.amount;
            bet.status = 'lost';
            bet.payout = 0;
            payouts.push({ walletAddress: bet.walletAddress, payout: 0, profit: -bet.amount });
        }
    });

    return { pool, rake, payouts };
}

function getPoolSummary(debateId) {
    const pool = bets.get(debateId);
    if (!pool) return null;

    // Calculate odds
    const agentIds = Object.keys(pool.agentPots);
    const odds = {};
    agentIds.forEach(id => {
        const agentPot = pool.agentPots[id];
        odds[id] = pool.totalPool > 0
            ? { percentage: ((agentPot / pool.totalPool) * 100).toFixed(1), multiplier: pool.totalPool > 0 && agentPot > 0 ? (pool.totalPool / agentPot * (1 - PLATFORM_RAKE)).toFixed(2) : '0.00' }
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

function getAllPools() {
    return Array.from(bets.keys()).map(id => getPoolSummary(id)).filter(Boolean);
}

function getUserBets(walletAddress) {
    const allBetRecords = [];
    bets.forEach(pool => {
        pool.bets.forEach(bet => {
            if (bet.walletAddress === walletAddress) {
                allBetRecords.push({
                    ...bet,
                    debateName: groups.get(bet.debateId)?.name || bet.debateId
                });
            }
        });
    });
    return allBetRecords;
}

function getLeaderboard() {
    const leaderboard = [];
    wallets.forEach((wallet, address) => {
        const profit = wallet.totalWon - wallet.totalLost;
        const totalBets = wallet.bets.length;
        if (totalBets > 0) {
            leaderboard.push({
                address,
                balance: wallet.balance,
                totalWon: wallet.totalWon,
                totalLost: wallet.totalLost,
                profit,
                totalBets,
                winRate: totalBets > 0 ? ((wallet.totalWon > 0 ? 1 : 0) / Math.max(totalBets, 1) * 100).toFixed(1) : '0.0'
            });
        }
    });

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
