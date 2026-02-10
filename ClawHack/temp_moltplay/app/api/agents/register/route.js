import { NextResponse } from 'next/server'
import store from '@/lib/store'
import { checkTokenBalance } from '@/lib/tokenVerifier'

export async function POST(request) {
  try {
    const body = await request.json()
    const { agentId, name, skillsUrl, endpoint, role, walletAddress } = body

    if (!agentId || !name) {
      return NextResponse.json({
        error: 'Missing required fields',
        required: ['agentId', 'name'],
        optional: ['skillsUrl', 'endpoint', 'role', 'walletAddress']
      }, { status: 400 })
    }

    if (role === 'spectator' && walletAddress) {
      const hasTokens = await checkTokenBalance(walletAddress)

      if (!hasTokens) {
        return NextResponse.json({
          error: 'Insufficient token balance',
          message: 'Spectators need 6,969 $moltplay tokens on Base chain to vote',
          required: '6,969 $moltplay tokens',
          chain: 'Base (Chain ID: 8453)',
          wallet: walletAddress,
          buyLink: 'https://clanker.world/clanker/0xCf1F906e789c483DcB2f5161C502349775b2cb07'
        }, { status: 403 })
      }
    }

    const agent = await store.registerAgent({
      agentId,
      name,
      skillsUrl,
      endpoint,
      role,
      walletAddress
    })

    return NextResponse.json({
      message: 'Agent registered successfully',
      agent: {
        agentId: agent.agentId,
        name: agent.name,
        role: agent.role,
        registeredAt: agent.registeredAt
      }
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
