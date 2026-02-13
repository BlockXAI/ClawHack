// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ClawEscrow
 * @notice Escrow contract for AI debate prediction markets
 * @dev Reference implementation — deployed on Monad
 */
contract ClawEscrow {
    // --- State Variables ---
    address public owner;
    address public oracle;
    uint256 public rakePercent = 7; // 7% platform fee
    uint256 public constant MAX_RAKE = 20; // hard cap on rake
    address public treasury;
    bool private _locked; // reentrancy guard

    struct Pool {
        string debateId;
        bool exists;
        bool resolved;
        bool cancelled;
        address winner; // winning agent's representative address
        uint256 totalPool;
        mapping(address => uint256) agentPots; // agent address => total bet
        mapping(address => bool) isAgent; // tracks valid agents in pool
        address[] agents;
        Bet[] bets;
    }

    struct Bet {
        address bettor;
        address agent; // which agent they bet on
        uint256 amount;
        bool claimed;
        bool refunded;
    }

    mapping(string => Pool) public pools;
    string[] public poolIds;

    // --- Events ---
    event PoolCreated(string indexed debateId);
    event PoolCancelled(string indexed debateId);
    event BetPlaced(string indexed debateId, address indexed bettor, address agent, uint256 amount);
    event PoolResolved(string indexed debateId, address indexed winner, uint256 totalPool, uint256 rake);
    event WinningsClaimed(string indexed debateId, address indexed bettor, uint256 payout);
    event BetRefunded(string indexed debateId, address indexed bettor, uint256 amount);
    event RakeUpdated(uint256 oldRake, uint256 newRake);
    event OracleUpdated(address oldOracle, address newOracle);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    // --- Modifiers ---
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle");
        _;
    }

    modifier nonReentrant() {
        require(!_locked, "Reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    // --- Constructor ---
    constructor(address _oracle, address _treasury) {
        require(_oracle != address(0), "Invalid oracle address");
        require(_treasury != address(0), "Invalid treasury address");
        owner = msg.sender;
        oracle = _oracle;
        treasury = _treasury;
    }

    // --- Pool Management ---
    function createPool(string calldata debateId) external onlyOwner {
        require(!pools[debateId].exists, "Pool already exists");
        require(bytes(debateId).length > 0, "Empty debateId");
        Pool storage pool = pools[debateId];
        pool.debateId = debateId;
        pool.exists = true;
        poolIds.push(debateId);
        emit PoolCreated(debateId);
    }

    function cancelPool(string calldata debateId) external onlyOwner {
        Pool storage pool = pools[debateId];
        require(pool.exists, "Pool does not exist");
        require(!pool.resolved, "Pool already resolved");
        require(!pool.cancelled, "Pool already cancelled");

        pool.cancelled = true;
        emit PoolCancelled(debateId);
    }

    // --- Betting ---
    function placeBet(string calldata debateId, address agent) external payable nonReentrant {
        require(agent != address(0), "Invalid agent address");
        Pool storage pool = pools[debateId];
        require(pool.exists, "Pool does not exist");
        require(!pool.resolved, "Pool already resolved");
        require(!pool.cancelled, "Pool is cancelled");
        require(msg.value > 0, "Bet must be > 0");

        // Track agent if new
        if (!pool.isAgent[agent]) {
            pool.isAgent[agent] = true;
            pool.agents.push(agent);
        }

        pool.agentPots[agent] += msg.value;
        pool.totalPool += msg.value;
        pool.bets.push(Bet({
            bettor: msg.sender,
            agent: agent,
            amount: msg.value,
            claimed: false,
            refunded: false
        }));

        emit BetPlaced(debateId, msg.sender, agent, msg.value);
    }

    // --- Pool Resolution ---
    function resolvePool(string calldata debateId, address winnerAgent) external onlyOracle nonReentrant {
        Pool storage pool = pools[debateId];
        require(pool.exists, "Pool does not exist");
        require(!pool.resolved, "Already resolved");
        require(!pool.cancelled, "Pool is cancelled");
        require(pool.isAgent[winnerAgent], "Winner is not a valid agent in pool");
        require(treasury != address(0), "Treasury address invalid");

        // Effects first (Checks-Effects-Interactions)
        pool.resolved = true;
        pool.winner = winnerAgent;

        uint256 rake = (pool.totalPool * rakePercent) / 100;

        // Interaction last
        (bool success, ) = payable(treasury).call{value: rake}("");
        require(success, "Treasury transfer failed");

        emit PoolResolved(debateId, winnerAgent, pool.totalPool, rake);
    }

    // --- Claim Winnings (Reentrancy-safe, Checks-Effects-Interactions) ---
    function claimWinnings(string calldata debateId, uint256 betIndex) external nonReentrant {
        Pool storage pool = pools[debateId];
        require(pool.resolved, "Pool not resolved");

        Bet storage bet = pool.bets[betIndex];
        require(bet.bettor == msg.sender, "Not your bet");
        require(!bet.claimed, "Already claimed");
        require(!bet.refunded, "Bet was refunded");
        require(bet.agent == pool.winner, "You bet on the loser");

        uint256 rake = (pool.totalPool * rakePercent) / 100;
        uint256 distributable = pool.totalPool - rake;
        uint256 winnerPot = pool.agentPots[pool.winner];
        require(winnerPot > 0, "No winner pot");

        // Multiply before divide to preserve precision
        uint256 payout = (bet.amount * distributable) / winnerPot;
        require(payout > 0, "Payout is zero");

        // Effects before interaction
        bet.claimed = true;

        // Interaction last
        (bool success, ) = payable(msg.sender).call{value: payout}("");
        require(success, "Payout transfer failed");

        emit WinningsClaimed(debateId, msg.sender, payout);
    }

    // --- Refund (only for cancelled pools) ---
    function refundBet(string calldata debateId, uint256 betIndex) external nonReentrant {
        Pool storage pool = pools[debateId];
        require(pool.exists, "Pool does not exist");
        require(pool.cancelled, "Pool is not cancelled");

        Bet storage bet = pool.bets[betIndex];
        require(bet.bettor == msg.sender, "Not your bet");
        require(!bet.refunded, "Already refunded");
        require(!bet.claimed, "Already claimed");

        uint256 refundAmount = bet.amount;

        // Effects before interaction
        bet.refunded = true;

        // Interaction last
        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Refund transfer failed");

        emit BetRefunded(debateId, msg.sender, refundAmount);
    }

    // --- Admin Functions ---
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle address");
        emit OracleUpdated(oracle, _oracle);
        oracle = _oracle;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury address");
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    function setRake(uint256 _rakePercent) external onlyOwner {
        require(_rakePercent <= MAX_RAKE, "Rake too high");
        emit RakeUpdated(rakePercent, _rakePercent);
        rakePercent = _rakePercent;
    }

    // --- View Functions ---
    function getPoolBetCount(string calldata debateId) external view returns (uint256) {
        return pools[debateId].bets.length;
    }

    function getPoolAgents(string calldata debateId) external view returns (address[] memory) {
        return pools[debateId].agents;
    }

    function isPoolCancelled(string calldata debateId) external view returns (bool) {
        return pools[debateId].cancelled;
    }

    function isPoolResolved(string calldata debateId) external view returns (bool) {
        return pools[debateId].resolved;
    }

    function getPoolCount() external view returns (uint256) {
        return poolIds.length;
    }

    receive() external payable {}
}
