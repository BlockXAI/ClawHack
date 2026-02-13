/**
 * Phase 4 Test — verify off-chain betting is dead, on-chain remains
 *
 * Usage: node scripts/test-phase4-onchain.js [base_url]
 */

const BASE_URL = process.argv[2] || 'https://clawmarket-jet.vercel.app';
let passed = 0;
let failed = 0;

async function api(path, method, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${path}`, opts);
    return { status: res.status, data: await res.json() };
}

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (e) {
        console.log(`  ❌ ${name}: ${e.message}`);
        failed++;
    }
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }

async function main() {
    console.log(`\n⛓  Phase 4 Off-Chain Kill Test — ${BASE_URL}\n`);

    // Deprecated endpoints should return 410 Gone
    await test('POST /api/wallet/connect → 410', async () => {
        const r = await api('/api/wallet/connect', 'POST', { address: '0xtest' });
        assert(r.status === 410, `Got ${r.status}: ${JSON.stringify(r.data)}`);
    });

    await test('POST /api/wallet/faucet → 410', async () => {
        const r = await api('/api/wallet/faucet', 'POST', { address: '0xtest' });
        assert(r.status === 410, `Got ${r.status}: ${JSON.stringify(r.data)}`);
    });

    await test('GET /api/wallet → 410', async () => {
        const r = await api('/api/wallet?address=0xtest', 'GET');
        assert(r.status === 410, `Got ${r.status}: ${JSON.stringify(r.data)}`);
    });

    await test('POST /api/bets → 410', async () => {
        const r = await api('/api/bets', 'POST', {
            walletAddress: '0x1', debateId: 'x', agentId: 'a', amount: 1
        });
        assert(r.status === 410, `Got ${r.status}: ${JSON.stringify(r.data)}`);
    });

    await test('GET /api/bets → 200 (on-chain info)', async () => {
        const r = await api('/api/bets', 'GET');
        assert(r.status === 200, `Got ${r.status}`);
        assert(r.data.contract, 'Should return contract address');
        assert(r.data.agentAddresses, 'Should return agent addresses');
    });

    await test('GET /api/leaderboard → 410', async () => {
        const r = await api('/api/leaderboard', 'GET');
        assert(r.status === 410, `Got ${r.status}: ${JSON.stringify(r.data)}`);
    });

    // Core app endpoints should still work
    await test('GET /api/groups → 200', async () => {
        const r = await api('/api/groups', 'GET');
        assert(r.status === 200, `Got ${r.status}`);
        assert(Array.isArray(r.data.groups), 'Should return groups array');
        console.log(`    ${r.data.groups.length} groups`);
    });

    await test('GET /api/agents → 200', async () => {
        const r = await api('/api/agents', 'GET');
        assert(r.status === 200, `Got ${r.status}`);
        assert(Array.isArray(r.data.agents), 'Should return agents array');
        console.log(`    ${r.data.agents.length} agents`);
    });

    await test('GET /api/groups/crypto-kings/messages → 200', async () => {
        const r = await api('/api/groups/crypto-kings/messages', 'GET');
        assert(r.status === 200, `Got ${r.status}`);
    });

    console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
    if (failed > 0) process.exit(1);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
