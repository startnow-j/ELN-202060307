import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { ProjectMemberRole, UnlockRequestStatus } from '@prisma/client'

// 获取待处理的解锁申请列表
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 获取当前用户
    const currentUser = await db.user.findUnique({ where: { id: userId } })
    if (!currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 检查权限 - 只有管理员和项目负责人可以处理解锁申请
    const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN'

    // 获取待处理的解锁申请
    const pendingRequests = await db.unlockRequest.findMany({
      where: { status: UnlockRequestStatus.PENDING },
      include: {
        experiment: {
          include: {
            author: { select: { id: true, name: true, email: true, avatar: true } },
            experimentProjects: {
              include: {
                project: {
                  select: {
                    id: true,
                    name: true,
                    ownerId: true,
                    projectMembers: {
                      where: { role: ProjectMemberRole.PROJECT_LEAD },
                      select: { userId: true }
                    }
                  }
                }
              }
            }
          }
        },
        requester: { select: { id: true, name: true, email: true, avatar: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    // 过滤出当前用户有权处理的申请
    const processableRequests = pendingRequests.filter(req => {
      if (isAdmin) return true

      // 检查是否是相关项目的负责人
      return req.experiment.experimentProjects.some(ep =>
        ep.project.ownerId === userId ||
        ep.project.projectMembers.some(m => m.userId === userId)
      )
    })

    // 格式化返回数据
    const formattedRequests = processableRequests.map(req => ({
      id: req.id,
      reason: req.reason,
      createdAt: req.createdAt.toISOString(),
      experiment: {
        id: req.experiment.id,
        title: req.experiment.title,
        author: req.experiment.author
      },
      requester: req.requester
    }))

    return NextResponse.json({ requests: formattedRequests })

  } catch (error) {
    console.error('Get pending unlock requests error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
