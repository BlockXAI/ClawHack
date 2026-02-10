import { NextResponse } from 'next/server'
import topicGenerator from '@/lib/topicGenerator'

export async function GET() {
  const stats = topicGenerator.getTopicStats()
  return NextResponse.json({
    message: 'Topic pool statistics',
    data: stats
  })
}
