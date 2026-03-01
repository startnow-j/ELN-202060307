import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { AuditAction } from '@prisma/client'

// 获取项目列表
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const projects = await db.project.findMany({
      include: {
        owner: {
          select: { id: true, name: true, email: true, role: true, avatar: true }
        },
        members: {
          select: { id: true, name: true, email: true, role: true, avatar: true }
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

    // 转换数据格式
    const formattedProjects = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      ownerId: project.ownerId,
      owner: project.owner,
      members: project.members,
      createdAt: project.createdAt.toISOString(),
      experiments: project.experimentProjects.map(ep => ({
        id: ep.experiment.id,
        title: ep.experiment.title,
        reviewStatus: ep.experiment.reviewStatus,
        completenessScore: ep.experiment.completenessScore,
        author: ep.experiment.author
      }))
    }))

    return NextResponse.json(formattedProjects)
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
    if (!user || (user.role !== 'ADMIN' && user.role !== 'PROJECT_LEAD')) {
      return NextResponse.json({ error: '无权限创建项目' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, startDate, endDate, memberIds } = body

    if (!name) {
      return NextResponse.json({ error: '项目名称不能为空' }, { status: 400 })
    }

    const project = await db.project.create({
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
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
      startDate: project.startDate,
      endDate: project.endDate,
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
