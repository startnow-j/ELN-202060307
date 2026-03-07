import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { AuditAction } from '@prisma/client'

// 项目关系类型
type ProjectRelation = 'CREATED' | 'LEADING' | 'JOINED' | 'GLOBAL'

// 获取项目列表
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 获取视角参数
    const { searchParams } = new URL(request.url)
    const viewMode = searchParams.get('viewMode') || 'default'

    // 获取当前用户信息
    const currentUser = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN'

    const projects = await db.project.findMany({
      include: {
        owner: {
          select: { id: true, name: true, email: true, role: true, avatar: true }
        },
        members: {
          select: { id: true, name: true, email: true, role: true, avatar: true }
        },
        projectMembers: {
          select: { userId: true, role: true }
        },
        experimentProjects: {
          include: {
            experiment: {
              include: {
                author: {
                  select: { id: true, name: true, email: true, role: true, avatar: true }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // 计算每个项目与当前用户的关系
    const projectsWithRelation = projects.map(project => {
      let relation: ProjectRelation = 'GLOBAL'

      if (project.ownerId === userId) {
        relation = 'CREATED'
      } else {
        // 检查用户在项目中的角色
        const memberRecord = project.projectMembers.find(pm => pm.userId === userId)
        if (memberRecord) {
          if (memberRecord.role === 'PROJECT_LEAD') {
            relation = 'LEADING'  // 项目负责人
          } else {
            relation = 'JOINED'   // 普通成员或观察者
          }
        } else if (!isAdmin) {
          relation = 'GLOBAL'
        }
      }

      // 计算成员数量：projectMembers 表中的成员 + 创建者（如果不在表中）
      const memberIds = new Set(project.projectMembers.map(pm => pm.userId))
      memberIds.add(project.ownerId)  // 确保创建者被计入
      const memberCount = memberIds.size

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate?.toISOString() || null,
        endDate: project.endDate?.toISOString() || null,
        expectedEndDate: project.expectedEndDate?.toISOString() || null,
        actualEndDate: project.actualEndDate?.toISOString() || null,
        completedAt: project.completedAt?.toISOString() || null,
        archivedAt: project.archivedAt?.toISOString() || null,
        primaryLeader: project.primaryLeader,
        ownerId: project.ownerId,
        owner: project.owner,
        members: project.members,
        memberCount,  // 新增：正确的成员数量
        createdAt: project.createdAt.toISOString(),
        experiments: project.experimentProjects.map(ep => ({
          id: ep.experiment.id,
          title: ep.experiment.title,
          reviewStatus: ep.experiment.reviewStatus,
          completenessScore: ep.experiment.completenessScore,
          author: ep.experiment.author
        })),
        _relation: relation
      }
    })

    // 根据视角过滤
    let filteredProjects = projectsWithRelation

    if (viewMode === 'my_created') {
      // 只显示我创建的
      filteredProjects = projectsWithRelation.filter(p => p._relation === 'CREATED')
    } else if (viewMode === 'my_joined') {
      // 只显示我参与的（不含创建的）
      filteredProjects = projectsWithRelation.filter(p => p._relation === 'JOINED' || p._relation === 'LEADING')
    } else if (viewMode === 'global') {
      // 全局视角 - 管理员可见所有项目，非管理员只能看到自己相关的项目
      if (!isAdmin) {
        filteredProjects = projectsWithRelation.filter(p => 
          p._relation === 'CREATED' || p._relation === 'LEADING' || p._relation === 'JOINED'
        )
      }
      // 管理员返回所有项目（不需要过滤）
    } else {
      // default 普通视角 - 显示我创建或参与的项目
      // 无论是管理员还是普通用户，都只显示与自己相关的项目
      filteredProjects = projectsWithRelation.filter(p => 
        p._relation === 'CREATED' || p._relation === 'LEADING' || p._relation === 'JOINED'
      )
    }

    return NextResponse.json(filteredProjects)
  } catch (error) {
    console.error('Get projects error:', error)
    return NextResponse.json({ error: '获取项目列表失败' }, { status: 500 })
  }
}

// 创建项目
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    // 所有已登录用户都可以创建项目（v3.3.3 调整）

    const body = await request.json()
    const { name, description, startDate, expectedEndDate, primaryLeader, memberIds } = body

    if (!name) {
      return NextResponse.json({ error: '项目名称不能为空' }, { status: 400 })
    }

    const project = await db.project.create({
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: expectedEndDate ? new Date(expectedEndDate) : null,       // 兼容旧字段
        expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null,  // 新字段
        primaryLeader,
        ownerId: userId,
        members: memberIds ? {
          connect: memberIds.map((id: string) => ({ id }))
        } : undefined
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, role: true, avatar: true }
        },
        members: {
          select: { id: true, name: true, email: true, role: true, avatar: true }
        }
      }
    })

    // 审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entityType: 'Project',
        entityId: project.id,
        userId,
        details: JSON.stringify({ name: project.name })
      }
    })

    return NextResponse.json({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate?.toISOString() || null,
      endDate: project.endDate?.toISOString() || null,
      expectedEndDate: project.expectedEndDate?.toISOString() || null,
      actualEndDate: project.actualEndDate?.toISOString() || null,
      completedAt: project.completedAt?.toISOString() || null,
      archivedAt: project.archivedAt?.toISOString() || null,
      primaryLeader: project.primaryLeader,
      ownerId: project.ownerId,
      owner: project.owner,
      members: project.members,
      createdAt: project.createdAt.toISOString()
    })
  } catch (error) {
    console.error('Create project error:', error)
    return NextResponse.json({ error: '创建项目失败' }, { status: 500 })
  }
}
