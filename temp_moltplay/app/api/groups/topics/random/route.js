import { NextResponse } from 'next/server'
import topicGenerator from '@/lib/topicGenerator'

export async function GET() {
  const topic = topicGenerator.getRandomTopic()
  return NextResponse.json({
    message: 'Random topic generated',
    data: topic
  })
}
