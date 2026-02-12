/**
 * Claw Market — Redis client (Railway Redis via ioredis)
 * Wraps ioredis to auto-parse JSON on get() for store.js compatibility.
 */

const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || 'redis://localhost:6379';

const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        return Math.min(times * 200, 2000);
    },
    tls: REDIS_URL.startsWith('rediss://') ? {} : undefined,
});

client.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
});

// Wrapper that auto-parses JSON on get (matching Upstash behaviour used by store.js)
const redis = {
    async get(key) {
        const raw = await client.get(key);
        if (raw === null) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return raw;
        }
    },
    async set(key, value) {
        return client.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    },
    async sadd(key, ...members) {
        return client.sadd(key, ...members);
    },
    async smembers(key) {
        return client.smembers(key);
    },
    async exists(key) {
        return client.exists(key);
    },
    async incr(key) {
        return client.incr(key);
    },
    async del(key) {
        return client.del(key);
    },
};

module.exports = redis;
