/**
 * 批量文件下载API
 *
 * 功能：
 * - 根据选中的文件/文件夹路径列表打包下载
 * - 支持递归获取文件夹内的所有文件
 * - 生成ZIP压缩包
 *
 * 权限：SUPER_ADMIN
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import fs from 'fs'
import path from 'path'
import archiver from 'archiver'

interface SelectedPath {
  path: string
  type: 'file' | 'directory'
}

// 递归获取目录下所有文件
function getAllFiles(dirPath: string, basePath: string): { path: string; relativePath: string; size: number }[] {
  if (!fs.existsSync(dirPath)) return []

  const files: { path: string; relativePath: string; size: number }[] = []
  const items = fs.readdirSync(dirPath)

  for (const item of items) {
    const fullPath = path.join(dirPath, item)
    const stats = fs.statSync(fullPath)

    if (stats.isDirectory()) {
      files.push(...getAllFiles(fullPath, basePath))
    } else {
      files.push({
        path: fullPath,
        relativePath: fullPath.replace(basePath, '').replace(/^\/+/, ''),
        size: stats.size
      })
    }
  }

  return files
}

// 格式化文件大小
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 检查权限 - 仅超级管理员
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '无权限，仅超级管理员可下载文件' }, { status: 403 })
    }

    const body = await request.json()
    const { paths, downloadName } = body as { paths: SelectedPath[]; downloadName: string }

    if (!paths || paths.length === 0) {
      return NextResponse.json({ error: '未选择任何文件' }, { status: 400 })
    }

    const projectRoot = process.cwd()
    const uploadRoot = path.join(projectRoot, 'upload')

    // 收集所有要下载的文件
    const filesToDownload: { path: string; relativePath: string; size: number }[] = []

    for (const selectedPath of paths) {
      // 将相对路径转换为绝对路径
      let absolutePath: string
      if (selectedPath.path.startsWith('upload/') || selectedPath.path.startsWith('upload\\')) {
        // 相对路径，转换为绝对路径
        absolutePath = path.join(projectRoot, selectedPath.path)
      } else if (path.isAbsolute(selectedPath.path)) {
        // 已经是绝对路径
        absolutePath = selectedPath.path
      } else {
        // 其他格式，尝试作为相对路径处理
        absolutePath = path.join(projectRoot, 'upload', selectedPath.path)
      }

      // 规范化路径
      const normalizedPath = path.normalize(absolutePath)

      // 安全检查：确保路径在 upload 目录内
      if (!normalizedPath.startsWith(uploadRoot)) {
        console.log('跳过不在 upload 目录内的路径:', normalizedPath)
        continue
      }

      // 检查路径是否存在
      if (!fs.existsSync(normalizedPath)) {
        console.log('路径不存在:', normalizedPath)
        continue
      }

      const stats = fs.statSync(normalizedPath)

      if (stats.isDirectory()) {
        // 如果是目录，递归获取所有文件
        const dirFiles = getAllFiles(normalizedPath, uploadRoot)
        filesToDownload.push(...dirFiles)
      } else if (stats.isFile()) {
        // 如果是文件，直接添加
        filesToDownload.push({
          path: normalizedPath,
          relativePath: normalizedPath.replace(uploadRoot, '').replace(/^\/+/, ''),
          size: stats.size
        })
      }
    }

    if (filesToDownload.length === 0) {
      return NextResponse.json({ error: '没有找到可下载的文件' }, { status: 400 })
    }

    // 计算总大小
    const totalSize = filesToDownload.reduce((sum, f) => sum + f.size, 0)

    // 限制单次下载大小（例如 2GB）
    const maxDownloadSize = 2 * 1024 * 1024 * 1024
    if (totalSize > maxDownloadSize) {
      return NextResponse.json({
        error: `下载文件总大小超过限制（${formatSize(totalSize)} > 2GB），请减少选择的文件数量`
      }, { status: 400 })
    }

    // 创建 ZIP 流
    const archive = archiver('zip', {
      zlib: { level: 6 } // 压缩级别
    })

    // 添加文件到 ZIP
    for (const file of filesToDownload) {
      if (fs.existsSync(file.path)) {
        archive.file(file.path, { name: file.relativePath })
      }
    }

    // 设置响应头
    const headers = new Headers()
    headers.set('Content-Type', 'application/zip')
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName || 'download')}.zip"`)

    // 创建流式响应
    const stream = new ReadableStream({
      start(controller) {
        archive.on('data', (chunk) => {
          controller.enqueue(chunk)
        })

        archive.on('end', () => {
          controller.close()
        })

        archive.on('error', (err) => {
          controller.error(err)
        })

        archive.finalize()
      }
    })

    // 记录审计日志
    await db.auditLog.create({
      data: {
        action: 'DOWNLOAD' as const,
        entityType: 'File',
        entityId: null,
        userId,
        details: JSON.stringify({
          type: 'batch_download',
          fileCount: filesToDownload.length,
          totalSize: formatSize(totalSize),
          downloadName: downloadName || 'download'
        })
      }
    })

    return new NextResponse(stream, { headers })

  } catch (error) {
    console.error('Batch download error:', error)
    const errorMessage = error instanceof Error ? error.message : '下载失败'
    return NextResponse.json({ error: errorMessage, details: String(error) }, { status: 500 })
  }
}
