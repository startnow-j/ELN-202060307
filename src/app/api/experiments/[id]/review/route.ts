import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { ReviewStatus } from '@prisma/client'

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
    const { action, feedback } = body as { action: 'APPROVE' | 'REQUEST_REVISION'; feedback?: string }

    if (!action || !['APPROVE', 'REQUEST_REVISION'].includes(action)) {
      return NextResponse.json({ error: '无效的审核操作' }, { status: 400 })
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
                members: { select: { id: true, name: true, email: true, role: true, avatar: true } }
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

    // 检查状态
    if (experiment.reviewStatus !== 'PENDING_REVIEW') {
      return NextResponse.json({ error: '当前状态不能审核' }, { status: 400 })
    }

    // 检查权限（管理员或项目负责人可审核）
    const isProjectLead = experiment.experimentProjects.some(ep => 
      ep.project.ownerId === userId || 
      ep.project.members.some(m => m.id === userId && m.role === 'PROJECT_LEAD')
    )
    const canReview = currentUser.role === 'ADMIN' || isProjectLead

    if (!canReview) {
      return NextResponse.json({ error: '无权限审核此实验记录' }, { status: 403 })
    }

    // 创建审核反馈
    await db.reviewFeedback.create({
      data: {
        action,
        feedback: feedback || null,
        experimentId: id,
        reviewerId: userId
      }
    })

    // 更新实验状态
    const newStatus: ReviewStatus = action === 'APPROVE' ? 'LOCKED' : 'NEEDS_REVISION'
    
    const updated = await db.experiment.update({
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
        attachments: true
      }
    })

    // 创建审计日志
    await db.auditLog.create({
      data: {
        action: action === 'APPROVE' ? 'APPROVE' : 'REQUEST_REVISION',
        entityType: 'Experiment',
        entityId: id,
        userId,
        details: JSON.stringify({ 
          title: experiment.title,
          feedback: feedback || null
        })
      }
    })

    // 如果是通过，这里可以触发锁定PDF生成
    // TODO: 实现锁定PDF生成功能

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      summary: updated.summary,
      conclusion: updated.conclusion,
      extractedInfo: updated.extractedInfo ? JSON.parse(updated.extractedInfo) : null,
      extractionStatus: updated.extractionStatus,
      extractionError: updated.extractionError,
      reviewStatus: updated.reviewStatus,
      completenessScore: updated.completenessScore,
      tags: updated.tags,
      authorId: updated.authorId,
      author: updated.author,
      projects: updated.experimentProjects.map(ep => ({
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
      attachments: updated.attachments.map(att => ({
        id: att.id,
        name: att.name,
        type: att.type,
        size: att.size,
        path: att.path,
        category: att.category,
        previewData: att.extractedText ? JSON.parse(att.extractedText) : null,
        createdAt: att.createdAt.toISOString()
      })),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      submittedAt: updated.submittedAt?.toISOString() || null,
      reviewedAt: updated.reviewedAt?.toISOString() || null
    })

  } catch (error) {
    console.error('Review error:', error)
    return NextResponse.json({ error: '审核失败' }, { status: 500 })
  }
}
