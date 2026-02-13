/**
 * Claw Market — Redis client (Railway Redis via ioredis)
 * Wraps ioredis to auto-parse JSON on get() for store.js compatibility.
 */

const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || '';

if (!REDIS_URL) {
    console.warn('[Redis] REDIS_URL not set — API routes will fail');
}

const client = REDIS_URL ? new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    connectTimeout: 15000,
    family: 0,  // auto-detect IPv4/IPv6
    retryStrategy(times) {
        if (times > 10) return null;
        return Math.min(times * 500, 5000);
    },
    reconnectOnError(err) {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
        return targetErrors.some(e => err.message.includes(e));
    },
    tls: REDIS_URL.startsWith('rediss://') ? {} : undefined,
}) : null;

if (client) {
    client.on('error', (err) => {
        console.error('[Redis] Error:', err.message);
    });
    client.on('connect', () => {
        console.log('[Redis] Connected');
    });
}

// Wrapper that auto-parses JSON on get (matching Upstash behaviour used by store.js)
const redis = {
    async get(key) {
        if (!client) throw new Error('Redis not configured');
        const raw = await client.get(key);
        if (raw === null) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return raw;
        }
    },
    async set(key, value) {
        if (!client) throw new Error('Redis not configured');
        return client.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    },
    async sadd(key, ...members) {
        if (!client) throw new Error('Redis not configured');
        return client.sadd(key, ...members);
    },
    async smembers(key) {
        if (!client) throw new Error('Redis not configured');
        return client.smembers(key);
    },
    async exists(key) {
        if (!client) throw new Error('Redis not configured');
        return client.exists(key);
    },
    async incr(key) {
        if (!client) throw new Error('Redis not configured');
        return client.incr(key);
    },
    async del(key) {
        if (!client) throw new Error('Redis not configured');
        return client.del(key);
    },
    async lpush(key, ...values) {
        if (!client) throw new Error('Redis not configured');
        return client.lpush(key, ...values);
    },
    async ltrim(key, start, stop) {
        if (!client) throw new Error('Redis not configured');
        return client.ltrim(key, start, stop);
    },
    async lrange(key, start, stop) {
        if (!client) throw new Error('Redis not configured');
        const items = await client.lrange(key, start, stop);
        return items.map(item => {
            try { return JSON.parse(item); } catch { return item; }
        });
    },
};

module.exports = redis;
