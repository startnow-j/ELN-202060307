import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken, hashPassword } from '@/lib/auth'
import { canManageUsers, canManageSuperAdminRole } from '@/lib/permissions'
import { AuditAction } from '@prisma/client'

// 获取用户列表（超级管理员和管理员）
export async function GET(request: NextRequest) {
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

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            experiments: true,
            ownedProjects: true,
            projectMemberships: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      experimentCount: user._count.experiments,
      ownedProjectCount: user._count.ownedProjects,
      memberProjectCount: user._count.projectMemberships
    }))

    return NextResponse.json(formattedUsers)
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 })
  }
}

// 创建用户（超级管理员和管理员）
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { email, name, password, role } = body

    if (!email || !name || !password) {
      return NextResponse.json({ error: '邮箱、姓名和密码不能为空' }, { status: 400 })
    }

    // 检查邮箱是否已存在
    const existing = await db.user.findUnique({
      where: { email }
    })

    if (existing) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 400 })
    }

    // 角色限制：ADMIN 不能创建 SUPER_ADMIN 账号
    const canManageSuperAdmin = await canManageSuperAdminRole(userId)
    const finalRole = role || 'RESEARCHER'
    if (finalRole === 'SUPER_ADMIN' && !canManageSuperAdmin) {
      return NextResponse.json({ error: '权限不足，只有超级管理员可以创建超级管理员账号' }, { status: 403 })
    }

    // 创建用户
    const user = await db.user.create({
      data: {
        email,
        name,
        password: await hashPassword(password),
        role: finalRole,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true
      }
    })

    // 审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entityType: 'User',
        entityId: user.id,
        userId,
        details: JSON.stringify({ email: user.email, name: user.name, role: user.role })
      }
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString()
    })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: '创建用户失败' }, { status: 500 })
  }
}
