import { NextRequest, NextResponse } from 'next/server'
import * as path from 'path'
import * as fs from 'fs'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { hasProjectPermission } from '@/lib/permissions'
import { AuditAction } from '@prisma/client'

// 下载项目文档
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id: projectId, docId } = await params
    
    // 获取文档记录
    const document = await db.projectDocument.findFirst({
      where: { 
        id: docId,
        projectId 
      }
    })

    if (!document) {
      return NextResponse.json({ error: '文档不存在' }, { status: 404 })
    }

    // 检查文件是否存在
    const fullPath = path.join(process.cwd(), document.path)
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 })
    }

    // 读取文件
    const fileBuffer = fs.readFileSync(fullPath)

    // 返回文件
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(document.name)}`
      }
    })
  } catch (error) {
    console.error('Download project document error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 删除项目文档
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id: projectId, docId } = await params
    
    // 获取文档记录
    const document = await db.projectDocument.findFirst({
      where: { 
        id: docId,
        projectId 
      }
    })

    if (!document) {
      return NextResponse.json({ error: '文档不存在' }, { status: 404 })
    }

    // 检查权限
    const canManage = await hasProjectPermission(userId, projectId, 'manage_docs')
    if (!canManage) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 删除文件
    const fullPath = path.join(process.cwd(), document.path)
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }

    // 删除数据库记录
    await db.projectDocument.delete({
      where: { id: docId }
    })

    // 记录审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.DELETE,
        entityType: 'ProjectDocument',
        entityId: document.id,
        userId,
        details: JSON.stringify({
          projectId,
          documentName: document.name
        })
      }
    })

    return NextResponse.json({ success: true, message: '文档已删除' })
  } catch (error) {
    console.error('Delete project document error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
