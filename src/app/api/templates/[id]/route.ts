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
    const { name, description, content, tags, isPublic } = body

    // 检查权限
    const template = await db.template.findUnique({
      where: { id }
    })

    if (!template) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 })
    }

    if (template.creatorId !== userId) {
      return NextResponse.json({ error: '无权限编辑此模板' }, { status: 403 })
    }

    // 更新模板
    const updated = await db.template.update({
      where: { id },
      data: {
        name,
        description,
        content,
        tags,
        isPublic
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true, role: true, avatar: true }
        }
      }
    })

    // 审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'Template',
        entityId: id,
        userId,
        details: JSON.stringify({ name: updated.name })
      }
    })

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      content: updated.content,
      tags: updated.tags,
      isPublic: updated.isPublic,
      creatorId: updated.creatorId,
      creator: updated.creator,
      createdAt: updated.createdAt.toISOString()
    })
  } catch (error) {
    console.error('Update template error:', error)
    return NextResponse.json({ error: '更新模板失败' }, { status: 500 })
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
    const template = await db.template.findUnique({
      where: { id }
    })

    if (!template) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 })
    }

    if (template.creatorId !== userId) {
      return NextResponse.json({ error: '无权限删除此模板' }, { status: 403 })
    }

    // 删除模板
    await db.template.delete({
      where: { id }
    })

    // 审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.DELETE,
        entityType: 'Template',
        entityId: id,
        userId,
        details: JSON.stringify({ name: template.name })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete template error:', error)
    return NextResponse.json({ error: '删除模板失败' }, { status: 500 })
  }
}
