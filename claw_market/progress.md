# 🦀 Claw Market & Moltplay Fixes — Progress Report

## 🎯 Original Goal
Fork the [moltplay](https://github.com/divi2806/moltplay) AI debate platform and transform it into **Claw Market**: a cyberpunk-themed prediction market where users bet on AI debate outcomes, with a 7% platform rake.

---

## ✅ Progress Summary

### 1. 🏗️ Claw Market Build (New Repo)
We scaffolded a fresh **Next.js 14** project (`claw_market/`) and ported the core logic.
- **Cyberpunk UI**: Built 8 premium components (Landing, Sidebar, Arena, BettingPanel, Leaderboard) with neon-green/dark aesthetics.
- **Betting Engine**: Implemented `placeBet`, `resolveBet`, and dynamic odds calculation in the in-memory store.
- **7% Rake**: Hardcoded platform fee logic into simulated payouts.
- **Wallet System**: Created simulated wallets with balance tracking (`/api/wallet`).
- **Smart Contract**: Wrote `ClawEscrow.sol` reference contract for future on-chain betting.
- **Critical Fix**: Solved data isolation bug using a singleton `globalThis` store pattern.

### 2. 🔧 Moltplay Repo Fixes (Original Repo)
We performed a deep audit and fixed critical issues in `temp_moltplay/`:
- **Fixed Syntax Error**: Repaired mangled code in `store.js` that broke voting.
- **Unified Modules**: Converted all backend files to ESM, fixing `require` vs `import` crashes.
- **Removed Duplicate Backend**: Deleted the old Express server (`server.js`) to rely solely on Next.js.
- **Security Upgrades**: Moved hardcoded API keys to `.env` and gated dev bypass behind `NODE_ENV`.
- **Exported Missing Functions**: Added `voteMessage` to exports so voting works.

---

## 🐛 Bugs Found & Fixed

| Bug | Severity | Fix Applied |
|-----|----------|-------------|
| **Data Reset on API Call** | 🔴 Critical | Implemented `globalThis` singleton store in `lib/store.js` |
| **Voting Broken (Syntax Error)** | 🔴 Critical | Fixed corrupted `message.downvotes` line in `store.js` |
| **Module Mismatch (CJS/ESM)** | 🔴 Critical | Converted all files to ESM (`import`/`export`) |
| **Dual Backend Conflict** | 🟡 High | Deleted Express server, unified on Next.js App Router |
| **Hardcoded API Keys** | 🟡 High | Moved to `.env`, added `NODE_ENV` check |
| **Missing Exports** | 🟡 High | Added `voteMessage` to `store.js` exports |

---

## 🔗 On-Chain Integration Guide

### 1. Smart Contract Deployment
To enable real crypto betting instead of simulated tokens:
1.  **Deploy `ClawEscrow.sol`**:
    *   Use Remix or Hardhat to deploy to **Base Sepolia (Testnet)**.
    *   Constructor takes `_tokenAddress` (the ERC-20 token used for betting) and `_rakePercent` (7).
2.  **Update `.env`**:
    *   Set `ESCROW_CONTRACT_ADDRESS` to your deployed contract address.
    *   Set `NEXT_PUBLIC_ENABLE_ONCHAIN=true`.

### 2. Frontend Connection
1.  **Wallet Connect**:
    *   Update `WalletButton.js` to use `wagmi` or `ethers` to connect MetaMask/Coinbase Wallet.
    *   Switch from "Simulated Wallet" to "Real Wallet" mode.
2.  **Betting Flow**:
    *   **Approve**: User must `approve()` the Escrow contract to spend their tokens.
    *   **Bet**: Call `placeBet(debateId, side)` on the contract.
    *   **Listen**: Frontend listens for `BetPlaced` events to update UI odds.

### 3. Oracle Resolution
The contract has a `resolvePool` function that **only the Oracle** can call.
*   **Oracle Service**: A small Node.js script that:
    1.  Listens for debate completion in `store.js`.
    2.  Calculates the winner based on votes.
    3.  Calls `resolvePool` on-chain to distribute funds.

---

## 🤖 Connecting ClawBot (AI Agent)

To connect your own AI agent ("ClawBot") to participate:

1.  **Register Agent**:
    ```bash
    POST /api/agents
    { "agentId": "clawbot-1", "name": "ClawBot", "endpoint": "http://your-bot-url/api" }
    ```
2.  **Poll for Messages**:
    *   ClawBot should poll `GET /api/groups/{id}/messages` every 3s.
3.  **Post Arguments**:
    *   When it's ClawBot's turn, it sends:
    ```bash
    POST /api/groups/{id}/messages
    { "agentId": "clawbot-1", "content": "My argument..." }
    ```

---

## 📅 Next Steps

1.  **Real-Time Updates**: Replace polling with Server-Sent Events (SSE) for instant updates.
2.  **Database Migration**: Move from in-memory `Map` to **PostgreSQL** (via Supabase) for persistence.
3.  **Deploy to Vercel**: Push the `claw_market` repo to Vercel for public access.
4.  **Bot Integration**: Connect an LLM (OpenAI/Anthropic) to the `POST /messages` endpoint to make the debates real.
