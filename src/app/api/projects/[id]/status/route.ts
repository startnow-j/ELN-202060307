import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { 
  canCompleteProject, 
  canUnlockCompletedProject, 
  canArchiveProject,
  canUnlockArchivedProject,
  getAvailableProjectStatusActions 
} from '@/lib/permissions'
import { AuditAction } from '@prisma/client'

// 获取项目可用状态操作
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
    
    const result = await getAvailableProjectStatusActions(userId, projectId)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Get project status actions error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 变更项目状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id: projectId } = await params
    const body = await request.json()
    const { action } = body as { action: 'complete' | 'reactivate' | 'archive' | 'unarchive' }

    if (!action) {
      return NextResponse.json({ error: '请指定操作类型' }, { status: 400 })
    }

    // 获取项目当前状态
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        experimentProjects: {
          include: {
            experiment: {
              select: { id: true, reviewStatus: true }
            }
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    // 权限检查和状态验证
    let newStatus: string
    let lockedExperiments = 0

    switch (action) {
      case 'complete':
        // 结束项目： 进行中 -> 已结束
        if (project.status !== 'ACTIVE') {
          return NextResponse.json({ error: '只有进行中的项目才能结束' }, { status: 400 })
        }
        
        if (!await canCompleteProject(userId, projectId)) {
          return NextResponse.json({ error: '权限不足' }, { status: 403 })
        }
        
        newStatus = 'COMPLETED'
        
        // 使用事务处理
        await db.$transaction(async (tx) => {
          // 锁定所有关联的实验记录
          const experimentIds = project.experimentProjects.map(ep => ep.experiment.id)
          
          if (experimentIds.length > 0) {
            await tx.experiment.updateMany({
              where: { id: { in: experimentIds } },
              data: { 
                reviewStatus: 'LOCKED',
                reviewedAt: new Date()
              }
            })
            lockedExperiments = experimentIds.length
          }
          
          // 更新项目状态
          await tx.project.update({
            where: { id: projectId },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              actualEndDate: new Date()
            }
          })
        })
        break

      case 'reactivate':
        // 解锁项目: 已结束 -> 进行中
        if (project.status !== 'COMPLETED') {
          return NextResponse.json({ error: '只有已结束的项目才能解锁' }, { status: 400 })
        }
        
        if (!await canUnlockCompletedProject(userId, projectId)) {
          return NextResponse.json({ error: '权限不足' }, { status: 403 })
        }
        
        newStatus = 'ACTIVE'
        
        await db.project.update({
          where: { id: projectId },
          data: {
            status: 'ACTIVE',
            completedAt: null,
            actualEndDate: null
          }
        })
        break

      case 'archive':
        // 归档项目: 已结束 -> 已归档
        if (project.status !== 'COMPLETED') {
          return NextResponse.json({ error: '只有已结束的项目才能归档' }, { status: 400 })
        }
        
        if (!await canArchiveProject(userId, projectId)) {
          return NextResponse.json({ error: '权限不足' }, { status: 403 })
        }
        
        newStatus = 'ARCHIVED'
        
        await db.project.update({
          where: { id: projectId },
          data: {
            status: 'ARCHIVED',
            archivedAt: new Date()
          }
        })
        break

      case 'unarchive':
        // 解除归档: 已归档 -> 已结束 (只有超级管理员可以操作)
        if (project.status !== 'ARCHIVED') {
          return NextResponse.json({ error: '只有已归档的项目才能解除归档' }, { status: 400 })
        }
        
        if (!await canUnlockArchivedProject(userId)) {
          return NextResponse.json({ error: '权限不足，只有超级管理员才能解除归档' }, { status: 403 })
        }
        
        newStatus = 'COMPLETED'
        
        await db.project.update({
          where: { id: projectId },
          data: {
            status: 'COMPLETED',
            archivedAt: null
          }
        })
        break

      default:
        return NextResponse.json({ error: '无效的操作类型' }, { status: 400 })
    }

    // 记录审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'Project',
        entityId: projectId,
        userId,
        details: JSON.stringify({
          action,
          previousStatus: project.status,
          newStatus,
          lockedExperiments,
          projectName: project.name
        })
      }
    })

    // 返回更新后的项目
    const updatedProject = await db.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, role: true, avatar: true }
        },
        members: {
          select: { id: true, name: true, email: true, role: true, avatar: true }
        },
        projectMembers: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true, avatar: true }
            }
          }
        }
      }
    })

    return NextResponse.json({
      ...updatedProject,
      _statusChangeInfo: {
        action,
        previousStatus: project.status,
        newStatus,
        lockedExperiments
      }
    })
  } catch (error) {
    console.error('Update project status error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
