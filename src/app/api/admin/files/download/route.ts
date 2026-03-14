/**
 * 文件打包下载API
 * 
 * 功能：
 * - 按项目打包下载所有文件
 * - 按用户打包下载暂存区文件
 * - 支持选择性打包下载
 * 
 * 权限：仅 SUPER_ADMIN
 * 
 * 注意：为保护数据安全，下载功能仅对超级管理员开放
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import fs from 'fs'
import path from 'path'
import archiver from 'archiver'

// 格式化文件大小
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 递归添加目录到zip
function addDirectoryToZip(archive: archiver.Archiver, dirPath: string, zipPath: string) {
  if (!fs.existsSync(dirPath)) return

  const files = fs.readdirSync(dirPath)
  for (const file of files) {
    const fullPath = path.join(dirPath, file)
    const stats = fs.statSync(fullPath)

    if (stats.isDirectory()) {
      addDirectoryToZip(archive, fullPath, `${zipPath}/${file}`)
    } else {
      archive.file(fullPath, { name: `${zipPath}/${file}` })
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 检查权限 - 仅超级管理员可下载
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '无权限访问，仅超级管理员可下载文件' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // project | draft | experiment
    const id = searchParams.get('id') // 项目ID | 用户ID | 实验ID

    if (!type || !id) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    const uploadRoot = path.join(process.cwd(), 'upload')
    let sourcePath: string
    let zipName: string

    switch (type) {
      case 'project': {
        const project = await db.project.findUnique({
          where: { id },
          select: { name: true }
        })
        if (!project) {
          return NextResponse.json({ error: '项目不存在' }, { status: 404 })
        }
        const safeName = project.name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').slice(0, 100)
        sourcePath = path.join(uploadRoot, 'projects', safeName)
        zipName = `${safeName}_${new Date().toISOString().slice(0, 10)}`
        break
      }
      case 'draft': {
        const user = await db.user.findUnique({
          where: { id },
          select: { name: true }
        })
        sourcePath = path.join(uploadRoot, 'users', id)
        zipName = `drafts_${user?.name || id}_${new Date().toISOString().slice(0, 10)}`
        break
      }
      case 'experiment': {
        const experiment = await db.experiment.findUnique({
          where: { id },
          include: {
            experimentProjects: {
              include: { project: true }
            }
          }
        })
        if (!experiment) {
          return NextResponse.json({ error: '实验不存在' }, { status: 404 })
        }

        // 确定实验目录
        const datePrefix = experiment.createdAt.toISOString().slice(0, 10).replace(/-/g, '')
        const safeTitle = experiment.title.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').slice(0, 100)
        const expDirName = `${datePrefix}_${safeTitle}`

        if (experiment.storageLocation === 'draft') {
          sourcePath = path.join(uploadRoot, 'users', experiment.authorId, 'drafts', expDirName)
        } else {
          const project = experiment.experimentProjects[0]?.project
          if (project) {
            const safeProjectName = project.name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').slice(0, 100)
            sourcePath = path.join(uploadRoot, 'projects', safeProjectName, 'experiments', expDirName)
          } else {
            sourcePath = path.join(uploadRoot, 'users', experiment.authorId, 'drafts', expDirName)
          }
        }
        zipName = `${expDirName}`
        break
      }
      default:
        return NextResponse.json({ error: '无效的类型' }, { status: 400 })
    }

    if (!fs.existsSync(sourcePath)) {
      return NextResponse.json({ error: '文件目录不存在' }, { status: 404 })
    }

    // 创建ZIP流
    const archive = archiver('zip', { zlib: { level: 9 } })
    const chunks: Buffer[] = []

    archive.on('data', (chunk) => chunks.push(chunk))
    archive.on('error', (err) => { throw err })

    // 添加目录内容到zip
    addDirectoryToZip(archive, sourcePath, zipName)
    archive.finalize()

    // 等待压缩完成
    await new Promise<void>((resolve, reject) => {
      archive.on('end', () => resolve())
      archive.on('error', (err) => reject(err))
    })

    const zipBuffer = Buffer.concat(chunks)

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(zipName)}.zip"`,
        'Content-Length': zipBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('Download files error:', error)
    return NextResponse.json({ error: '打包下载失败' }, { status: 500 })
  }
}
