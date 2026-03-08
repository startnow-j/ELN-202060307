import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken, hashPassword } from '@/lib/auth'
import { canManageUsers, canManageSuperAdminRole, isSuperAdmin } from '@/lib/permissions'
import { AuditAction } from '@prisma/client'

// 更新用户（超级管理员和管理员）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 权限检查：超级管理员和管理员可以访问
    const canManage = await canManageUsers(userId)
    if (!canManage) {
      return NextResponse.json({ error: '权限不足，仅管理员可以管理用户' }, { status: 403 })
    }

    const { id: targetUserId } = await params
    const body = await request.json()
    const { name, role, isActive, password } = body

    // 检查目标用户是否存在
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId }
    })

    if (!targetUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // ADMIN 不能修改 SUPER_ADMIN 账户
    const isCurrentUserSuperAdmin = await isSuperAdmin(userId)
    if (targetUser.role === 'SUPER_ADMIN' && !isCurrentUserSuperAdmin) {
      return NextResponse.json({ error: '权限不足，只有超级管理员可以修改超级管理员账户' }, { status: 403 })
    }

    // 保护机制：不能修改自己的角色
    if (targetUserId === userId && role && role !== targetUser.role) {
      return NextResponse.json({ error: '不能修改自己的角色' }, { status: 400 })
    }

    // 角色限制：ADMIN 不能将用户角色修改为 SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && !isCurrentUserSuperAdmin) {
      return NextResponse.json({ error: '权限不足，只有超级管理员可以将用户提升为超级管理员' }, { status: 403 })
    }

    // 保护机制：系统至少保留一个超级管理员
    if (targetUser.role === 'SUPER_ADMIN' && role && role !== 'SUPER_ADMIN') {
      const superAdminCount = await db.user.count({
        where: { role: 'SUPER_ADMIN' }
      })
      if (superAdminCount <= 1) {
        return NextResponse.json({ error: '系统至少需要一个超级管理员' }, { status: 400 })
      }
    }

    // 构建更新数据
    const updateData: {
      name?: string
      role?: string
      isActive?: boolean
      password?: string
    } = {}
    
    if (name) updateData.name = name
    if (role) updateData.role = role
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (password) updateData.password = await hashPassword(password)

    // 更新用户
    const updated = await db.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        updatedAt: true
      }
    })

    // 审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'User',
        entityId: updated.id,
        userId,
        details: JSON.stringify({
          changes: updateData,
          previousRole: targetUser.role
        })
      }
    })

    return NextResponse.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      avatar: updated.avatar,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt.toISOString()
    })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 })
  }
}

// 禁用用户（超级管理员和管理员）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 权限检查：超级管理员和管理员可以访问
    const canManage = await canManageUsers(userId)
    if (!canManage) {
      return NextResponse.json({ error: '权限不足，仅管理员可以管理用户' }, { status: 403 })
    }

    const { id: targetUserId } = await params

    // 检查目标用户是否存在
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId }
    })

    if (!targetUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // ADMIN 不能禁用 SUPER_ADMIN 账户
    const isCurrentUserSuperAdmin = await isSuperAdmin(userId)
    if (targetUser.role === 'SUPER_ADMIN' && !isCurrentUserSuperAdmin) {
      return NextResponse.json({ error: '权限不足，只有超级管理员可以禁用超级管理员账户' }, { status: 403 })
    }

    // 不能禁用自己
    if (targetUserId === userId) {
      return NextResponse.json({ error: '不能禁用自己的账户' }, { status: 400 })
    }

    // 保护机制：不能禁用最后一个超级管理员
    if (targetUser.role === 'SUPER_ADMIN') {
      const superAdminCount = await db.user.count({
        where: { role: 'SUPER_ADMIN', isActive: true }
      })
      if (superAdminCount <= 1) {
        return NextResponse.json({ error: '系统至少需要一个活跃的超级管理员' }, { status: 400 })
      }
    }

    // 禁用用户（软删除）
    const updated = await db.user.update({
      where: { id: targetUserId },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true
      }
    })

    // 审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.DELETE,
        entityType: 'User',
        entityId: updated.id,
        userId,
        details: JSON.stringify({ action: 'disabled', email: updated.email })
      }
    })

    return NextResponse.json({ 
      message: '用户已禁用',
      user: updated 
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: '禁用用户失败' }, { status: 500 })
  }
}
