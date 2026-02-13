/**
 * Seed AI debate agents into all markets using OpenAI
 * 
 * Usage: node scripts/seed-agents.js
 * 
 * Requires: OPENAI_API_KEY env var or pass as argument
 * Targets the live Vercel deployment API
 */

const OpenAI = require('openai');

const BASE_URL = process.env.API_URL || 'https://clawmarket-jet.vercel.app';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) { console.error('Set OPENAI_API_KEY env var'); process.exit(1); }

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Agent definitions — 2 debaters per group
const AGENTS = [
    // Crypto Kings
    { agentId: 'satoshi-max', name: 'Satoshi Maximalist', group: 'crypto-kings', stance: 'pro', personality: 'A passionate Bitcoin maximalist who believes BTC is the only true decentralized currency. Uses technical analysis and game theory arguments.' },
    { agentId: 'vitalik-fan', name: 'ETH Evangelist', group: 'crypto-kings', stance: 'con', personality: 'An Ethereum enthusiast who believes smart contract platforms will dominate. Argues for programmable money and DeFi ecosystems.' },

    // AI Wars
    { agentId: 'gpt-advocate', name: 'GPT Advocate', group: 'ai-wars', stance: 'pro', personality: 'Champions OpenAI and GPT models as the most capable. Cites benchmarks, reasoning ability, and real-world deployment scale.' },
    { agentId: 'claude-defender', name: 'Claude Defender', group: 'ai-wars', stance: 'con', personality: 'Argues Claude is superior due to safety, honesty, and nuanced reasoning. Values alignment and thoughtful responses over raw speed.' },

    // Tech Bets
    { agentId: 'tech-bull', name: 'Tech Optimist', group: 'tech-bets', stance: 'pro', personality: 'Believes current tech giants will adapt and survive. Points to their massive R&D budgets, data moats, and ecosystem lock-in.' },
    { agentId: 'tech-bear', name: 'Disruption Prophet', group: 'tech-bets', stance: 'con', personality: 'Argues that incumbents always fall. Cites history of Nokia, Blackberry, Yahoo. Believes AI startups will eat big tech.' },

    // Degen Pit
    { agentId: 'chaos-agent', name: 'Chaos Theory', group: 'degen-pit', stance: 'pro', personality: 'Absolute degen energy. Makes wild but weirdly compelling arguments. Uses meme logic and contrarian takes. Pro pineapple pizza.' },
    { agentId: 'order-agent', name: 'Voice of Reason', group: 'degen-pit', stance: 'con', personality: 'The straight man in a comedy duo. Uses actual logic and culinary science to argue against pineapple pizza. Deadpan humor.' },

    // Money Talks
    { agentId: 'defi-degen', name: 'DeFi Maximalist', group: 'money-talks', stance: 'pro', personality: 'All-in on DeFi yields, liquidity mining, and on-chain finance. Thinks traditional finance is dead. Speaks in APY percentages.' },
    { agentId: 'tradfi-sage', name: 'TradFi Sage', group: 'money-talks', stance: 'con', personality: 'A seasoned traditional investor. Argues for diversification, risk management, and time-tested strategies. Skeptical of crypto yields.' },

    // Policy Arena
    { agentId: 'regulate-now', name: 'The Regulator', group: 'policy-arena', stance: 'pro', personality: 'Argues AI must be regulated immediately. Cites existential risk, job displacement, deepfakes, and algorithmic bias as urgent threats.' },
    { agentId: 'innovate-free', name: 'Innovation First', group: 'policy-arena', stance: 'con', personality: 'Opposes premature regulation. Argues it stifles innovation, that market forces self-correct, and that the US will lose its AI lead.' },
];

// Group topics for context
const GROUP_TOPICS = {
    'crypto-kings': 'Which blockchain will dominate in 2030?',
    'ai-wars': 'Which AI model is the most capable?',
    'tech-bets': 'What will be the biggest tech flop of the decade?',
    'degen-pit': 'Is pineapple on pizza a crime against humanity?',
    'money-talks': 'Is traditional investing dead in the age of DeFi?',
    'policy-arena': 'Should AI development be regulated by governments?',
};

// Store API keys per agent for authenticated calls
const agentKeys = {};

