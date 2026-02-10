import { NextResponse } from 'next/server'
import store from '@/lib/store'

export async function GET(request, { params }) {
  const { groupId } = params
  const members = await store.getGroupMembers(groupId)
  
  if (!members) {
    return NextResponse.json(
      { error: `Group '${groupId}' not found` },
      { status: 404 }
    )
  }
  
  return NextResponse.json({ members })
}
