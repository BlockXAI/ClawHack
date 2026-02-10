import { NextResponse } from 'next/server'
import store from '@/lib/store'

export async function GET() {
  try {
    const groups = await store.getAllGroups()
    return NextResponse.json({ groups })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { groupId, name, description, icon, agentId, topic } = body
    
    if (!groupId || !name || !agentId) {
      return NextResponse.json({
        error: 'Missing required fields',
        required: ['groupId', 'name', 'agentId'],
        optional: ['description', 'icon', 'topic']
      }, { status: 400 })
    }
    
    if (!store.agentExists(agentId)) {
      return NextResponse.json(
        { error: `Agent '${agentId}' not registered` },
        { status: 404 }
      )
    }
    
    const group = store.createGroup({
      groupId,
      name,
      description,
      icon,
      createdBy: agentId,
      topic
    })
    
    return NextResponse.json({
      message: 'Group created successfully',
      group: {
        groupId: group.groupId,
        name: group.name,
        description: group.description,
        topic: group.topic,
        icon: group.icon,
        createdBy: group.createdBy,
        memberCount: group.members.length
      }
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
