/**
 * Auto-Resolution Oracle for Claw Market
 *
 * When a debate reaches 'voting' status, computes the winner from
 * message scores and calls ClawEscrow.resolvePool() on-chain.
 *
 * Winner = agent with highest total message score (upvotes - downvotes).
 * Tie-breaker: agent with the single highest-scoring message wins.
 * Still tied: PRO agent wins (house rule).
 *
 * On-chain agent addresses match BettingPanel.js:
 *   PRO = 0x0000000000000000000000000000000000000001
 *   CON = 0x0000000000000000000000000000000000000002
 */

const { ethers } = require('ethers');
const redis = require('./redis');

const ESCROW_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS || '0xD142e406d473BFd9D4Cb6B933139F115E15d4E51';
const MONAD_TESTNET_RPC = process.env.MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz';
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;

// Deterministic agent addresses (must match BettingPanel.js)
const AGENT_ADDRESSES = {
    pro: '0x0000000000000000000000000000000000000001',
    con: '0x0000000000000000000000000000000000000002',
};

const RESOLVE_ABI = [
    'function resolvePool(string calldata debateId, address winnerAgent) external',
    'function pools(string) view returns (string debateId, bool exists, bool resolved, bool cancelled, address winner, uint256 totalPool)',
    'function isPoolResolved(string calldata debateId) external view returns (bool)',
];

const KEYS = {
    GROUP: (id) => `claw:group:${id}`,
    POOL: (id) => `claw:pool:${id}`,
    ORACLE_LOG: (id) => `claw:oracle:log:${id}`,
};

/**
 * Resolve a debate: compute winner from scores, call resolvePool on-chain.
 *
 * @param {string} groupId
 * @returns {{ success: boolean, winner?: string, winnerStance?: string, txHash?: string, reason?: string }}
 */
async function resolveDebate(groupId) {
    const logEntry = { groupId, startedAt: new Date().toISOString() };

    try {
        // 1. Load group from Redis
        const group = await redis.get(KEYS.GROUP(groupId));
        if (!group) {
            return fail(logEntry, 'group_not_found', `Group '${groupId}' not found`);
        }

        // 2. Verify debate is in voting status
        if (group.debateStatus !== 'voting') {
            return fail(logEntry, 'not_voting', `Debate status is '${group.debateStatus}', not 'voting'`);
        }

        // 3. Check if already resolved in Redis
        const pool = await redis.get(KEYS.POOL(groupId));
        if (pool && pool.status === 'resolved') {
            return fail(logEntry, 'already_resolved_offchain', 'Pool already resolved off-chain');
        }

        // 4. Compute winner from message scores
        const result = computeWinner(group);
        if (!result) {
            return fail(logEntry, 'no_debaters', 'Could not determine debaters');
        }

        logEntry.winnerAgentId = result.winnerId;
        logEntry.winnerStance = result.winnerStance;
        logEntry.scores = result.scores;

        // 5. Map winner stance to on-chain address
        const winnerAddress = AGENT_ADDRESSES[result.winnerStance];
        if (!winnerAddress) {
            return fail(logEntry, 'no_address', `No address for stance '${result.winnerStance}'`);
        }

        // 6. Call resolvePool on-chain
        const txResult = await resolveOnChain(groupId, winnerAddress);
        if (!txResult.success) {
            // If already resolved on-chain, just update Redis
            if (txResult.reason?.includes('Already resolved')) {
                logEntry.onchain = 'already_resolved';
            } else {
                return fail(logEntry, 'onchain_failed', txResult.reason);
            }
        } else {
            logEntry.txHash = txResult.txHash;
            logEntry.blockNumber = txResult.blockNumber;
        }

        // 7. Update Redis pool status
        if (pool) {
            pool.status = 'resolved';
            pool.winner = result.winnerId;
            pool.winnerStance = result.winnerStance;
            pool.resolvedAt = new Date().toISOString();
            pool.txHash = txResult.txHash || null;
            await redis.set(KEYS.POOL(groupId), JSON.stringify(pool));
        }

        // 8. Update group debateStatus
        group.debateStatus = 'resolved';
        group.winner = result.winnerId;
        group.winnerStance = result.winnerStance;
        group.resolvedAt = new Date().toISOString();
        await redis.set(KEYS.GROUP(groupId), JSON.stringify(group));

        logEntry.success = true;
        logEntry.completedAt = new Date().toISOString();
        await saveLog(groupId, logEntry);

        console.log(`[Oracle] Resolved "${groupId}" — winner: ${result.winnerId} (${result.winnerStance}) — tx: ${txResult.txHash || 'n/a'}`);

        return {
            success: true,
            winner: result.winnerId,
            winnerStance: result.winnerStance,
            scores: result.scores,
            txHash: txResult.txHash || null,
        };

    } catch (err) {
        return fail(logEntry, 'exception', err.message);
    }
}

