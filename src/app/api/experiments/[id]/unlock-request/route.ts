import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { canRequestUnlockByProjectStatus } from '@/lib/permissions'
import { UnlockRequestStatus, ReviewStatus, ProjectMemberRole, ReviewAction } from '@prisma/client'

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
                id: true,
                name: true,
                status: true,
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
    if (experiment.reviewStatus !== ReviewStatus.LOCKED) {
      return NextResponse.json({ error: '实验记录未锁定，无需申请解锁' }, { status: 400 })
    }

    // 检查项目状态是否允许申请解锁
    const projectStatusCheck = await canRequestUnlockByProjectStatus(experimentId)
    if (!projectStatusCheck.canRequest) {
      return NextResponse.json({ error: projectStatusCheck.reason }, { status: 403 })
    }

    // 检查是否有待处理的解锁申请
    const existingRequest = await db.unlockRequest.findFirst({
      where: {
        experimentId,
        requesterId: userId,
        status: UnlockRequestStatus.PENDING
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

// PUT - 处理解锁申请（批准/拒绝）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id: experimentId } = await params
    const body = await request.json()
    const { requestId, action, response } = body as {
      requestId: string
      action: 'APPROVE' | 'REJECT'
      response?: string
    }

    if (!requestId || !action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 })
    }

    // 批准或拒绝都必须填写理由
    if (!response || !response.trim()) {
      return NextResponse.json({ error: '请填写处理理由' }, { status: 400 })
    }

    // 获取当前用户
    const currentUser = await db.user.findUnique({ where: { id: userId } })
    if (!currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 获取解锁申请
    const unlockRequest = await db.unlockRequest.findUnique({
      where: { id: requestId },
      include: {
        experiment: {
          include: {
            experimentProjects: {
              include: {
                project: {
                  select: {
                    id: true,
                    ownerId: true,
                    projectMembers: {
                      where: { role: ProjectMemberRole.PROJECT_LEAD },
                      select: { userId: true }
                    }
                  }
                }
              }
            }
          }
        },
        requester: { select: { id: true, name: true, email: true } }
      }
    })

    if (!unlockRequest) {
      return NextResponse.json({ error: '解锁申请不存在' }, { status: 404 })
    }

    // 验证实验ID匹配
    if (unlockRequest.experimentId !== experimentId) {
      return NextResponse.json({ error: '实验ID不匹配' }, { status: 400 })
    }

    // 检查申请状态
    if (unlockRequest.status !== UnlockRequestStatus.PENDING) {
      return NextResponse.json({ error: '该申请已处理' }, { status: 400 })
    }

    // 检查权限（管理员或项目负责人可处理）
    const isProjectLead = unlockRequest.experiment.experimentProjects.some(ep =>
      ep.project.ownerId === userId ||
      ep.project.projectMembers.some(m => m.userId === userId)
    )
    const canProcess = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN' || isProjectLead

    if (!canProcess) {
      return NextResponse.json({ error: '无权限处理此解锁申请' }, { status: 403 })
    }

    // 使用事务处理
    const result = await db.$transaction(async (tx) => {
      // 更新解锁申请状态
      const updated = await tx.unlockRequest.update({
        where: { id: requestId },
        data: {
          status: action === 'APPROVE' ? UnlockRequestStatus.APPROVED : UnlockRequestStatus.REJECTED,
          response: response || null,
          processedAt: new Date(),
          processorId: userId
        },
        include: {
          experiment: {
            select: { id: true, title: true, reviewStatus: true }
          },
          requester: { select: { id: true, name: true, email: true } },
          processor: { select: { id: true, name: true, email: true } }
        }
      })

      // 如果批准，更新实验状态为 DRAFT（允许编辑）
      if (action === 'APPROVE') {
        await tx.experiment.update({
          where: { id: experimentId },
          data: {
            reviewStatus: ReviewStatus.NEEDS_REVISION // 设为需修改状态，允许编辑
          }
        })

        // 创建审核反馈记录（记录解锁操作）
        await tx.reviewFeedback.create({
          data: {
            action: ReviewAction.UNLOCK,
            feedback: `批准解锁申请: ${unlockRequest.reason}` + (response ? ` | 处理意见: ${response}` : ''),
            experimentId,
            reviewerId: userId
          }
        })
      }

      return updated
    })

    // 记录审计日志
    await db.auditLog.create({
      data: {
        action: action === 'APPROVE' ? 'APPROVE' : 'REQUEST_REVISION', // 借用现有枚举
        entityType: 'UnlockRequest',
        entityId: requestId,
        details: JSON.stringify({
          experimentId,
          experimentTitle: unlockRequest.experiment.title,
          requesterName: unlockRequest.requester.name,
          action,
          response: response || null
        }),
        userId
      }
    })

    return NextResponse.json({
      success: true,
      message: action === 'APPROVE' ? '已批准解锁申请' : '已拒绝解锁申请',
      data: {
        id: result.id,
        status: result.status,
        response: result.response,
        processedAt: result.processedAt?.toISOString(),
        processor: result.processor
      }
    })
  } catch (error) {
    console.error('Process unlock request error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// GET - 获取解锁申请列表
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

    // 获取该实验的所有解锁申请
    const unlockRequests = await db.unlockRequest.findMany({
      where: { experimentId },
      include: {
        requester: { select: { id: true, name: true, email: true, avatar: true } },
        processor: { select: { id: true, name: true, email: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      unlockRequests: unlockRequests.map(ur => ({
        id: ur.id,
        reason: ur.reason,
        status: ur.status,
        response: ur.response,
        createdAt: ur.createdAt.toISOString(),
        processedAt: ur.processedAt?.toISOString() || null,
        requester: ur.requester,
        processor: ur.processor
      }))
    })
  } catch (error) {
    console.error('Get unlock requests error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

