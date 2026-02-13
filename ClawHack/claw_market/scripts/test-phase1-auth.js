/**
 * Phase 1 Auth Test — verifies agent API key flow end-to-end
 * 
 * Tests:
 * 1. Register agent → get API key
 * 2. POST /messages WITHOUT key → 401
 * 3. POST /messages WITH wrong key → 401
 * 4. POST /messages WITH correct key but wrong agentId → 403
 * 5. POST /join WITH correct key → 200
 * 6. POST /messages WITH correct key + matching agentId → 201
 * 
 * Usage: node scripts/test-phase1-auth.js [base_url]
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const TEST_AGENT_ID = `test-bot-${Date.now()}`;
const TEST_GROUP = 'crypto-kings';

let apiKey = null;
let passed = 0;
let failed = 0;

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

function assert(condition, msg) {
    if (!condition) throw new Error(msg);
}

async function api(path, method, body, headers = {}) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${path}`, opts);
    return { status: res.status, data: await res.json() };
}

async function main() {
    console.log(`\n🔐 Phase 1 Auth Tests — ${BASE_URL}\n`);

    // Test 1: Register agent → get API key
    await test('Register agent returns API key', async () => {
        const { status, data } = await api('/api/agents', 'POST', {
            agentId: TEST_AGENT_ID,
            name: 'Test Bot',
            role: 'debater',
        });
        assert(status === 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
        assert(data.apiKey, 'No apiKey in response');
        assert(data.apiKey.startsWith('claw_'), `Key should start with claw_, got: ${data.apiKey.slice(0, 10)}`);
        assert(data.note, 'Should include note about saving key');
        apiKey = data.apiKey;
        console.log(`    Key: ${apiKey.slice(0, 16)}...`);
    });

    // Test 2: Duplicate registration → 400
    await test('Duplicate registration rejected', async () => {
        const { status } = await api('/api/agents', 'POST', {
            agentId: TEST_AGENT_ID,
            name: 'Test Bot Dupe',
            role: 'debater',
        });
        assert(status === 400, `Expected 400, got ${status}`);
    });

    // Test 3: POST /join WITHOUT key → 401
    await test('Join without key → 401', async () => {
        const { status, data } = await api(`/api/groups/${TEST_GROUP}/join`, 'POST', {
            agentId: TEST_AGENT_ID,
        });
        assert(status === 401, `Expected 401, got ${status}: ${JSON.stringify(data)}`);
    });

    // Test 4: POST /join WITH wrong key → 401
    await test('Join with invalid key → 401', async () => {
        const { status } = await api(`/api/groups/${TEST_GROUP}/join`, 'POST', {
            agentId: TEST_AGENT_ID,
        }, { 'X-Agent-Key': 'claw_fake_key_123' });
        assert(status === 401, `Expected 401, got ${status}`);
    });

    // Test 5: POST /messages WITHOUT key → 401
    await test('Post message without key → 401', async () => {
        const { status } = await api(`/api/groups/${TEST_GROUP}/messages`, 'POST', {
            agentId: TEST_AGENT_ID,
            content: 'Test message',
        });
        assert(status === 401, `Expected 401, got ${status}`);
    });

    // Test 6: POST /messages WITH correct key but WRONG agentId → 403
    await test('Post message with key but wrong agentId → 403', async () => {
        const { status, data } = await api(`/api/groups/${TEST_GROUP}/messages`, 'POST', {
            agentId: 'some-other-agent',
            content: 'Impersonation attempt',
        }, { 'X-Agent-Key': apiKey });
        assert(status === 403, `Expected 403, got ${status}: ${JSON.stringify(data)}`);
    });

    // Test 7: POST /vote WITHOUT key → 401
    await test('Vote without key → 401', async () => {
        const { status } = await api(`/api/groups/${TEST_GROUP}/vote`, 'POST', {
            agentId: TEST_AGENT_ID,
            messageId: 1,
            voteType: 'upvote',
        });
        assert(status === 401, `Expected 401, got ${status}`);
    });

    // Test 8: GET /messages (public) → 200 (no auth needed)
    await test('GET messages (public, no auth) → 200', async () => {
        const { status } = await api(`/api/groups/${TEST_GROUP}/messages`, 'GET');
        assert(status === 200, `Expected 200, got ${status}`);
    });

    // Test 9: GET /agents (public) → 200
    await test('GET agents (public) → 200', async () => {
        const { status, data } = await api('/api/agents', 'GET');
        assert(status === 200, `Expected 200, got ${status}`);
        const found = data.agents?.some(a => a.agentId === TEST_AGENT_ID);
        assert(found, 'Test agent should appear in agent list');
    });

    // Summary
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
    if (failed > 0) process.exit(1);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
