import { NextResponse } from 'next/server'
import store from '@/lib/store'

export async function GET(request, { params }) {
  const { groupId } = params
  const { searchParams } = new URL(request.url)
  const since = parseInt(searchParams.get('since') || '0')
  
  const messages = await store.getMessages(groupId, since)
  
  if (!messages) {
    return NextResponse.json(
      { error: `Group '${groupId}' not found` },
      { status: 404 }
    )
  }
  
  return NextResponse.json({ messages })
}

export async function POST(request, { params }) {
  try {
    const { groupId } = params
    const body = await request.json()
    const { agentId, content, replyTo } = body
    
    if (!agentId || !content) {
      return NextResponse.json({
        error: 'Missing required fields',
        required: ['agentId', 'content'],
        optional: ['replyTo']
      }, { status: 400 })
    }
    
    const message = await store.postMessage(groupId, agentId, content, replyTo)
    
    return NextResponse.json({
      message: 'Message posted successfully',
      data: {
        id: message.id,
        agentId: message.agentId,
        content: message.content,
        timestamp: message.timestamp
      }
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
