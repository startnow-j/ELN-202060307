import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { AuditAction } from '@prisma/client'

// 获取模板列表
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const templates = await db.template.findMany({
      include: {
        creator: {
          select: { id: true, name: true, email: true, role: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // 转换数据格式
    const formattedTemplates = templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      content: template.content,
      tags: template.tags,
      isPublic: template.isPublic,
      creatorId: template.creatorId,
      creator: template.creator,
      createdAt: template.createdAt.toISOString()
    }))

    return NextResponse.json(formattedTemplates)
  } catch (error) {
    console.error('Get templates error:', error)
    return NextResponse.json({ error: '获取模板列表失败' }, { status: 500 })
  }
}

// 创建模板
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, content, tags, isPublic } = body

    if (!name) {
      return NextResponse.json({ error: '模板名称不能为空' }, { status: 400 })
    }

    const template = await db.template.create({
      data: {
        name,
        description,
        content: content || '',
        tags,
        isPublic: isPublic || false,
        creatorId: userId
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
        action: AuditAction.CREATE,
        entityType: 'Template',
        entityId: template.id,
        userId,
        details: JSON.stringify({ name: template.name })
      }
    })

    return NextResponse.json({
      id: template.id,
      name: template.name,
      description: template.description,
      content: template.content,
      tags: template.tags,
      isPublic: template.isPublic,
      creatorId: template.creatorId,
      creator: template.creator,
      createdAt: template.createdAt.toISOString()
    })
  } catch (error) {
    console.error('Create template error:', error)
    return NextResponse.json({ error: '创建模板失败' }, { status: 500 })
  }
}
