import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'

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

    // 检查权限
    if (experiment.authorId !== userId) {
      return NextResponse.json({ error: '只能提交自己的实验记录' }, { status: 403 })
    }

    // 检查状态
    if (experiment.reviewStatus !== 'DRAFT' && experiment.reviewStatus !== 'NEEDS_REVISION') {
      return NextResponse.json({ error: '当前状态不能提交审核' }, { status: 400 })
    }

    // 检查完整度
    if (experiment.completenessScore < 30) {
      return NextResponse.json({ error: '实验记录完整度不足，请补充更多信息' }, { status: 400 })
    }

    // 计算完整度评分
    const score = calculateCompletenessScore(experiment)

    // 更新状态
    const updated = await db.experiment.update({
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
        attachments: true
      }
    })

    // 创建审计日志
    await db.auditLog.create({
      data: {
        action: 'SUBMIT_REVIEW',
        entityType: 'Experiment',
        entityId: id,
        userId,
        details: JSON.stringify({ title: experiment.title })
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
    console.error('Submit review error:', error)
    return NextResponse.json({ error: '提交失败' }, { status: 500 })
  }
}

// 计算完整度评分
function calculateCompletenessScore(experiment: {
  title: string
  summary: string | null
  conclusion: string | null
  extractedInfo: string | null
  attachments: unknown[]
}): number {
  let score = 0

  // 标题 (10分)
  if (experiment.title && experiment.title.trim().length > 0) {
    score += 10
  }

  // 摘要 (15分)
  if (experiment.summary && experiment.summary.trim().length >= 20) {
    score += 15
  } else if (experiment.summary && experiment.summary.trim().length > 0) {
    score += 8
  }

  // 结论 (15分)
  if (experiment.conclusion && experiment.conclusion.trim().length >= 20) {
    score += 15
  } else if (experiment.conclusion && experiment.conclusion.trim().length > 0) {
    score += 8
  }

  // AI提取信息 (40分)
  if (experiment.extractedInfo) {
    try {
      const info = JSON.parse(experiment.extractedInfo)
      if (info.reagents && info.reagents.length > 0) score += 10
      if (info.instruments && info.instruments.length > 0) score += 10
      if (info.parameters && info.parameters.length > 0) score += 10
      if (info.steps && info.steps.length > 0) score += 10
    } catch {}
  }

  // 附件 (20分)
  if (experiment.attachments.length > 0) {
    score += Math.min(20, experiment.attachments.length * 10)
  }

  return Math.min(100, score)
}
