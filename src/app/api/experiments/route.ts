import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { AuditAction } from '@prisma/client'

// 获取实验列表
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const experiments = await db.experiment.findMany({
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
      },
      orderBy: { updatedAt: 'desc' }
    })

    // 转换数据格式
    const formattedExperiments = experiments.map(exp => ({
      id: exp.id,
      title: exp.title,
      summary: exp.summary,
      conclusion: exp.conclusion,
      extractedInfo: exp.extractedInfo ? JSON.parse(exp.extractedInfo) : null,
      extractionStatus: exp.extractionStatus,
      extractionError: exp.extractionError,
      reviewStatus: exp.reviewStatus,
      completenessScore: exp.completenessScore,
      tags: exp.tags,
      authorId: exp.authorId,
      author: exp.author,
      projects: exp.experimentProjects.map(ep => ({
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
      attachments: exp.attachments.map(att => ({
        id: att.id,
        name: att.name,
        type: att.type,
        size: att.size,
        path: att.path,
        category: att.category,
        previewData: att.extractedText ? JSON.parse(att.extractedText) : null,
        createdAt: att.createdAt.toISOString()
      })),
      createdAt: exp.createdAt.toISOString(),
      updatedAt: exp.updatedAt.toISOString(),
      submittedAt: exp.submittedAt?.toISOString() || null,
      reviewedAt: exp.reviewedAt?.toISOString() || null
    }))

    return NextResponse.json(formattedExperiments)
  } catch (error) {
    console.error('Get experiments error:', error)
    return NextResponse.json({ error: '获取实验列表失败' }, { status: 500 })
  }
}

// 创建实验记录
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { title, summary, conclusion, tags, projectIds } = body

    if (!title) {
      return NextResponse.json({ error: '标题不能为空' }, { status: 400 })
    }

    // 计算完整度评分
    let completenessScore = 10 // 标题
    if (summary && summary.trim().length >= 20) completenessScore += 15
    else if (summary && summary.trim().length > 0) completenessScore += 8
    if (conclusion && conclusion.trim().length >= 20) completenessScore += 15
    else if (conclusion && conclusion.trim().length > 0) completenessScore += 8

    // 创建实验
    const experiment = await db.experiment.create({
      data: {
        title,
        summary,
        conclusion,
        tags,
        completenessScore,
        authorId: userId,
        experimentProjects: projectIds && projectIds.length > 0 ? {
          create: projectIds.map((projectId: string) => ({
            project: { connect: { id: projectId } }
          }))
        } : undefined
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

    // 审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entityType: 'Experiment',
        entityId: experiment.id,
        userId,
        details: JSON.stringify({ title: experiment.title })
      }
    })

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
      createdAt: experiment.createdAt.toISOString(),
      updatedAt: experiment.updatedAt.toISOString(),
      submittedAt: experiment.submittedAt?.toISOString() || null,
      reviewedAt: experiment.reviewedAt?.toISOString() || null
    })
  } catch (error) {
    console.error('Create experiment error:', error)
    return NextResponse.json({ error: '创建实验记录失败' }, { status: 500 })
  }
}
