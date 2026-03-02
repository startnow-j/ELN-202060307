import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'

// POST - 创建解锁申请
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id: experimentId } = await params
    const { reason } = await request.json()

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: '请填写解锁原因' }, { status: 400 })
    }

    // 检查实验记录是否存在
    const experiment = await db.experiment.findUnique({
      where: { id: experimentId },
      include: {
        experimentProjects: {
          include: {
            project: {
              select: {
                ownerId: true
              }
            }
          }
        }
      }
    })

    if (!experiment) {
      return NextResponse.json({ error: '实验记录不存在' }, { status: 404 })
    }

    // 检查是否是作者
    if (experiment.authorId !== userId) {
      return NextResponse.json({ error: '只有作者才能申请解锁' }, { status: 403 })
    }

    // 检查是否已锁定
    if (experiment.reviewStatus !== 'LOCKED') {
      return NextResponse.json({ error: '实验记录未锁定，无需申请解锁' }, { status: 400 })
    }

    // 检查是否有待处理的解锁申请
    const existingRequest = await db.unlockRequest.findFirst({
      where: {
        experimentId,
        requesterId: userId,
        status: 'PENDING'
      }
    })

    if (existingRequest) {
      return NextResponse.json({ error: '您已提交过解锁申请，请等待处理' }, { status: 400 })
    }

    // 创建解锁申请
    const unlockRequest = await db.unlockRequest.create({
      data: {
        reason: reason.trim(),
        experimentId,
        requesterId: userId
      },
      include: {
        experiment: {
          select: {
            title: true
          }
        },
        requester: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // 记录审计日志
    await db.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'UnlockRequest',
        entityId: unlockRequest.id,
        details: JSON.stringify({
          experimentId,
          experimentTitle: experiment.title,
          reason: reason.trim()
        }),
        userId: userId
      }
    })

    return NextResponse.json({
      success: true,
      message: '解锁申请已提交',
      data: unlockRequest
    })
  } catch (error) {
    console.error('Create unlock request error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
