import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { hasProjectPermission } from '@/lib/permissions'
import { AuditAction } from '@prisma/client'

// 更新成员角色
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const currentUserId = await getUserIdFromToken(request)
    if (!currentUserId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id: projectId, userId: targetUserId } = await params
    const body = await request.json()
    const { role } = body

    // 检查权限
    const canManage = await hasProjectPermission(currentUserId, projectId, 'manage_members')
    if (!canManage) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 验证角色
    const validRoles = ['PROJECT_LEAD', 'MEMBER', 'VIEWER']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: '无效的角色' }, { status: 400 })
    }

    // 获取项目信息，检查是否是项目负责人
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { name: true, ownerId: true }
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    // 不能修改项目创建者的角色
    if (targetUserId === project.ownerId) {
      return NextResponse.json({ error: '不能修改项目创建者的角色' }, { status: 400 })
    }

    // 更新成员角色
    const member = await db.projectMember.update({
      where: {
        projectId_userId: { projectId, userId: targetUserId }
      },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // 记录审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'Project',
        entityId: projectId,
        userId: currentUserId,
        details: JSON.stringify({
          action: 'update_member_role',
          projectName: project.name,
          targetUser: member.user.name,
          newRole: role
        })
      }
    })

    return NextResponse.json({ 
      success: true,
      member: {
        ...member.user,
        projectRole: member.role
      }
    })
  } catch (error) {
    console.error('Update member role error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 移除成员
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const currentUserId = await getUserIdFromToken(request)
    if (!currentUserId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id: projectId, userId: targetUserId } = await params

    // 检查权限
    const canManage = await hasProjectPermission(currentUserId, projectId, 'manage_members')
    if (!canManage) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 获取项目信息
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { name: true, ownerId: true }
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    // 不能移除项目创建者
    if (targetUserId === project.ownerId) {
      return NextResponse.json({ error: '不能移除项目创建者' }, { status: 400 })
    }

    // 获取成员信息
    const member = await db.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: targetUserId }
      },
      include: {
        user: {
          select: { name: true }
        }
      }
    })

    if (!member) {
      return NextResponse.json({ error: '成员不存在' }, { status: 404 })
    }

    // 删除成员
    await db.projectMember.delete({
      where: { id: member.id }
    })

    // 记录审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.DELETE,
        entityType: 'Project',
        entityId: projectId,
        userId: currentUserId,
        details: JSON.stringify({
          action: 'remove_member',
          projectName: project.name,
          removedUser: member.user.name
        })
      }
    })

    return NextResponse.json({ 
      success: true,
      message: '成员已移除'
    })
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