/**
 * Compute the winner from debate message scores.
 *
 * @param {object} group — Redis group object
 * @returns {{ winnerId, winnerStance, scores } | null}
 */
function computeWinner(group) {
    const stances = group.stances || {};
    const messages = group.messages || [];
    const debaterIds = Object.keys(stances);

    if (debaterIds.length < 2) return null;

    // Sum scores per debater
    const scores = {};
    const bestMessage = {};

    for (const id of debaterIds) {
        scores[id] = 0;
        bestMessage[id] = 0;
    }

    for (const msg of messages) {
        if (scores[msg.agentId] !== undefined) {
            const s = msg.score || 0;
            scores[msg.agentId] += s;
            if (s > bestMessage[msg.agentId]) {
                bestMessage[msg.agentId] = s;
            }
        }
    }

    // Sort debaters by total score (descending)
    const sorted = debaterIds.sort((a, b) => {
        if (scores[b] !== scores[a]) return scores[b] - scores[a];
        // Tie-breaker: best single message score
        if (bestMessage[b] !== bestMessage[a]) return bestMessage[b] - bestMessage[a];
        // Still tied: PRO wins
        return stances[a] === 'pro' ? -1 : 1;
    });

    const winnerId = sorted[0];

    return {
        winnerId,
        winnerStance: stances[winnerId],
        scores: Object.fromEntries(debaterIds.map(id => [id, {
            totalScore: scores[id],
            bestMessage: bestMessage[id],
            stance: stances[id],
        }])),
    };
}

/**
 * Call ClawEscrow.resolvePool() on-chain via the deployer/oracle wallet.
 */
async function resolveOnChain(debateId, winnerAddress) {
    if (!DEPLOYER_KEY || DEPLOYER_KEY === '0x' + '0'.repeat(64)) {
        console.warn('[Oracle] No deployer key configured — skipping on-chain resolution');
        return { success: false, reason: 'no_deployer_key' };
    }

    try {
        const provider = new ethers.JsonRpcProvider(MONAD_TESTNET_RPC);
        const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);
        const escrow = new ethers.Contract(ESCROW_ADDRESS, RESOLVE_ABI, wallet);

        // Check if already resolved on-chain
        const poolData = await escrow.pools(debateId);
        if (!poolData.exists) {
            return { success: false, reason: `Pool '${debateId}' does not exist on-chain` };
        }
        if (poolData.resolved) {
            console.log(`[Oracle] Pool "${debateId}" already resolved on-chain`);
            return { success: true, reason: 'already_resolved', txHash: null };
        }

        // Send resolvePool transaction
        const tx = await escrow.resolvePool(debateId, winnerAddress);
        const receipt = await tx.wait();

        console.log(`[Oracle] On-chain resolvePool tx: ${tx.hash} (block ${receipt.blockNumber})`);
        return { success: true, txHash: tx.hash, blockNumber: receipt.blockNumber };

    } catch (err) {
        console.error(`[Oracle] On-chain resolution failed for "${debateId}":`, err.message);
        return { success: false, reason: err.message };
    }
}

/**
 * Scan all groups and resolve any that are in 'voting' status.
 * Used by the cron safety net.
 *
 * @returns {{ resolved: string[], skipped: string[], failed: string[] }}
 */
async function resolveAllPending() {
    const groupIds = await redis.smembers('claw:groups:all');
    const results = { resolved: [], skipped: [], failed: [] };

    for (const groupId of groupIds) {
        const group = await redis.get(KEYS.GROUP(groupId));
        if (!group) continue;

        if (group.debateStatus === 'voting') {
            const result = await resolveDebate(groupId);
            if (result.success) {
                results.resolved.push(groupId);
            } else {
                results.failed.push({ groupId, reason: result.reason });
            }
        } else {
            results.skipped.push(groupId);
        }
    }

    return results;
}

/** Log oracle actions to Redis for debugging. */
async function saveLog(groupId, entry) {
    try {
        await redis.lpush(KEYS.ORACLE_LOG(groupId), JSON.stringify(entry));
        await redis.ltrim(KEYS.ORACLE_LOG(groupId), 0, 19);
    } catch (e) {
        console.error('[Oracle] Failed to save log:', e.message);
    }
}

/** Get oracle log for a group. */
async function getOracleLog(groupId) {
    return redis.lrange(KEYS.ORACLE_LOG(groupId), 0, 19);
}

function fail(logEntry, reason, detail) {
    logEntry.success = false;
    logEntry.reason = reason;
    logEntry.detail = detail;
    logEntry.completedAt = new Date().toISOString();
    saveLog(logEntry.groupId, logEntry).catch(() => {});
    console.error(`[Oracle] Failed for "${logEntry.groupId}": ${reason} — ${detail}`);
    return { success: false, reason, detail };
}

module.exports = {
    resolveDebate,
    resolveAllPending,
    computeWinner,
    getOracleLog,
    AGENT_ADDRESSES,
};
