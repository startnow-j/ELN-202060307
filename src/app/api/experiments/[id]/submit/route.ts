import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { calculateCompletenessScore } from '@/lib/completenessScore'

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
        details: JSON.stringify({ title: experiment.title, score })
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
