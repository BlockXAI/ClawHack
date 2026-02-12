/**
 * Re-seed groups that failed due to character limit
 * Targets: money-talks, policy-arena (and any others with < 10 messages)
 */

const OpenAI = require('openai');

const BASE_URL = process.env.API_URL || 'https://clawmarket-jet.vercel.app';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) { console.error('Set OPENAI_API_KEY env var'); process.exit(1); }

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const GROUPS_TO_RESEED = [
    {
        groupId: 'money-talks',
        topic: 'Is traditional investing dead in the age of DeFi?',
        pro: { agentId: 'defi-degen', name: 'DeFi Maximalist', personality: 'All-in on DeFi yields and on-chain finance. Thinks traditional finance is dead.' },
        con: { agentId: 'tradfi-sage', name: 'TradFi Sage', personality: 'Seasoned traditional investor. Argues for diversification and time-tested strategies.' },
    },
    {
        groupId: 'policy-arena',
        topic: 'Should AI development be regulated by governments?',
        pro: { agentId: 'regulate-now', name: 'The Regulator', personality: 'Argues AI must be regulated. Cites existential risk, job displacement, deepfakes.' },
        con: { agentId: 'innovate-free', name: 'Innovation First', personality: 'Opposes premature regulation. Market forces self-correct. US will lose AI lead.' },
    },
];

async function apiCall(path, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(`${method} ${path}: ${data.error || res.statusText}`);
    return data;
}

async function genArg(agent, topic, round, stance, prev) {
    const label = stance === 'pro' ? 'FOR' : 'AGAINST';
    const ctx = prev.length > 0 ? `\nPrevious: ${prev.map(m => `${m.name}: ${m.text}`).join(' | ')}` : '';

    const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
            role: 'user',
            content: `You are "${agent.name}". ${agent.personality}. Argue ${label}: "${topic}". Round ${round}/5.${ctx}\n\nWrite ONE punchy argument. MUST be under 250 characters. No quotes. No "I believe". Go:`
        }],
        max_tokens: 100,
        temperature: 0.85,
    });

    let text = resp.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
    if (text.length > 490) text = text.substring(0, 490);
    return text;
}

async function main() {
    console.log('🔄 Re-seeding failed groups...\n');

    for (const group of GROUPS_TO_RESEED) {
        console.log(`📢 ${group.groupId}: ${group.topic}`);

        // Check current message count
        try {
            const msgData = await apiCall(`/api/groups/${group.groupId}/messages`);
            const currentCount = msgData.count || 0;
            console.log(`   Current messages: ${currentCount}`);

            // Check how many each debater has posted
            const proMsgs = (msgData.messages || []).filter(m => m.agentId === group.pro.agentId).length;
            const conMsgs = (msgData.messages || []).filter(m => m.agentId === group.con.agentId).length;
            console.log(`   ${group.pro.name}: ${proMsgs}/5 msgs | ${group.con.name}: ${conMsgs}/5 msgs`);

            const prev = [];

            for (let round = proMsgs + 1; round <= 5; round++) {
                console.log(`   💬 PRO round ${round}...`);
                try {
                    const arg = await genArg(group.pro, group.topic, round, 'pro', prev);
                    await apiCall(`/api/groups/${group.groupId}/messages`, 'POST', { agentId: group.pro.agentId, content: arg });
                    prev.push({ name: group.pro.name, text: arg });
                    console.log(`      ✓ ${arg.substring(0, 70)}...`);
                } catch (e) {
                    console.log(`      ✗ ${e.message}`);
                }
            }

            for (let round = conMsgs + 1; round <= 5; round++) {
                console.log(`   💬 CON round ${round}...`);
                try {
                    const arg = await genArg(group.con, group.topic, round, 'con', prev);
                    await apiCall(`/api/groups/${group.groupId}/messages`, 'POST', { agentId: group.con.agentId, content: arg });
                    prev.push({ name: group.con.name, text: arg });
                    console.log(`      ✓ ${arg.substring(0, 70)}...`);
                } catch (e) {
                    console.log(`      ✗ ${e.message}`);
                }
            }

        } catch (e) {
            console.error(`   ✗ Failed: ${e.message}`);
        }

        console.log('');
    }

    console.log('✅ Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
