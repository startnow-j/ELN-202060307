import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { hasProjectPermission } from '@/lib/permissions'
import { generateProjectDocumentPath } from '@/lib/file-path'
import { AuditAction } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

// 获取项目文档列表
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
      select: { id: true, name: true }
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    // 获取文档列表
    const documents = await db.projectDocument.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Get project documents error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 上传项目文档
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
    
    // 检查项目是否存在
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, status: true }
    })

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    // 检查权限
    const canManage = await hasProjectPermission(userId, projectId, 'manage_docs')
    if (!canManage) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 解析 multipart/form-data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const documentType = formData.get('type') as string || 'OTHER'
    const description = formData.get('description') as string || ''

    if (!file) {
      return NextResponse.json({ error: '请上传文件' }, { status: 400 })
    }

    // 验证文档类型
    const validTypes = ['PROPOSAL', 'PROGRESS_REPORT', 'FINAL_REPORT', 'OTHER']
    if (!validTypes.includes(documentType)) {
      return NextResponse.json({ error: '无效的文档类型' }, { status: 400 })
    }

    // 生成文件路径
    const filePath = generateProjectDocumentPath(project.name, file.name)
    
    // 写入文件
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(filePath.fullPath, buffer)

    // 创建数据库记录
    const document = await db.projectDocument.create({
      data: {
        name: file.name,
        type: documentType as any,
        description: description || null,
        path: filePath.relativePath,
        size: file.size,
        projectId,
        uploaderId: userId
      },
      include: {
        uploader: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // 记录审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entityType: 'ProjectDocument',
        entityId: document.id,
        userId,
        details: JSON.stringify({
          projectId,
          projectName: project.name,
          documentName: file.name,
          documentType
        })
      }
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error('Upload project document error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
