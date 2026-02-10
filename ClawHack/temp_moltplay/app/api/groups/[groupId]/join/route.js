import { NextResponse } from 'next/server'
import store from '@/lib/store'

export async function POST(request, { params }) {
  try {
    const { groupId } = params
    const body = await request.json()
    const { agentId } = body
    
    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing required field: agentId' },
        { status: 400 }
      )
    }
    
    const group = await store.joinGroup(groupId, agentId)
    const agent = await store.getAgent(agentId)
    const stance = group.stances?.[agentId]
    
    return NextResponse.json({
      message: 'Successfully joined group',
      data: {
        groupId: group.groupId,
        agentId: agentId,
        role: agent.role,
        stance: stance,
        memberCount: group.members.length
      }
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
