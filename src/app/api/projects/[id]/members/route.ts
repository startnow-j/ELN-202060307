import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { hasProjectPermission } from '@/lib/permissions'
import { AuditAction, ProjectMemberRole } from '@prisma/client'

// 获取项目成员列表
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
      select: { id: true }
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    // 获取项目成员（包括负责人和成员表中的成员）
    const members = await db.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, avatar: true }
        }
      },
      orderBy: { joinedAt: 'asc' }
    })

    // 获取项目创建者信息
    const projectWithOwner = await db.project.findUnique({
      where: { id: projectId },
      select: {
        ownerId: true,
        owner: {
          select: { id: true, name: true, email: true, role: true, avatar: true }
        }
      }
    })

    // 合并成员列表（确保创建者在列表中）
    const memberList = members.map(m => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.user.role,
      avatar: m.user.avatar,
      projectRole: m.role,
      joinedAt: m.joinedAt.toISOString()
    }))

    // 如果创建者不在成员表中，添加为负责人
    if (projectWithOwner && !memberList.find(m => m.id === projectWithOwner.ownerId)) {
      memberList.unshift({
        id: projectWithOwner.owner.id,
        name: projectWithOwner.owner.name,
        email: projectWithOwner.owner.email,
        role: projectWithOwner.owner.role,
        avatar: projectWithOwner.owner.avatar,
        projectRole: 'PROJECT_LEAD',
        joinedAt: null
      })
    }

    return NextResponse.json(memberList)
  } catch (error) {
    console.error('Get project members error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 添加成员到项目
export async function POST(
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
    const { userIds, role = 'MEMBER' } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: '请选择要添加的成员' }, { status: 400 })
    }

    // 检查权限
    const canManage = await hasProjectPermission(userId, projectId, 'manage_members')
    if (!canManage) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 检查项目是否存在
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { name: true }
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    // 验证角色
    const validRoles: ProjectMemberRole[] = ['PROJECT_LEAD', 'MEMBER', 'VIEWER']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: '无效的角色' }, { status: 400 })
    }

    // 添加成员
    const results = []
    for (const newUserId of userIds) {
      // 检查用户是否存在
      const user = await db.user.findUnique({
        where: { id: newUserId },
        select: { id: true, name: true, email: true }
      })

      if (!user) continue

      // 检查是否已经是成员
      const existing = await db.projectMember.findUnique({
        where: {
          projectId_userId: { projectId, userId: newUserId }
        }
      })

      if (existing) {
        // 更新角色
        const updated = await db.projectMember.update({
          where: { id: existing.id },
          data: { role }
        })
        results.push({ ...user, projectRole: updated.role, action: 'updated' })
      } else {
        // 添加新成员
        const member = await db.projectMember.create({
          data: {
            projectId,
            userId: newUserId,
            role
          }
        })
        results.push({ ...user, projectRole: member.role, action: 'added' })
      }
    }

    // 记录审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'Project',
        entityId: projectId,
        userId,
        details: JSON.stringify({
          action: 'add_members',
          projectName: project.name,
          members: results
        })
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: `成功添加 ${results.filter(r => r.action === 'added').length} 个成员`,
      results 
    })
  } catch (error) {
    console.error('Add project members error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
