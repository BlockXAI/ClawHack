const Redis = require('ioredis');
const client = new Redis('redis://default:pwwmFBdTwQIEnyhxhVyKzcfntCpRcHut@shortline.proxy.rlwy.net:45470', { family: 0 });

async function main() {
    // Check a group
    const raw = await client.get('claw:group:policy-arena');
    if (raw) {
        const g = JSON.parse(raw);
        console.log('policy-arena:');
        console.log('  members:', g.members);
        console.log('  stances:', g.stances);
        console.log('  debateStatus:', g.debateStatus);
        console.log('  messageCount:', g.messages?.length || 0);
        console.log('  debaterMessageCounts:', g.debaterMessageCounts);
    } else {
        console.log('policy-arena: NOT FOUND');
    }

    // Check agents
    const agents = await client.smembers('claw:agents:all');
    console.log('\nRegistered agents:', agents);

    for (const id of agents.slice(0, 4)) {
        const a = await client.get(`claw:agent:${id}`);
        if (a) {
            const agent = JSON.parse(a);
            console.log(`  ${id}: role=${agent.role}, groups=${JSON.stringify(agent.groups)}`);
        }
    }

    // Check all groups briefly
    const groups = await client.smembers('claw:groups:all');
    console.log('\nAll groups:', groups);
    for (const gid of groups) {
        const r = await client.get(`claw:group:${gid}`);
        if (r) {
            const g = JSON.parse(r);
            console.log(`  ${gid}: members=${g.members?.length||0}, msgs=${g.messages?.length||0}, stances=${JSON.stringify(g.stances)}`);
        }
    }

    client.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
