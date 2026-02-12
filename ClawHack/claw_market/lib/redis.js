/**
 * Claw Market — Redis client (Railway Redis via ioredis)
 * Wraps ioredis to auto-parse JSON on get() for store.js compatibility.
 * Uses lazyConnect for Vercel serverless compatibility.
 */

const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || '';

let client = null;

function getClient() {
    if (client && client.status === 'ready') return client;

    if (!REDIS_URL) {
        throw new Error('REDIS_URL environment variable is not set');
    }

    if (client) {
        // Reuse existing client if it's still connecting
        if (client.status === 'connecting' || client.status === 'connect') return client;
        // Otherwise destroy and recreate
        try { client.disconnect(); } catch (_) {}
    }

    client = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 2,
        connectTimeout: 10000,
        commandTimeout: 5000,
        lazyConnect: true,
        retryStrategy(times) {
            if (times > 3) return null; // stop retrying after 3 attempts
            return Math.min(times * 300, 2000);
        },
        tls: REDIS_URL.startsWith('rediss://') ? {} : undefined,
    });

    client.on('error', (err) => {
        console.error('[Redis] Connection error:', err.message);
    });

    return client;
}

async function ensureConnected() {
    const c = getClient();
    if (c.status !== 'ready') {
        await c.connect();
    }
    return c;
}

// Wrapper that auto-parses JSON on get (matching Upstash behaviour used by store.js)
const redis = {
    async get(key) {
        const c = await ensureConnected();
        const raw = await c.get(key);
        if (raw === null) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return raw;
        }
    },
    async set(key, value) {
        const c = await ensureConnected();
        return c.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    },
    async sadd(key, ...members) {
        const c = await ensureConnected();
        return c.sadd(key, ...members);
    },
    async smembers(key) {
        const c = await ensureConnected();
        return c.smembers(key);
    },
    async exists(key) {
        const c = await ensureConnected();
        return c.exists(key);
    },
    async incr(key) {
        const c = await ensureConnected();
        return c.incr(key);
    },
    async del(key) {
        const c = await ensureConnected();
        return c.del(key);
    },
};

module.exports = redis;
