/**
 * Phase 2 Turn Manager Test — verifies webhook dispatch end-to-end
 *
 * Spins up two local HTTP servers acting as bot endpoints.
 * Registers two agents with those endpoints, joins them to a test group,
 * and verifies the webhook ping-pong loop drives a full 10-message debate.
 *
 * Usage: node scripts/test-phase2-turns.js [base_url]
 *
 * Requires: The dev server or production URL to be running.
 */

const http = require('http');
const crypto = require('crypto');

const BASE_URL = process.argv[2] || 'http://localhost:3001';
const AGENT_KEY_SECRET = process.env.AGENT_KEY_SECRET || 'dev-secret-change-me';
const TEST_GROUP = `test-debate-${Date.now()}`;

// Mutable key refs — set after registration, used by bot servers
const keys = { pro: null, con: null };
const webhooksReceived = { pro: [], con: [] };
let proServer, conServer;

async function api(path, method, body, headers = {}) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${path}`, opts);
    return { status: res.status, data: await res.json() };
}

/**
 * Start a local HTTP server that acts as a bot endpoint.
 * Uses the mutable `keys` object so the key can be set after registration
 * without restarting the server (and changing ports).
 */
function startBotServer(agentId, keySide, label) {
    return new Promise((resolve) => {
        const server = http.createServer(async (req, res) => {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const payload = JSON.parse(body);
                    webhooksReceived[keySide].push(payload);

                    console.log(`    📩 ${label} received: ${payload.event} (msgs: ${payload.messagesCount}, left: ${payload.yourMessagesLeft})`);

                    // Verify signature
                    const expectedSig = crypto.createHmac('sha256', AGENT_KEY_SECRET).update(body).digest('hex');
                    const actualSig = req.headers['x-claw-signature'];
                    if (actualSig !== expectedSig) {
                        console.log(`    ⚠️  ${label}: Signature mismatch!`);
                    } else {
                        console.log(`    ✅ ${label}: Signature verified`);
                    }

                    // If we still have messages left, reply
                    if (payload.yourMessagesLeft > 0) {
                        const round = 6 - payload.yourMessagesLeft;
                        const content = `${label} argument round ${round}: ${payload.topic?.slice(0, 40)}...`;

                        // Small delay to simulate thinking
                        await new Promise(r => setTimeout(r, 300));

                        const apiKey = keys[keySide];
                        const postRes = await api(`/api/groups/${payload.debateId}/messages`, 'POST', {
                            agentId: payload.yourAgentId,
                            content,
                        }, { 'X-Agent-Key': apiKey });

                        if (postRes.status === 201) {
                            console.log(`    ✉️  ${label} posted: "${content.slice(0, 60)}"`);
                        } else {
                            console.log(`    ❌ ${label} post failed: ${postRes.status} ${JSON.stringify(postRes.data)}`);
                        }
                    } else {
                        console.log(`    🏁 ${label}: No messages left, debate should end.`);
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true }));
                } catch (err) {
                    console.error(`    ❌ ${label} server error:`, err.message);
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: err.message }));
                }
            });
        });

        server.listen(0, () => {
            const port = server.address().port;
            console.log(`  🤖 ${label} bot listening on port ${port}`);
            resolve({ server, port });
        });
    });
}

async function main() {
    console.log(`\n🔄 Phase 2 Turn Manager Test — ${BASE_URL}\n`);

    const proId = `pro-bot-${Date.now()}`;
    const conId = `con-bot-${Date.now()}`;

    // 1. Start bot servers FIRST (ports are stable for the whole test)
    console.log('  Starting bot servers...');
    const pro = await startBotServer(proId, 'pro', 'PRO');
    const con = await startBotServer(conId, 'con', 'CON');
    proServer = pro.server;
    conServer = con.server;

    // 2. Register agents with the stable bot endpoint URLs
    console.log('\n  Registering agents...');
    const proRes = await api('/api/agents', 'POST', {
        agentId: proId,
        name: 'Test PRO Bot',
        role: 'debater',
        endpoint: `http://localhost:${pro.port}`,
    });

    if (proRes.status !== 201) {
        console.error(`  ❌ PRO registration failed: ${JSON.stringify(proRes.data)}`);
        cleanup();
        return;
    }
    keys.pro = proRes.data.apiKey;
    console.log(`  ✅ PRO registered: ${proId} (key: ${keys.pro.slice(0, 12)}...)`);

    const conRes = await api('/api/agents', 'POST', {
        agentId: conId,
        name: 'Test CON Bot',
        role: 'debater',
        endpoint: `http://localhost:${con.port}`,
    });

    if (conRes.status !== 201) {
        console.error(`  ❌ CON registration failed: ${JSON.stringify(conRes.data)}`);
        cleanup();
        return;
    }
    keys.con = conRes.data.apiKey;
    console.log(`  ✅ CON registered: ${conId} (key: ${keys.con.slice(0, 12)}...)`);

    // 3. Create a test debate group
    console.log('\n  Creating test debate group...');
    const groupRes = await api('/api/groups', 'POST', {
        groupId: TEST_GROUP,
        name: 'Phase 2 Test Debate',
        description: 'Automated test for webhook dispatch',
        topic: 'Is automated testing better than manual testing?',
        agentId: proId,
    });
    if (groupRes.status !== 201 && groupRes.status !== 200) {
        console.error(`  ❌ Group creation failed: ${JSON.stringify(groupRes.data)}`);
        cleanup();
        return;
    }
    console.log(`  ✅ Group created: ${TEST_GROUP}`);

    // 4. Join both agents to the group
    console.log('\n  Joining agents to debate...');
    const joinPro = await api(`/api/groups/${TEST_GROUP}/join`, 'POST', {
        agentId: proId,
    }, { 'X-Agent-Key': keys.pro });
    console.log(`  PRO join: ${joinPro.status} — stance: ${joinPro.data.stance || 'assigned'}`);

    const joinCon = await api(`/api/groups/${TEST_GROUP}/join`, 'POST', {
        agentId: conId,
    }, { 'X-Agent-Key': keys.con });
    console.log(`  CON join: ${joinCon.status} — stance: ${joinCon.data.stance || 'assigned'}`);

    // 5. Wait for the debate to play out via webhooks
    // The joinGroup should trigger dispatchInitialTurn → PRO gets webhook →
    // PRO posts → CON gets webhook → CON posts → ... → 10 total messages
    console.log('\n  ⏳ Waiting for debate to complete via webhooks (max 60s)...\n');

    const startTime = Date.now();
    const maxWait = 60000;

    while (Date.now() - startTime < maxWait) {
        await new Promise(r => setTimeout(r, 2000));

        // Check debate status
        const groupStatus = await api(`/api/groups/${TEST_GROUP}`, 'GET');
        const msgCount = groupStatus.data?.messageCount || groupStatus.data?.messages?.length || 0;
        const status = groupStatus.data?.debateStatus || 'unknown';

        console.log(`  📊 Messages: ${msgCount}/10, Status: ${status}`);

        if (status === 'voting' || msgCount >= 10) {
            console.log('\n  🎉 Debate completed!');
            break;
        }
    }

    // 6. Verify results
    console.log('\n  📋 Results:');

    const finalGroup = await api(`/api/groups/${TEST_GROUP}`, 'GET');
    const msgCount = finalGroup.data?.messages?.length || finalGroup.data?.messageCount || 0;
    const finalStatus = finalGroup.data?.debateStatus;
    console.log(`  Total messages: ${msgCount}`);
    console.log(`  Debate status: ${finalStatus}`);
    console.log(`  PRO webhooks received: ${webhooksReceived.pro.length}`);
    console.log(`  CON webhooks received: ${webhooksReceived.con.length}`);

    // Also check via messages endpoint directly
    const msgsRes = await api(`/api/groups/${TEST_GROUP}/messages`, 'GET');
    const directMsgCount = msgsRes.data?.total || msgsRes.data?.count || 0;
    console.log(`  Messages (via /messages endpoint): ${directMsgCount}`);

    // Check webhook log
    const webhookLog = await api(`/api/groups/${TEST_GROUP}/webhook-status`, 'GET');
    console.log(`  Webhook log entries: ${webhookLog.data?.deliveries || 0}`);
    if (webhookLog.data?.log?.length > 0) {
        const delivered = webhookLog.data.log.filter(l => l.status === 'delivered').length;
        const failed = webhookLog.data.log.filter(l => l.status === 'failed').length;
        const skipped = webhookLog.data.log.filter(l => l.status === 'skipped').length;
        console.log(`  Delivered: ${delivered}, Failed: ${failed}, Skipped: ${skipped}`);
    }

    // Pass criteria: debate reached voting + both bots received webhooks + messages exist
    const passed = finalStatus === 'voting'
        && webhooksReceived.pro.length >= 4
        && webhooksReceived.con.length >= 4
        && (msgCount >= 10 || directMsgCount >= 10);
    console.log(`\n  ${passed ? '✅ PHASE 2 TEST PASSED' : '❌ PHASE 2 TEST FAILED'}`);

    cleanup();
    if (!passed) process.exit(1);
}

function cleanup() {
    if (proServer) proServer.close();
    if (conServer) conServer.close();
}

main().catch(e => {
    console.error('Fatal:', e);
    cleanup();
    process.exit(1);
});
