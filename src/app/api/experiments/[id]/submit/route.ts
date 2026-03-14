import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { calculateCompletenessScore } from '@/lib/completenessScore'
import { canSubmitReviewByProjectStatus } from '@/lib/permissions'
import { ProjectMemberRole } from '@prisma/client'

// 提交审核
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
    const { reviewerIds = [], submitNote } = body as { reviewerIds?: string[]; submitNote?: string }
    
    // 获取 viewMode 参数，判断是否是全局视角
    const url = new URL(request.url)
    const viewMode = url.searchParams.get('viewMode')

    // 获取当前用户信息
    const currentUser = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })
    const isAdminUser = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN'
    const isGlobalView = viewMode === 'global'

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
        attachments: true
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
      // 项目owner默认是负责人
      if (ep.project.ownerId) {
        projectRoleMap[ep.project.ownerId] = 'PROJECT_LEAD'
      }
    }

    // 辅助函数：为用户添加项目角色
    const getUserWithProjectRole = (user: { id: string; name: string; email: string; role: string; avatar?: string | null } | null) => {
      if (!user) return null
      return {
        ...user,
        projectRole: projectRoleMap[user.id] || null
      }
    }

    // 检查权限：作者可以提交自己的实验，管理员在全局视角下可以提交其他人的实验
    const isAuthor = experiment.authorId === userId
    const canSubmitAsAdmin = isAdminUser && isGlobalView
    
    if (!isAuthor && !canSubmitAsAdmin) {
      return NextResponse.json({ error: '只能提交自己的实验记录，或在全局视角下由管理员代为提交' }, { status: 403 })
    }

    // 检查状态
    if (experiment.reviewStatus !== 'DRAFT' && experiment.reviewStatus !== 'NEEDS_REVISION') {
      return NextResponse.json({ error: '当前状态不能提交审核' }, { status: 400 })
    }

    // 检查项目状态是否允许提交审核
    const projectStatusCheck = await canSubmitReviewByProjectStatus(id)
    if (!projectStatusCheck.canSubmit) {
      return NextResponse.json({ error: projectStatusCheck.reason }, { status: 403 })
    }

    // 暂存实验不能提交审核
    if (experiment.storageLocation === 'draft' || experiment.experimentProjects.length === 0) {
      return NextResponse.json({
        error: '暂存实验不能提交审核，请先关联项目'
      }, { status: 400 })
    }

    // 计算完整度评分（使用统一函数）
    const score = calculateCompletenessScore({
      title: experiment.title,
      summary: experiment.summary,
      conclusion: experiment.conclusion,
      extractedInfo: experiment.extractedInfo,
      tags: experiment.tags,
      attachments: experiment.attachments,
      experimentProjects: experiment.experimentProjects
    })

    // 检查完整度 - 评分>=60 且 必须关联项目
    if (score < 60) {
      return NextResponse.json({ error: '实验记录完整度不足（需≥60分），请补充更多信息' }, { status: 400 })
    }

    // 如果指定了审核人，验证他们是否有权限审核
    if (reviewerIds.length > 0) {
      // 获取所有可审核的用户ID
      const validReviewerIds = new Set<string>()

      for (const ep of experiment.experimentProjects) {
        // 项目所有者可以审核
        validReviewerIds.add(ep.project.ownerId)
        // 获取项目负责人
        const projectMembers = await db.projectMember.findMany({
          where: {
            projectId: ep.projectId,
            role: ProjectMemberRole.PROJECT_LEAD
          }
        })
        projectMembers.forEach(pm => validReviewerIds.add(pm.userId))
      }

      // 添加管理员
      const admins = await db.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
        select: { id: true }
      })
      admins.forEach(a => validReviewerIds.add(a.id))

      // 验证所有指定的审核人
      for (const reviewerId of reviewerIds) {
        if (!validReviewerIds.has(reviewerId)) {
          return NextResponse.json({
            error: '指定的审核人无权限审核此实验'
          }, { status: 400 })
        }
      }
    }

    // 使用事务更新实验状态和创建审核请求
    const updated = await db.$transaction(async (tx) => {
      // 更新实验状态
      const exp = await tx.experiment.update({
        where: { id },
        data: {
          reviewStatus: 'PENDING_REVIEW',
          submittedAt: new Date(),
          completenessScore: score
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

      // 创建审核请求（如果指定了审核人）
      if (reviewerIds.length > 0) {
        await tx.reviewRequest.createMany({
          data: reviewerIds.map(reviewerId => ({
            experimentId: id,
            reviewerId,
            note: submitNote || null,
            status: 'PENDING'
          }))
        })
      }

      // 创建提交审核的反馈记录
      await tx.reviewFeedback.create({
        data: {
          action: 'SUBMIT',
          feedback: submitNote || null,
          experimentId: id,
          reviewerId: userId
        }
      })

      return exp
    })

    // 创建审计日志
    await db.auditLog.create({
      data: {
        action: 'SUBMIT_REVIEW',
        entityType: 'Experiment',
        entityId: id,
        userId,
        details: JSON.stringify({
          title: experiment.title,
          score,
          reviewerIds: reviewerIds.length > 0 ? reviewerIds : undefined,
          submitNote
        })
      }
    })

    // 重新获取包含 reviewRequests 的完整数据
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
        attachments: true,
        reviewRequests: {
          include: {
            reviewer: { select: { id: true, name: true, email: true, role: true, avatar: true } }
          }
        },
        reviewFeedbacks: {
          include: {
            reviewer: { select: { id: true, name: true, email: true, role: true, avatar: true } }
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
    const getResultUserWithProjectRole = (user: { id: string; name: string; email: string; role: string; avatar?: string | null } | null) => {
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
      author: getResultUserWithProjectRole(result!.author),
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
        createdAt: att.createdAt.toISOString()
      })),
      reviewRequests: result!.reviewRequests.map(rr => ({
        id: rr.id,
        status: rr.status,
        note: rr.note,
        createdAt: rr.createdAt.toISOString(),
        updatedAt: rr.updatedAt.toISOString(),
        reviewerId: rr.reviewerId,
        reviewer: getResultUserWithProjectRole(rr.reviewer)
      })),
      reviewFeedbacks: result!.reviewFeedbacks.map(rf => ({
        id: rf.id,
        action: rf.action,
        feedback: rf.feedback,
        createdAt: rf.createdAt.toISOString(),
        reviewerId: rf.reviewerId,
        reviewer: getResultUserWithProjectRole(rf.reviewer)
      })),
      unlockRequests: result!.unlockRequests.map(ur => ({
        id: ur.id,
        reason: ur.reason,
        status: ur.status,
        response: ur.response,
        createdAt: ur.createdAt.toISOString(),
        processedAt: ur.processedAt?.toISOString() || null,
        requesterId: ur.requesterId,
        requester: getResultUserWithProjectRole(ur.requester),
        processorId: ur.processorId,
        processor: getResultUserWithProjectRole(ur.processor)
      })),
      createdAt: result!.createdAt.toISOString(),
      updatedAt: result!.updatedAt.toISOString(),
      submittedAt: result!.submittedAt?.toISOString() || null,
      reviewedAt: result!.reviewedAt?.toISOString() || null
    })

  } catch (error) {
    console.error('Submit review error:', error)
    return NextResponse.json({ error: '提交失败' }, { status: 500 })
  }
}
