import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'

// GET - 获取实验记录的审核反馈历史
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
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

    // 获取反馈历史（包含附件）
    const feedbacks = await db.reviewFeedback.findMany({
      where: { experimentId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true
          }
        },
        attachments: {
          select: {
            id: true,
            name: true,
            type: true,
            size: true,
            createdAt: true
          }
        }
      }
    })

    // 转换数据格式
    const result = feedbacks.map(feedback => ({
      id: feedback.id,
      action: feedback.action,
      feedback: feedback.feedback,
      createdAt: feedback.createdAt.toISOString(),
      experimentId: feedback.experimentId,
      reviewerId: feedback.reviewerId,
      reviewer: feedback.reviewer,
      attachments: feedback.attachments.map(att => ({
        id: att.id,
        name: att.name,
        type: att.type,
        size: att.size,
        createdAt: att.createdAt.toISOString()
      }))
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get feedbacks error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
