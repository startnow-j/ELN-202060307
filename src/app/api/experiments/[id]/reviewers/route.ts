import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'

// 获取可审核该实验的用户列表
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

    // 获取实验记录
    const experiment = await db.experiment.findUnique({
      where: { id },
      include: {
        experimentProjects: {
          include: {
            project: {
              include: {
                owner: { select: { id: true, name: true, email: true, role: true, avatar: true } },
                projectMembers: {
                  where: { role: 'PROJECT_LEAD' },
                  include: {
                    user: { select: { id: true, name: true, email: true, role: true, avatar: true } }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!experiment) {
      return NextResponse.json({ error: '实验记录不存在' }, { status: 404 })
    }

    // 收集所有可审核的用户（去重）
    const reviewersMap = new Map<string, { id: string; name: string; email: string; role: string; avatar: string | null; reason: string }>()

    // 从所有关联项目中收集可审核人
    for (const ep of experiment.experimentProjects) {
      const project = ep.project

      // 项目所有者可以审核
      if (project.owner && project.ownerId !== experiment.authorId) {
        reviewersMap.set(project.owner.id, {
          ...project.owner,
          reason: '项目负责人'
        })
      }

      // 项目负责人角色可以审核
      for (const member of project.projectMembers) {
        if (member.role === 'PROJECT_LEAD' && member.userId !== experiment.authorId) {
          reviewersMap.set(member.user.id, {
            ...member.user,
            reason: '项目负责人'
          })
        }
      }
    }

    // 获取所有管理员（ADMIN 和 SUPER_ADMIN）
    const admins = await db.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        isActive: true,
        id: { not: experiment.authorId } // 排除作者自己
      },
      select: { id: true, name: true, email: true, role: true, avatar: true }
    })

    for (const admin of admins) {
      reviewersMap.set(admin.id, {
        ...admin,
        reason: admin.role === 'SUPER_ADMIN' ? '超级管理员' : '管理员'
      })
    }

    // 转换为数组
    const reviewers = Array.from(reviewersMap.values())

    return NextResponse.json({ reviewers })

  } catch (error) {
    console.error('Get reviewers error:', error)
    return NextResponse.json({ error: '获取审核人列表失败' }, { status: 500 })
  }
}
