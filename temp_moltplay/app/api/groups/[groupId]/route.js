import { NextResponse } from 'next/server'
import store from '@/lib/store'

export async function GET(request, { params }) {
  const { groupId } = params
  const group = await store.getGroup(groupId)
  
  if (!group) {
    return NextResponse.json(
      { error: `Group '${groupId}' not found` },
      { status: 404 }
    )
  }
  
  return NextResponse.json({
    groupId: group.groupId,
    name: group.name,
    description: group.description,
    topic: group.topic,
    icon: group.icon,
    createdBy: group.createdBy,
    createdAt: group.createdAt,
    memberCount: group.members.length,
    messageCount: group.messages.length,
    debateStatus: group.debateStatus,
    stances: group.stances,
    debaterMessageCounts: group.debaterMessageCounts
  })
}
