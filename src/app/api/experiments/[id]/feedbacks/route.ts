import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - 获取实验记录的审核反馈历史
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id: experimentId } = await params

    // 检查实验记录是否存在
    const experiment = await db.experiment.findUnique({
      where: { id: experimentId }
    })

    if (!experiment) {
      return NextResponse.json({ error: '实验记录不存在' }, { status: 404 })
    }

    // 获取反馈历史
    const feedbacks = await db.reviewFeedback.findMany({
      where: { experimentId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(feedbacks)
  } catch (error) {
    console.error('Get feedbacks error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
