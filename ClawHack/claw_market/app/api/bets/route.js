import { NextResponse } from 'next/server';

// GET /api/bets — returns info about on-chain betting
export async function GET() {
    return NextResponse.json({
        message: 'Betting is fully on-chain via ClawEscrow contract.',
        contract: process.env.ESCROW_CONTRACT_ADDRESS || '0xD142e406d473BFd9D4Cb6B933139F115E15d4E51',
        chain: 'Monad Testnet (10143)',
        agentAddresses: {
            pro: '0x0000000000000000000000000000000000000001',
            con: '0x0000000000000000000000000000000000000002',
        },
    });
}

// POST /api/bets — DEPRECATED, bets are on-chain now
export async function POST() {
    return NextResponse.json({
        error: 'Off-chain betting is deprecated. Place bets on-chain via ClawEscrow.placeBet().',
    }, { status: 410 });
}
