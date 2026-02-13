/**
 * On-chain diagnostic script for ClawEscrow contract
 * Tests: contract read calls, pool existence, bet simulation
 */

const { ethers } = require('ethers');
const { ESCROW_ADDRESS, ESCROW_ABI } = require('../lib/escrow');

const RPC_URL = 'https://testnet-rpc.monad.xyz';
const CHAIN_ID = 10143;

const POOLS_TO_CHECK = ['crypto-kings', 'ai-wars', 'tech-bets', 'degen-pit', 'money-talks', 'policy-arena'];

async function main() {
    console.log('🔍 ClawEscrow On-Chain Diagnostic');
    console.log(`   Contract: ${ESCROW_ADDRESS}`);
    console.log(`   RPC: ${RPC_URL}`);
    console.log(`   Chain ID: ${CHAIN_ID}`);
    console.log('');

    // 1. Connect to RPC
    let provider;
    try {
        provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
        const network = await provider.getNetwork();
        console.log(`✅ RPC connected — chain: ${network.chainId}`);
    } catch (e) {
        console.error(`❌ RPC connection failed: ${e.message}`);
        process.exit(1);
    }

    // 2. Check contract exists (has code)
    try {
        const code = await provider.getCode(ESCROW_ADDRESS);
        if (code === '0x' || code === '0x0') {
            console.error('❌ No contract code at address — contract not deployed!');
            process.exit(1);
        }
        console.log(`✅ Contract deployed — code size: ${(code.length - 2) / 2} bytes`);
    } catch (e) {
        console.error(`❌ Contract check failed: ${e.message}`);
        process.exit(1);
    }

    // 3. Read contract state
    const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);

    try {
        const owner = await contract.owner();
        console.log(`✅ Owner: ${owner}`);
    } catch (e) {
        console.error(`❌ owner() failed: ${e.message}`);
    }

    try {
        const oracle = await contract.oracle();
        console.log(`✅ Oracle: ${oracle}`);
    } catch (e) {
        console.error(`❌ oracle() failed: ${e.message}`);
    }

    try {
        const rake = await contract.rakePercent();
        console.log(`✅ Rake: ${rake}%`);
    } catch (e) {
        console.error(`❌ rakePercent() failed: ${e.message}`);
    }

    try {
        const treasury = await contract.treasury();
        console.log(`✅ Treasury: ${treasury}`);
    } catch (e) {
        console.error(`❌ treasury() failed: ${e.message}`);
    }

    // 4. Check pools
    console.log('\n📊 Pool Status:');
    for (const poolId of POOLS_TO_CHECK) {
        try {
            const pool = await contract.pools(poolId);
            const betCount = await contract.getPoolBetCount(poolId);
            const totalPoolEth = ethers.formatEther(pool.totalPool || pool[4] || 0n);

            const exists = pool.exists || pool[1];
            const resolved = pool.resolved || pool[2];
            const winner = pool.winner || pool[3];

            if (exists) {
                console.log(`  ✅ ${poolId}: exists=${exists}, resolved=${resolved}, totalPool=${totalPoolEth} MON, bets=${betCount}`);
                if (winner && winner !== '0x0000000000000000000000000000000000000000') {
                    console.log(`     Winner: ${winner}`);
                }
            } else {
                console.log(`  ⚠️  ${poolId}: pool does NOT exist on-chain`);
            }
        } catch (e) {
            console.error(`  ❌ ${poolId}: ${e.message}`);
        }
    }

    // 5. Test a simulated bet (dry-run via estimateGas)
    console.log('\n🧪 Dry-run bet test (estimateGas):');
    const testPool = POOLS_TO_CHECK[0];
    const testAgent = '0x0000000000000000000000000000000000000001';
    const testAmount = ethers.parseEther('0.001');

    try {
        // We need a signer for estimateGas on a payable function
        // Use a random wallet just to test estimation
        const wallet = ethers.Wallet.createRandom().connect(provider);
        const contractWithSigner = contract.connect(wallet);

        const gasEstimate = await contractWithSigner.placeBet.estimateGas(
            testPool, testAgent, { value: testAmount }
        );
        console.log(`  ✅ placeBet('${testPool}', ${testAgent}) — estimated gas: ${gasEstimate}`);
    } catch (e) {
        const reason = e.reason || e.shortMessage || e.message;
        console.log(`  ⚠️  placeBet dry-run reverted: ${reason}`);
        if (reason.includes('Pool does not exist')) {
            console.log('     → Pool needs to be created first');
        } else if (reason.includes('insufficient funds')) {
            console.log('     → This is expected (test wallet has no MON)');
            console.log('     → Contract call structure is correct ✅');
        }
    }

    // 6. Check deployer balance
    console.log('\n💰 Deployer wallet:');
    const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (deployerKey) {
        try {
            const deployer = new ethers.Wallet(deployerKey, provider);
            const balance = await provider.getBalance(deployer.address);
            console.log(`  Address: ${deployer.address}`);
            console.log(`  Balance: ${ethers.formatEther(balance)} MON`);
        } catch (e) {
            console.error(`  ❌ ${e.message}`);
        }
    } else {
        console.log('  ⚠️  DEPLOYER_PRIVATE_KEY not set, skipping');
    }

    console.log('\n✅ Diagnostic complete.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
