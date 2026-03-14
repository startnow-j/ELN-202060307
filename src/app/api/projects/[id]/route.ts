import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { canDeleteProject, isAdmin, canAccessArchivedProject, getProjectRole } from '@/lib/permissions'
import { AuditAction } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

// 获取单个项目详情
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

    const project = await db.project.findUnique({
      where: { id },
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

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    // ARCHIVED 状态的权限检查
    if (project.status === 'ARCHIVED') {
      const accessCheck = await canAccessArchivedProject(userId, id)
      
      if (!accessCheck.canAccess) {
        return NextResponse.json({ 
          error: accessCheck.reason || '已归档项目仅对项目成员可见',
          isArchived: true 
        }, { status: 403 })
      }

      // 返回项目数据，标记归档状态和访问级别
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
        projectMembers: project.projectMembers.map(pm => ({
          ...pm.user,
          projectRole: pm.role
        })),
        createdAt: project.createdAt.toISOString(),
        isArchived: true,
        accessLevel: accessCheck.accessLevel, // 'full' | 'readonly'
        canEdit: false, // 归档项目不可编辑
        canChangeStatus: accessCheck.accessLevel === 'full' // 只有管理员可以解除归档
      })
    }

    // 非 ARCHIVED 状态的正常返回
    const adminCheck = await isAdmin(userId)
    const projectRole = await getProjectRole(userId, id)
    const isOwner = project.ownerId === userId
    const canManage = adminCheck || isOwner || projectRole === 'PROJECT_LEAD'

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
      projectMembers: project.projectMembers.map(pm => ({
        ...pm.user,
        projectRole: pm.role
      })),
      createdAt: project.createdAt.toISOString(),
      isArchived: false,
      canEdit: canManage && project.status === 'ACTIVE',
      canChangeStatus: canManage,
      myRole: projectRole
    })
  } catch (error) {
    console.error('Get project error:', error)
    return NextResponse.json({ error: '获取项目失败' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    // 注意：status 字段已移除，状态变更请使用 /api/projects/[id]/status 接口
    const { name, description, startDate, endDate, expectedEndDate, primaryLeader, memberIds } = body

    // 检查权限
    const project = await db.project.findUnique({
      where: { id },
      include: { 
        owner: true, 
        projectMembers: true,
      }
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    // 权限检查：超级管理员、管理员、项目负责人可以编辑
    const adminCheck = await isAdmin(userId)
    const isOwner = project.ownerId === userId
    const isProjectLead = project.projectMembers.some(
      m => m.userId === userId && m.role === 'PROJECT_LEAD'
    )

    if (!adminCheck && !isOwner && !isProjectLead) {
      return NextResponse.json({ error: '无权限编辑此项目' }, { status: 403 })
    }

    // 更新项目（状态变更已移至专用接口 /api/projects/[id]/status）
    const updated = await db.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        // 状态变更请使用专用接口: PUT /api/projects/[id]/status
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(expectedEndDate !== undefined && { expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null }),
        ...(primaryLeader !== undefined && { primaryLeader }),
        ...(memberIds && { members: { set: memberIds.map((id: string) => ({ id })) } })
      },
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

    // 审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'Project',
        entityId: id,
        userId,
        details: JSON.stringify({ 
          name: updated.name, 
          changes: body,
          note: '状态变更请使用专用接口'
        })
      }
    })

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      status: updated.status,
      startDate: updated.startDate?.toISOString() || null,
      endDate: updated.endDate?.toISOString() || null,
      expectedEndDate: updated.expectedEndDate?.toISOString() || null,
      actualEndDate: updated.actualEndDate?.toISOString() || null,
      completedAt: updated.completedAt?.toISOString() || null,
      archivedAt: updated.archivedAt?.toISOString() || null,
      primaryLeader: updated.primaryLeader,
      ownerId: updated.ownerId,
      owner: updated.owner,
      members: updated.members,
      projectMembers: updated.projectMembers.map(pm => ({
        ...pm.user,
        projectRole: pm.role
      })),
      createdAt: updated.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Update project error:', error)
    return NextResponse.json({ error: '更新项目失败' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params

    // 权限检查：仅超级管理员可以删除项目
    const canDelete = await canDeleteProject(userId)
    if (!canDelete) {
      return NextResponse.json({ error: '权限不足，仅超级管理员可以删除项目' }, { status: 403 })
    }

    // 检查项目是否存在
    const project = await db.project.findUnique({
      where: { id },
      include: {
        experimentProjects: {
          include: {
            experiment: {
              include: {
                attachments: true
              }
            }
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    // 收集需要删除的物理文件
    const projectDir = path.join(process.cwd(), 'upload', 'projects', project.name)
    
    // 删除项目（会级联删除关联数据）
    await db.project.delete({
      where: { id }
    })

    // 删除物理文件目录
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true })
    }

    // 审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.DELETE,
        entityType: 'Project',
        entityId: id,
        userId,
        details: JSON.stringify({ 
          name: project.name,
          deletedFiles: fs.existsSync(projectDir) ? 'yes' : 'no'
        })
      }
    })

    return NextResponse.json({ success: true, message: '项目已删除' })
  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json({ error: '删除项目失败' }, { status: 500 })
  }
}
