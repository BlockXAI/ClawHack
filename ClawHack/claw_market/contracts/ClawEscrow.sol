// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ClawEscrow
 * @notice Escrow contract for AI debate prediction markets
 * @dev Reference implementation — deployed on Monad
 */
contract ClawEscrow {
    address public owner;
    address public oracle;
    uint256 public rakePercent = 7; // 7% platform fee
    address public treasury;

    struct Pool {
        string debateId;
        bool exists;
        bool resolved;
        address winner; // winning agent's representative address
        uint256 totalPool;
        mapping(address => uint256) agentPots; // agent address => total bet
        address[] agents;
        Bet[] bets;
    }

    struct Bet {
        address bettor;
        address agent; // which agent they bet on
        uint256 amount;
        bool claimed;
    }

    mapping(string => Pool) public pools;
    string[] public poolIds;

    event PoolCreated(string indexed debateId);
    event BetPlaced(string indexed debateId, address indexed bettor, address agent, uint256 amount);
    event PoolResolved(string indexed debateId, address winner, uint256 totalPool, uint256 rake);
    event WinningsClaimed(string indexed debateId, address indexed bettor, uint256 payout);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle");
        _;
    }

    constructor(address _oracle, address _treasury) {
        owner = msg.sender;
        oracle = _oracle;
        treasury = _treasury;
    }

    function createPool(string calldata debateId) external onlyOwner {
        require(!pools[debateId].exists, "Pool already exists");
        Pool storage pool = pools[debateId];
        pool.debateId = debateId;
        pool.exists = true;
        poolIds.push(debateId);
        emit PoolCreated(debateId);
    }

    function placeBet(string calldata debateId, address agent) external payable {
        Pool storage pool = pools[debateId];
        require(pool.exists, "Pool does not exist");
        require(!pool.resolved, "Pool already resolved");
        require(msg.value > 0, "Bet must be > 0");

        // Track agent if new
        if (pool.agentPots[agent] == 0) {
            pool.agents.push(agent);
        }

        pool.agentPots[agent] += msg.value;
        pool.totalPool += msg.value;
        pool.bets.push(Bet({
            bettor: msg.sender,
            agent: agent,
            amount: msg.value,
            claimed: false
        }));

        emit BetPlaced(debateId, msg.sender, agent, msg.value);
    }

    function resolvePool(string calldata debateId, address winnerAgent) external onlyOracle {
        Pool storage pool = pools[debateId];
        require(pool.exists, "Pool does not exist");
        require(!pool.resolved, "Already resolved");

        pool.resolved = true;
        pool.winner = winnerAgent;

        uint256 rake = (pool.totalPool * rakePercent) / 100;
        payable(treasury).transfer(rake);

        emit PoolResolved(debateId, winnerAgent, pool.totalPool, rake);
    }

    function claimWinnings(string calldata debateId, uint256 betIndex) external {
        Pool storage pool = pools[debateId];
        require(pool.resolved, "Pool not resolved");

        Bet storage bet = pool.bets[betIndex];
        require(bet.bettor == msg.sender, "Not your bet");
        require(!bet.claimed, "Already claimed");
        require(bet.agent == pool.winner, "You bet on the loser");

        bet.claimed = true;

        uint256 rake = (pool.totalPool * rakePercent) / 100;
        uint256 distributable = pool.totalPool - rake;
        uint256 winnerPot = pool.agentPots[pool.winner];
        uint256 payout = (bet.amount * distributable) / winnerPot;

        payable(msg.sender).transfer(payout);
        emit WinningsClaimed(debateId, msg.sender, payout);
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }

    function setRake(uint256 _rakePercent) external onlyOwner {
        require(_rakePercent <= 20, "Rake too high");
        rakePercent = _rakePercent;
    }

    function getPoolBetCount(string calldata debateId) external view returns (uint256) {
        return pools[debateId].bets.length;
    }

    receive() external payable {}
}
