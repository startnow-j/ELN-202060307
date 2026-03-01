import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { AuditAction } from '@prisma/client'
import { canCreateExperiment, getUserAccessibleProjects, hasProjectPermission, isAdmin } from '@/lib/permissions'

// 获取实验列表
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 获取当前用户角色
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 检查是否请求全局视角
    const { searchParams } = new URL(request.url)
    const globalView = searchParams.get('globalView') === 'true'
    const draftsOnly = searchParams.get('draftsOnly') === 'true'
    const projectRelated = searchParams.get('projectRelated') === 'true'

    // 只有管理员可以使用全局视角
    const useGlobalView = (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && globalView

    let experiments

    if (useGlobalView) {
      // 管理员全局视角：查看所有实验
      experiments = await db.experiment.findMany({
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
        },
        orderBy: { updatedAt: 'desc' }
      })
    } else if (draftsOnly) {
      // 只获取用户暂存实验
      experiments = await db.experiment.findMany({
        where: {
          authorId: userId,
          storageLocation: 'draft'
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
                  }
                }
              }
            }
          },
          attachments: true
        },
        orderBy: { updatedAt: 'desc' }
      })
    } else if (projectRelated) {
      // 只获取项目相关实验（排除暂存）
      const accessibleProjects = await getUserAccessibleProjects(userId)
      const projectIds = accessibleProjects.map(p => p.id)

      if (projectIds.length === 0) {
        return NextResponse.json([])
      }

      experiments = await db.experiment.findMany({
        where: {
          experimentProjects: {
            some: {
              projectId: { in: projectIds }
            }
          }
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
          attachments: true,
          reviewFeedbacks: {
            include: {
              reviewer: {
                select: { id: true, name: true, email: true, role: true, avatar: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })
    } else {
      // 默认：获取用户参与项目内的实验 + 用户自己的暂存实验
      const accessibleProjects = await getUserAccessibleProjects(userId)
      const projectIds = accessibleProjects.map(p => p.id)

      // 构建查询条件
      const whereConditions = []
      
      // 条件1：用户参与的项目中的实验
      if (projectIds.length > 0) {
        whereConditions.push({
          experimentProjects: {
            some: {
              projectId: { in: projectIds }
            }
          }
        })
      }
      
      // 条件2：用户自己的暂存实验
      whereConditions.push({
        authorId: userId,
        storageLocation: 'draft'
      })

      experiments = await db.experiment.findMany({
        where: {
          OR: whereConditions
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
          attachments: true,
          reviewFeedbacks: {
            include: {
              reviewer: {
                select: { id: true, name: true, email: true, role: true, avatar: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })
    }

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
      storageLocation: exp.storageLocation,
      primaryProjectId: exp.primaryProjectId,
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
      reviewFeedbacks: exp.reviewFeedbacks ? exp.reviewFeedbacks.map(rf => ({
        id: rf.id,
        action: rf.action,
        feedback: rf.feedback,
        createdAt: rf.createdAt.toISOString(),
        reviewerId: rf.reviewerId,
        reviewer: rf.reviewer
      })) : [],
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

    // 检查用户是否有创建实验的权限
    const canCreate = await canCreateExperiment(userId)
    const adminCheck = await isAdmin(userId)

    // 如果没有项目关联，创建暂存实验
    if (!projectIds || projectIds.length === 0) {
      // 检查用户是否可以创建实验
      if (!canCreate && !adminCheck) {
        return NextResponse.json({ 
          error: '您没有创建实验的权限，请先加入一个项目' 
        }, { status: 403 })
      }

      // 创建暂存实验
      const experiment = await db.experiment.create({
        data: {
          title,
          summary,
          conclusion,
          tags,
          completenessScore: 10,
          authorId: userId,
          storageLocation: 'draft',
          primaryProjectId: null
        },
        include: {
          author: {
            select: { id: true, name: true, email: true, role: true, avatar: true }
          },
          experimentProjects: {
            include: {
              project: true
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
          details: JSON.stringify({ 
            title: experiment.title,
            storageLocation: 'draft',
            note: '暂存实验'
          })
        }
      })

      return NextResponse.json({
        id: experiment.id,
        title: experiment.title,
        summary: experiment.summary,
        conclusion: experiment.conclusion,
        extractedInfo: null,
        extractionStatus: experiment.extractionStatus,
        extractionError: experiment.extractionError,
        reviewStatus: experiment.reviewStatus,
        completenessScore: experiment.completenessScore,
        tags: experiment.tags,
        authorId: experiment.authorId,
        author: experiment.author,
        storageLocation: experiment.storageLocation,
        primaryProjectId: experiment.primaryProjectId,
        projects: [],
        attachments: [],
        createdAt: experiment.createdAt.toISOString(),
        updatedAt: experiment.updatedAt.toISOString(),
        submittedAt: null,
        reviewedAt: null
      })
    }

    // 有项目关联：验证用户是否有权限在这些项目中创建实验
    for (const projectId of projectIds) {
      const canCreateInProject = await hasProjectPermission(userId, projectId, 'create_experiment')
      if (!canCreateInProject) {
        const project = await db.project.findUnique({
          where: { id: projectId },
          select: { name: true }
        })
        return NextResponse.json({ 
          error: `您没有权限在项目「${project?.name || projectId}」中创建实验` 
        }, { status: 403 })
      }
    }

    // 计算完整度评分
    let completenessScore = 10 // 标题
    if (summary && summary.trim().length >= 20) completenessScore += 15
    else if (summary && summary.trim().length > 0) completenessScore += 8
    if (conclusion && conclusion.trim().length >= 20) completenessScore += 15
    else if (conclusion && conclusion.trim().length > 0) completenessScore += 8
    completenessScore += 15 // 关联项目

    // 创建实验（关联项目）
    const experiment = await db.experiment.create({
      data: {
        title,
        summary,
        conclusion,
        tags,
        completenessScore,
        authorId: userId,
        storageLocation: projectIds[0], // 主存储项目
        primaryProjectId: projectIds[0],
        experimentProjects: {
          create: projectIds.map((projectId: string) => ({
            project: { connect: { id: projectId } }
          }))
        }
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
        details: JSON.stringify({ 
          title: experiment.title,
          projectIds,
          storageLocation: projectIds[0]
        })
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
      storageLocation: experiment.storageLocation,
      primaryProjectId: experiment.primaryProjectId,
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
