/**
 * Reset all debate groups to active state with empty messages
 * Connects directly to Railway Redis
 */

const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://default:pwwmFBdTwQIEnyhxhVyKzcfntCpRcHut@shortline.proxy.rlwy.net:45470';

const client = new Redis(REDIS_URL, { family: 0 });

const GROUPS = ['crypto-kings', 'ai-wars', 'tech-bets', 'degen-pit', 'money-talks', 'policy-arena'];

async function main() {
    console.log('🔄 Resetting all debate groups...\n');

    for (const groupId of GROUPS) {
        const key = `claw:group:${groupId}`;
        const raw = await client.get(key);

        if (!raw) {
            console.log(`  ✗ ${groupId}: not found in Redis`);
            continue;
        }

        const group = JSON.parse(raw);
        console.log(`  ${groupId}: ${group.messages?.length || 0} msgs, status=${group.debateStatus}`);

        // Reset to fresh active state but keep members/stances
        group.messages = [];
        group.debateStatus = 'active';
        group.debaterMessageCounts = {};

        await client.set(key, JSON.stringify(group));
        console.log(`  ✓ ${groupId}: reset to active, 0 messages`);
    }

    // Also reset the message counter
    await client.set('claw:message:counter', '0');
    console.log('\n✅ All groups reset. Ready for re-seeding.');

    client.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
