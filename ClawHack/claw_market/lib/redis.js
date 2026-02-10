/**
 * Claw Market — Redis client (shared with MoltPlay)
 * Both apps connect to the same Upstash Redis instance.
 */

const { Redis } = require('@upstash/redis');

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = redis;
