import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { ReviewStatus, ReviewRequestStatus } from '@prisma/client'

// 审核操作
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, feedback, transferToUserId, attachmentIds } = body as {
      action: 'APPROVE' | 'REQUEST_REVISION' | 'TRANSFER'
      feedback?: string
      transferToUserId?: string
      attachmentIds?: string[]
    }

    // 验证操作类型
    if (!action || !['APPROVE', 'REQUEST_REVISION', 'TRANSFER'].includes(action)) {
      return NextResponse.json({ error: '无效的审核操作' }, { status: 400 })
    }

    // 转交操作必须指定转交目标
    if (action === 'TRANSFER' && !transferToUserId) {
      return NextResponse.json({ error: '转交审核必须指定目标审核人' }, { status: 400 })
    }

    // 获取当前用户
    const currentUser = await db.user.findUnique({ where: { id: userId } })
    if (!currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 获取实验记录
    const experiment = await db.experiment.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        experimentProjects: {
          include: {
            project: {
              include: {
                owner: { select: { id: true, name: true, email: true, role: true, avatar: true } },
                members: { select: { id: true, name: true, email: true, role: true, avatar: true } },
                projectMembers: {
                  select: { userId: true, role: true }
                }
              }
            }
          }
        },
        attachments: true,
        reviewRequests: {
          where: { status: 'PENDING' },
          include: {
            reviewer: { select: { id: true, name: true, email: true, role: true, avatar: true } }
          }
        }
      }
    })

    if (!experiment) {
      return NextResponse.json({ error: '实验记录不存在' }, { status: 404 })
    }

    // 构建项目角色映射表
    const projectRoleMap: Record<string, string> = {}
    for (const ep of experiment.experimentProjects) {
      for (const pm of ep.project.projectMembers) {
        const existingRole = projectRoleMap[pm.userId]
        const rolePriority = { PROJECT_LEAD: 3, MEMBER: 2, VIEWER: 1 }
        if (!existingRole || (rolePriority[pm.role as keyof typeof rolePriority] || 0) > (rolePriority[existingRole as keyof typeof rolePriority] || 0)) {
          projectRoleMap[pm.userId] = pm.role
        }
      }
      if (ep.project.ownerId) {
        projectRoleMap[ep.project.ownerId] = 'PROJECT_LEAD'
      }
    }

    // 检查状态
    if (experiment.reviewStatus !== 'PENDING_REVIEW') {
      return NextResponse.json({ error: '当前状态不能审核' }, { status: 400 })
    }

    // 检查权限（管理员或项目负责人可审核）
    const isProjectLead = experiment.experimentProjects.some(ep =>
      ep.project.ownerId === userId ||
      ep.project.projectMembers.some(pm => pm.userId === userId && pm.role === 'PROJECT_LEAD')
    )
    const canReview = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN' || isProjectLead

    if (!canReview) {
      return NextResponse.json({ error: '无权限审核此实验记录' }, { status: 403 })
    }

    // 如果是转交操作，验证目标审核人
    if (action === 'TRANSFER') {
      const targetUser = await db.user.findUnique({
        where: { id: transferToUserId },
        select: { id: true, name: true, email: true, role: true, isActive: true }
      })

      if (!targetUser || !targetUser.isActive) {
        return NextResponse.json({ error: '目标审核人不存在或已禁用' }, { status: 400 })
      }

      // 检查目标审核人是否有权限审核
      const targetIsProjectLead = experiment.experimentProjects.some(ep =>
        ep.project.ownerId === transferToUserId ||
        ep.project.projectMembers.some(pm => pm.userId === transferToUserId && pm.role === 'PROJECT_LEAD')
      )
      const targetCanReview = targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN' || targetIsProjectLead

      if (!targetCanReview) {
        return NextResponse.json({ error: '目标审核人无权限审核此实验' }, { status: 400 })
      }

      // 不能转交给自己
      if (transferToUserId === userId) {
        return NextResponse.json({ error: '不能转交给自己' }, { status: 400 })
      }
    }

    // 使用事务处理审核操作
    const updated = await db.$transaction(async (tx) => {
      // 创建审核反馈记录
      const reviewFeedback = await tx.reviewFeedback.create({
        data: {
          action,
          feedback: feedback || null,
          experimentId: id,
          reviewerId: userId
        }
      })

      // 如果有批注附件，关联到审核反馈
      if (attachmentIds && attachmentIds.length > 0) {
        await tx.attachment.updateMany({
          where: {
            id: { in: attachmentIds },
            experimentId: id,
            uploaderId: userId
          },
          data: {
            reviewFeedbackId: reviewFeedback.id
          }
        })
      }

      if (action === 'TRANSFER') {
        // 转交操作：将当前用户的所有待处理 ReviewRequest 标记为 TRANSFERRED
        await tx.reviewRequest.updateMany({
          where: {
            experimentId: id,
            reviewerId: userId,
            status: 'PENDING'
          },
          data: { status: 'TRANSFERRED' }
        })

        // 为目标审核人创建新的 ReviewRequest
        await tx.reviewRequest.create({
          data: {
            experimentId: id,
            reviewerId: transferToUserId!,
            note: `从 ${currentUser.name} 转交` + (feedback ? `: ${feedback}` : ''),
            status: 'PENDING'
          }
        })

        // 实验状态保持 PENDING_REVIEW
        return await tx.experiment.findUnique({
          where: { id },
          include: {
            author: { select: { id: true, name: true, email: true, role: true, avatar: true } },
            experimentProjects: {
              include: {
                project: {
                  include: {
                    owner: { select: { id: true, name: true, email: true, role: true, avatar: true } },
                    members: { select: { id: true, name: true, email: true, role: true, avatar: true } }
                  }
                }
              }
            },
            attachments: true,
            reviewRequests: {
              include: {
                reviewer: { select: { id: true, name: true, email: true, role: true, avatar: true } }
              }
            }
          }
        })
      } else {
        // APPROVE 或 REQUEST_REVISION
        const newStatus: ReviewStatus = action === 'APPROVE' ? 'LOCKED' : 'NEEDS_REVISION'

        // 将所有待处理的 ReviewRequest 标记为完成或取消
        await tx.reviewRequest.updateMany({
          where: {
            experimentId: id,
            status: 'PENDING'
          },
          data: {
            status: action === 'APPROVE' ? 'COMPLETED' : 'CANCELLED'
          }
        })

        const exp = await tx.experiment.update({
          where: { id },
          data: {
            reviewStatus: newStatus,
            reviewedAt: new Date(),
            completenessScore: action === 'APPROVE' ? 100 : experiment.completenessScore
          },
          include: {
            author: { select: { id: true, name: true, email: true, role: true, avatar: true } },
            experimentProjects: {
              include: {
                project: {
                  include: {
                    owner: { select: { id: true, name: true, email: true, role: true, avatar: true } },
                    members: { select: { id: true, name: true, email: true, role: true, avatar: true } }
                  }
                }
              }
            },
            attachments: true,
            reviewRequests: {
              include: {
                reviewer: { select: { id: true, name: true, email: true, role: true, avatar: true } }
              }
            }
          }
        })

        return exp
      }
    })

    // 创建审计日志
    await db.auditLog.create({
      data: {
        action: action === 'APPROVE' ? 'APPROVE' : action === 'TRANSFER' ? 'TRANSFER' : 'REQUEST_REVISION',
        entityType: 'Experiment',
        entityId: id,
        userId,
        details: JSON.stringify({
          title: experiment.title,
          action,
          feedback: feedback || null,
          transferToUserId: action === 'TRANSFER' ? transferToUserId : undefined,
          attachmentCount: attachmentIds?.length || 0
        })
      }
    })

    // 获取完整的返回数据（包含附件关联）
    const result = await db.experiment.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, email: true, role: true, avatar: true } },
        experimentProjects: {
          include: {
            project: {
              include: {
                owner: { select: { id: true, name: true, email: true, role: true, avatar: true } },
                members: { select: { id: true, name: true, email: true, role: true, avatar: true } },
                projectMembers: {
                  select: { userId: true, role: true }
                }
              }
            }
          }
        },
        attachments: {
          include: {
            reviewFeedback: {
              include: {
                reviewer: { select: { id: true, name: true, email: true, role: true, avatar: true } }
              }
            }
          }
        },
        reviewRequests: {
          include: {
            reviewer: { select: { id: true, name: true, email: true, role: true, avatar: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        reviewFeedbacks: {
          include: {
            reviewer: { select: { id: true, name: true, email: true, role: true, avatar: true } },
            attachments: true
          },
          orderBy: { createdAt: 'desc' }
        },
        unlockRequests: {
          include: {
            requester: { select: { id: true, name: true, email: true, role: true, avatar: true } },
            processor: { select: { id: true, name: true, email: true, role: true, avatar: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    // 重新构建项目角色映射表
    const newProjectRoleMap: Record<string, string> = {}
    for (const ep of result!.experimentProjects) {
      for (const pm of ep.project.projectMembers) {
        const existingRole = newProjectRoleMap[pm.userId]
        const rolePriority = { PROJECT_LEAD: 3, MEMBER: 2, VIEWER: 1 }
        if (!existingRole || (rolePriority[pm.role as keyof typeof rolePriority] || 0) > (rolePriority[existingRole as keyof typeof rolePriority] || 0)) {
          newProjectRoleMap[pm.userId] = pm.role
        }
      }
      if (ep.project.ownerId) {
        newProjectRoleMap[ep.project.ownerId] = 'PROJECT_LEAD'
      }
    }

    // 辅助函数：为用户添加项目角色
    const getUserWithProjectRole = (user: { id: string; name: string; email: string; role: string; avatar?: string | null } | null) => {
      if (!user) return null
      return {
        ...user,
        projectRole: newProjectRoleMap[user.id] || null
      }
    }

    return NextResponse.json({
      id: result!.id,
      title: result!.title,
      summary: result!.summary,
      conclusion: result!.conclusion,
      extractedInfo: result!.extractedInfo ? JSON.parse(result!.extractedInfo) : null,
      extractionStatus: result!.extractionStatus,
      extractionError: result!.extractionError,
      reviewStatus: result!.reviewStatus,
      completenessScore: result!.completenessScore,
      tags: result!.tags,
      authorId: result!.authorId,
      author: getUserWithProjectRole(result!.author),
      projects: result!.experimentProjects.map(ep => ({
        id: ep.project.id,
        name: ep.project.name,
        description: ep.project.description,
        status: ep.project.status,
        startDate: ep.project.startDate,
        endDate: ep.project.endDate,
        ownerId: ep.project.ownerId,
        owner: ep.project.owner,
        members: ep.project.members,
        createdAt: ep.project.createdAt.toISOString()
      })),
      attachments: result!.attachments.map(att => ({
        id: att.id,
        name: att.name,
        type: att.type,
        size: att.size,
        path: att.path,
        category: att.category,
        previewData: att.extractedText ? JSON.parse(att.extractedText) : null,
        createdAt: att.createdAt.toISOString(),
        reviewFeedbackId: att.reviewFeedbackId,
        reviewFeedback: att.reviewFeedback ? {
          id: att.reviewFeedback.id,
          action: att.reviewFeedback.action,
          reviewer: getUserWithProjectRole(att.reviewFeedback.reviewer)
        } : null
      })),
      reviewRequests: result!.reviewRequests.map(rr => ({
        id: rr.id,
        status: rr.status,
        note: rr.note,
        createdAt: rr.createdAt.toISOString(),
        updatedAt: rr.updatedAt.toISOString(),
        reviewerId: rr.reviewerId,
        reviewer: getUserWithProjectRole(rr.reviewer)
      })),
      reviewFeedbacks: result!.reviewFeedbacks.map(rf => ({
        id: rf.id,
        action: rf.action,
        feedback: rf.feedback,
        createdAt: rf.createdAt.toISOString(),
        reviewerId: rf.reviewerId,
        reviewer: getUserWithProjectRole(rf.reviewer),
        attachments: rf.attachments.map(att => ({
          id: att.id,
          name: att.name,
          size: att.size,
          type: att.type,
          createdAt: att.createdAt.toISOString()
        }))
      })),
      unlockRequests: result!.unlockRequests.map(ur => ({
        id: ur.id,
        reason: ur.reason,
        status: ur.status,
        response: ur.response,
        createdAt: ur.createdAt.toISOString(),
        processedAt: ur.processedAt?.toISOString() || null,
        requesterId: ur.requesterId,
        requester: getUserWithProjectRole(ur.requester),
        processorId: ur.processorId,
        processor: getUserWithProjectRole(ur.processor)
      })),
      createdAt: result!.createdAt.toISOString(),
      updatedAt: result!.updatedAt.toISOString(),
      submittedAt: result!.submittedAt?.toISOString() || null,
      reviewedAt: result!.reviewedAt?.toISOString() || null
    })

  } catch (error) {
    console.error('Review error:', error)
    return NextResponse.json({ error: '审核失败' }, { status: 500 })
  }
}