async function apiCall(path, method = 'GET', body = null, agentId = null) {
    const headers = { 'Content-Type': 'application/json' };

    // Attach agent API key if we have one for this agent
    if (agentId && agentKeys[agentId]) {
        headers['X-Agent-Key'] = agentKeys[agentId];
    }

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${BASE_URL}${path}`, opts);
    const data = await res.json();

    if (!res.ok) {
        throw new Error(`API ${method} ${path}: ${data.error || res.statusText}`);
    }
    return data;
}

async function generateArguments(agent, topic, round, previousMessages = []) {
    const stanceLabel = agent.stance === 'pro' ? 'FOR (PRO)' : 'AGAINST (CON)';

    const contextMessages = previousMessages.length > 0
        ? `\n\nPrevious arguments in this debate:\n${previousMessages.map(m => `- ${m.agentName} (${m.stance}): ${m.content}`).join('\n')}`
        : '';

    const prompt = `You are "${agent.name}" in a debate prediction market.
Personality: ${agent.personality}
Arguing ${stanceLabel}: "${topic}"
Round ${round}/5.${contextMessages}

STRICT RULES:
- Response MUST be under 280 characters (like a tweet)
- No quotes around response
- Don't start with "As a..." or "I believe..."
- Be punchy and persuasive
- ${round > 1 ? 'Counter previous arguments.' : 'Open with your best take.'}`;

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 120,
        temperature: 0.9,
    });

    return completion.choices[0].message.content.trim();
}

async function seedGroup(groupId) {
    const topic = GROUP_TOPICS[groupId];
    const agents = AGENTS.filter(a => a.group === groupId);
    const proAgent = agents.find(a => a.stance === 'pro');
    const conAgent = agents.find(a => a.stance === 'con');

    if (!proAgent || !conAgent) {
        console.error(`  ✗ Missing agents for ${groupId}`);
        return;
    }

    console.log(`\n📢 Seeding "${groupId}" — Topic: ${topic}`);

    // 1. Register agents (capture API keys)
    for (const agent of agents) {
        try {
            const result = await apiCall('/api/agents', 'POST', {
                agentId: agent.agentId,
                name: agent.name,
                role: 'debater',
            });
            if (result.apiKey) {
                agentKeys[agent.agentId] = result.apiKey;
            }
            console.log(`  ✓ Registered agent: ${agent.name} (key: ${result.apiKey ? result.apiKey.slice(0, 12) + '...' : 'n/a'})`);
        } catch (e) {
            if (e.message.includes('already')) {
                console.log(`  ○ Agent already exists: ${agent.name}`);
                // Re-derive key deterministically for existing agents
                const crypto = require('crypto');
                const secret = process.env.AGENT_KEY_SECRET || 'dev-secret-change-me';
                const hmac = crypto.createHmac('sha256', secret);
                hmac.update(agent.agentId);
                agentKeys[agent.agentId] = 'claw_' + hmac.digest('hex');
            } else {
                console.error(`  ✗ Register failed: ${e.message}`);
            }
        }
    }

    // 2. Join agents to group (authenticated)
    for (const agent of agents) {
        try {
            const result = await apiCall(`/api/groups/${groupId}/join`, 'POST', {
                agentId: agent.agentId,
            }, agent.agentId);
            console.log(`  ✓ ${agent.name} joined as ${result.stance || agent.stance}`);
        } catch (e) {
            if (e.message.includes('already') || e.message.includes('2 debaters')) {
                console.log(`  ○ ${agent.name} already in group`);
            } else {
                console.error(`  ✗ Join failed: ${e.message}`);
            }
        }
    }

    // 3. Generate and post 5 rounds of debate
    const postedMessages = [];

    for (let round = 1; round <= 5; round++) {
        console.log(`  💬 Round ${round}/5...`);

        // PRO argues (authenticated)
        try {
            const proArg = await generateArguments(proAgent, topic, round, postedMessages);
            await apiCall(`/api/groups/${groupId}/messages`, 'POST', {
                agentId: proAgent.agentId,
                content: proArg,
            }, proAgent.agentId);
            postedMessages.push({ agentName: proAgent.name, stance: 'PRO', content: proArg });
            console.log(`    PRO (${proAgent.name}): ${proArg.substring(0, 80)}...`);
        } catch (e) {
            console.error(`    ✗ PRO message failed: ${e.message}`);
        }

        // CON argues (authenticated)
        try {
            const conArg = await generateArguments(conAgent, topic, round, postedMessages);
            await apiCall(`/api/groups/${groupId}/messages`, 'POST', {
                agentId: conAgent.agentId,
                content: conArg,
            }, conAgent.agentId);
            postedMessages.push({ agentName: conAgent.name, stance: 'CON', content: conArg });
            console.log(`    CON (${conAgent.name}): ${conArg.substring(0, 80)}...`);
        } catch (e) {
            console.error(`    ✗ CON message failed: ${e.message}`);
        }

        // Small delay between rounds
        await new Promise(r => setTimeout(r, 500));
    }

    console.log(`  ✅ ${groupId} seeded with ${postedMessages.length} messages`);
}

async function main() {
    console.log('🚀 Claw Market — AI Agent Seeder');
    console.log(`   Target: ${BASE_URL}`);
    console.log(`   Groups: ${Object.keys(GROUP_TOPICS).length}`);
    console.log(`   Agents: ${AGENTS.length}`);
    console.log('');

    // Verify API is reachable
    try {
        const groups = await apiCall('/api/groups');
        console.log(`✓ API reachable — ${groups.groups?.length || 0} groups found`);
    } catch (e) {
        console.error(`✗ API unreachable: ${e.message}`);
        console.error('  Make sure the site is deployed and REDIS_URL is configured.');
        process.exit(1);
    }

    // Seed each group
    for (const groupId of Object.keys(GROUP_TOPICS)) {
        await seedGroup(groupId);
    }

    console.log('\n🎉 All groups seeded! Agents are now debating.');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
