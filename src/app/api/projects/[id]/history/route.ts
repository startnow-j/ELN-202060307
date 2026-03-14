import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { AuditAction } from '@prisma/client'

/**
 * 获取项目状态变更历史（包括创建）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id: projectId } = await params

    // 检查项目是否存在
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true, name: true, createdAt: true }
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    // 检查权限：项目成员可查看
    const membership = await db.projectMember.findFirst({
      where: { projectId, userId }
    })
    const isOwner = project.ownerId === userId
    const user = await db.user.findUnique({ where: { id: userId } })
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'

    if (!membership && !isOwner && !isAdmin) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 获取项目创建和状态变更的审计日志
    const auditLogs = await db.auditLog.findMany({
      where: {
        OR: [
          // 项目创建
          {
            action: AuditAction.CREATE,
            entityType: 'Project',
            entityId: projectId
          },
          // 状态变更
          {
            action: AuditAction.UPDATE,
            entityType: 'Project',
            entityId: projectId,
            details: { contains: '"previousStatus"' }
          }
        ]
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'asc' }  // 按时间正序，创建在前
    })

    // 格式化日志
    const formattedLogs = auditLogs.map(log => {
      const details = JSON.parse(log.details || '{}')
      
      if (log.action === AuditAction.CREATE) {
        // 创建项目
        return {
          id: log.id,
          action: '创建项目',
          operator: log.user ? { id: log.user.id, name: log.user.name, email: log.user.email } : null,
          timestamp: log.createdAt.toISOString(),
          previousStatus: null,
          newStatus: 'ACTIVE',
          lockedExperiments: 0
        }
      } else {
        // 状态变更
        const actionMap: Record<string, string> = {
          complete: '结束项目',
          reactivate: '恢复项目',
          archive: '归档项目',
          unarchive: '解除归档'
        }

        return {
          id: log.id,
          action: actionMap[details.action] || '状态变更',
          operator: log.user ? { id: log.user.id, name: log.user.name, email: log.user.email } : null,
          timestamp: log.createdAt.toISOString(),
          previousStatus: details.previousStatus,
          newStatus: details.newStatus,
          lockedExperiments: details.lockedExperiments || 0
        }
      }
    })

    return NextResponse.json({
      projectId,
      projectName: project.name,
      logs: formattedLogs
    })
  } catch (error) {
    console.error('Get project history error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
