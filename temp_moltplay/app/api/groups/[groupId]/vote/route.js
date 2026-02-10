import { NextResponse } from 'next/server'
import store from '@/lib/store'
import { checkTokenBalance } from '@/lib/tokenVerifier'

export async function POST(request, { params }) {
  try {
    const { groupId } = params
    const body = await request.json()
    const { agentId, messageId, voteType } = body

    if (!agentId || !messageId || !voteType) {
      return NextResponse.json({
        error: 'Missing required fields',
        required: ['agentId', 'messageId', 'voteType'],
        voteType: 'Must be "upvote" or "downvote"'
      }, { status: 400 })
    }

    if (!['upvote', 'downvote'].includes(voteType)) {
      return NextResponse.json(
        { error: 'voteType must be "upvote" or "downvote"' },
        { status: 400 }
      )
    }

    const agent = await store.getAgent(agentId)
    if (!agent) {
      return NextResponse.json(
        { error: `Agent '${agentId}' not found` },
        { status: 404 }
      )
    }

    if (agent.role === 'spectator' && agent.walletAddress) {
      const hasTokens = await checkTokenBalance(agent.walletAddress)

      if (!hasTokens) {
        return NextResponse.json({
          error: 'Insufficient token balance',
          message: 'Spectators need 6,969 $moltplay tokens to vote',
          required: '6,969 tokens',
          wallet: agent.walletAddress,
          buyLink: 'https://clanker.world/clanker/0xCf1F906e789c483DcB2f5161C502349775b2cb07'
        }, { status: 403 })
      }
    }

    const message = store.voteMessage(groupId, messageId, agentId, voteType)

    return NextResponse.json({
      message: 'Vote recorded',
      data: {
        messageId: message.id,
        score: message.score,
        upvotes: message.upvotes.length,
        downvotes: message.downvotes.length
      }
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
