import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { AuditAction } from '@prisma/client'

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
    const { name, description, status, startDate, endDate, memberIds } = body

    // 检查权限
    const project = await db.project.findUnique({
      where: { id },
      include: { owner: true }
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (project.ownerId !== userId && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限编辑此项目' }, { status: 403 })
    }

    // 更新项目
    const updated = await db.project.update({
      where: { id },
      data: {
        name,
        description,
        status,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        members: memberIds ? {
          set: memberIds.map((id: string) => ({ id }))
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
        action: AuditAction.UPDATE,
        entityType: 'Project',
        entityId: id,
        userId,
        details: JSON.stringify({ name: updated.name })
      }
    })

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      status: updated.status,
      startDate: updated.startDate,
      endDate: updated.endDate,
      ownerId: updated.ownerId,
      owner: updated.owner,
      members: updated.members,
      createdAt: updated.createdAt.toISOString()
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

    // 检查权限
    const project = await db.project.findUnique({
      where: { id }
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (project.ownerId !== userId && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限删除此项目' }, { status: 403 })
    }

    // 删除项目（会级联删除关联）
    await db.project.delete({
      where: { id }
    })

    // 审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.DELETE,
        entityType: 'Project',
        entityId: id,
        userId,
        details: JSON.stringify({ name: project.name })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json({ error: '删除项目失败' }, { status: 500 })
  }
}
