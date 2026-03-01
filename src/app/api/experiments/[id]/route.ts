import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { AuditAction } from '@prisma/client'

// 获取单个实验记录
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params

    const experiment = await db.experiment.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true, avatar: true }
        },
        experimentProjects: {
          include: {
            project: {
              include: {
                owner: {
                  select: { id: true, name: true, email: true, role: true, avatar: true }
                },
                members: {
                  select: { id: true, name: true, email: true, role: true, avatar: true }
                }
              }
            }
          }
        },
        attachments: true,
        reviewFeedbacks: {
          include: {
            reviewer: {
              select: { id: true, name: true, email: true, role: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!experiment) {
      return NextResponse.json({ error: '实验记录不存在' }, { status: 404 })
    }

    return NextResponse.json({
      id: experiment.id,
      title: experiment.title,
      summary: experiment.summary,
      conclusion: experiment.conclusion,
      extractedInfo: experiment.extractedInfo ? JSON.parse(experiment.extractedInfo) : null,
      extractionStatus: experiment.extractionStatus,
      extractionError: experiment.extractionError,
      reviewStatus: experiment.reviewStatus,
      completenessScore: experiment.completenessScore,
      tags: experiment.tags,
      authorId: experiment.authorId,
      author: experiment.author,
      projects: experiment.experimentProjects.map(ep => ({
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
      attachments: experiment.attachments.map(att => ({
        id: att.id,
        name: att.name,
        type: att.type,
        size: att.size,
        path: att.path,
        category: att.category,
        previewData: att.extractedText ? JSON.parse(att.extractedText) : null,
        createdAt: att.createdAt.toISOString()
      })),
      reviewFeedbacks: experiment.reviewFeedbacks.map(rf => ({
        id: rf.id,
        action: rf.action,
        feedback: rf.feedback,
        createdAt: rf.createdAt.toISOString(),
        reviewerId: rf.reviewerId,
        reviewer: rf.reviewer
      })),
      createdAt: experiment.createdAt.toISOString(),
      updatedAt: experiment.updatedAt.toISOString(),
      submittedAt: experiment.submittedAt?.toISOString() || null,
      reviewedAt: experiment.reviewedAt?.toISOString() || null
    })
  } catch (error) {
    console.error('Get experiment error:', error)
    return NextResponse.json({ error: '获取实验记录失败' }, { status: 500 })
  }
}

// 更新实验记录
export async function PUT(
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
    const { title, summary, conclusion, extractedInfo, tags, projectIds } = body

    // 检查权限
    const experiment = await db.experiment.findUnique({
      where: { id }
    })

    if (!experiment) {
      return NextResponse.json({ error: '实验记录不存在' }, { status: 404 })
    }

    // 检查是否可以编辑（只有DRAFT和NEEDS_REVISION状态可编辑）
    if (experiment.reviewStatus !== 'DRAFT' && experiment.reviewStatus !== 'NEEDS_REVISION') {
      return NextResponse.json({ error: '当前状态不允许编辑' }, { status: 403 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (experiment.authorId !== userId && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限编辑此实验记录' }, { status: 403 })
    }

    // 创建版本历史
    await db.experimentVersion.create({
      data: {
        title: experiment.title,
        summary: experiment.summary,
        conclusion: experiment.conclusion,
        extractedInfo: experiment.extractedInfo,
        experimentId: id,
        versionNote: '自动保存的版本'
      }
    })

    // 计算完整度评分
    const score = calculateCompletenessScore({
      title,
      summary,
      conclusion,
      extractedInfo,
      hasAttachments: (await db.attachment.count({ where: { experimentId: id } })) > 0
    })

    // 更新实验
    const updated = await db.experiment.update({
      where: { id },
      data: {
        title,
        summary,
        conclusion,
        extractedInfo: extractedInfo ? JSON.stringify(extractedInfo) : null,
        tags,
        completenessScore: score
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true, avatar: true }
        },
        experimentProjects: {
          include: {
            project: {
              include: {
                owner: {
                  select: { id: true, name: true, email: true, role: true, avatar: true }
                },
                members: {
                  select: { id: true, name: true, email: true, role: true, avatar: true }
                }
              }
            }
          }
        },
        attachments: true
      }
    })

    // 更新项目关联
    if (projectIds !== undefined) {
      await db.experimentProject.deleteMany({
        where: { experimentId: id }
      })
      if (projectIds.length > 0) {
        await db.experimentProject.createMany({
          data: projectIds.map((projectId: string) => ({
            experimentId: id,
            projectId
          }))
        })
      }
    }

    // 审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'Experiment',
        entityId: id,
        userId,
        details: JSON.stringify({ title: updated.title })
      }
    })

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
    console.error('Update experiment error:', error)
    return NextResponse.json({ error: '更新实验记录失败' }, { status: 500 })
  }
}

// 删除实验记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params

    const experiment = await db.experiment.findUnique({
      where: { id }
    })

    if (!experiment) {
      return NextResponse.json({ error: '实验记录不存在' }, { status: 404 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (experiment.authorId !== userId && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限删除此实验记录' }, { status: 403 })
    }

    // 不能删除已锁定的记录
    if (experiment.reviewStatus === 'LOCKED') {
      return NextResponse.json({ error: '已锁定的实验记录不能删除' }, { status: 403 })
    }

    await db.experiment.delete({
      where: { id }
    })

    await db.auditLog.create({
      data: {
        action: AuditAction.DELETE,
        entityType: 'Experiment',
        entityId: id,
        userId,
        details: JSON.stringify({ title: experiment.title })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete experiment error:', error)
    return NextResponse.json({ error: '删除实验记录失败' }, { status: 500 })
  }
}

// 计算完整度评分
function calculateCompletenessScore(data: {
  title?: string
  summary?: string | null
  conclusion?: string | null
  extractedInfo?: any
  hasAttachments?: boolean
}): number {
  let score = 0

  // 标题 (10分)
  if (data.title && data.title.trim().length > 0) {
    score += 10
  }

  // 摘要 (20分)
  if (data.summary && data.summary.trim().length >= 20) {
    score += 20
  } else if (data.summary && data.summary.trim().length > 0) {
    score += 10
  }

  // 结论 (20分)
  if (data.conclusion && data.conclusion.trim().length >= 20) {
    score += 20
  } else if (data.conclusion && data.conclusion.trim().length > 0) {
    score += 10
  }

  // AI提取信息 (40分)
  if (data.extractedInfo) {
    const info = data.extractedInfo
    // 试剂信息 (10分)
    if (info.reagents && info.reagents.length > 0) {
      score += Math.min(10, info.reagents.length * 2)
    }
    // 仪器信息 (10分)
    if (info.instruments && info.instruments.length > 0) {
      score += Math.min(10, info.instruments.length * 2)
    }
    // 参数信息 (10分)
    if (info.parameters && info.parameters.length > 0) {
      score += Math.min(10, info.parameters.length * 2)
    }
    // 实验步骤 (10分)
    if (info.steps && info.steps.length > 0) {
      score += Math.min(10, info.steps.length * 2)
    }
  }

  // 附件 (10分)
  if (data.hasAttachments) {
    score += 10
  }

  return Math.min(100, score)
}
