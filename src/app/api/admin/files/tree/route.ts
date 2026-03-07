/**
 * 文件目录树API
 * 
 * 功能：
 * - 递归读取目录结构
 * - 支持按项目/用户筛选
 * - 返回树形结构数据
 * 
 * 权限：SUPER_ADMIN, ADMIN
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

interface FileNode {
  name: string
  type: 'file' | 'directory'
  size?: number
  sizeFormatted?: string
  modifiedAt?: string
  path: string
  children?: FileNode[]
}

// 格式化文件大小
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 读取目录树
function readDirectoryTree(dirPath: string, relativePath: string, maxDepth: number = 3, currentDepth: number = 0): FileNode[] {
  if (!fs.existsSync(dirPath) || currentDepth >= maxDepth) return []

  const nodes: FileNode[] = []
  const files = fs.readdirSync(dirPath)

  for (const file of files) {
    const fullPath = path.join(dirPath, file)
    const stats = fs.statSync(fullPath)
    const fileRelativePath = `${relativePath}/${file}`

    if (stats.isDirectory()) {
      nodes.push({
        name: file,
        type: 'directory',
        size: 0, // 目录大小需要递归计算，暂时不计算以提高性能
        modifiedAt: stats.mtime.toISOString(),
        path: fileRelativePath,
        children: readDirectoryTree(fullPath, fileRelativePath, maxDepth, currentDepth + 1)
      })
    } else {
      nodes.push({
        name: file,
        type: 'file',
        size: stats.size,
        sizeFormatted: formatSize(stats.size),
        modifiedAt: stats.mtime.toISOString(),
        path: fileRelativePath
      })
    }
  }

  // 排序：目录在前，文件在后，按名称排序
  return nodes.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name)
    return a.type === 'directory' ? -1 : 1
  })
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 检查权限
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // all | projects | drafts
    const projectId = searchParams.get('projectId')
    const maxDepth = parseInt(searchParams.get('depth') || '4')

    const uploadRoot = path.join(process.cwd(), 'upload')
    const result: {
      type: string
      name: string
      path: string
      tree: FileNode[]
    }[] = []

    // 项目文件
    if (type === 'all' || type === 'projects') {
      if (projectId) {
        // 指定项目
        const project = await db.project.findUnique({
          where: { id: projectId },
          select: { id: true, name: true }
        })
        
        if (project) {
          const safeName = project.name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').slice(0, 100)
          const projectDir = path.join(uploadRoot, 'projects', safeName)
          
          result.push({
            type: 'project',
            name: project.name,
            path: `upload/projects/${safeName}`,
            tree: readDirectoryTree(projectDir, `upload/projects/${safeName}`, maxDepth)
          })
        }
      } else {
        // 所有项目
        const projects = await db.project.findMany({
          select: { id: true, name: true, status: true },
          orderBy: { name: 'asc' }
        })

        for (const project of projects) {
          const safeName = project.name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').slice(0, 100)
          const projectDir = path.join(uploadRoot, 'projects', safeName)

          if (fs.existsSync(projectDir)) {
            result.push({
              type: 'project',
              name: project.name,
              path: `upload/projects/${safeName}`,
              tree: readDirectoryTree(projectDir, `upload/projects/${safeName}`, maxDepth)
            })
          }
        }
      }
    }

    // 暂存区文件
    if (type === 'all' || type === 'drafts') {
      const usersDir = path.join(uploadRoot, 'users')
      
      if (fs.existsSync(usersDir)) {
        const users = fs.readdirSync(usersDir)
        
        for (const userIdDir of users) {
          const userDir = path.join(usersDir, userIdDir)
          const stats = fs.statSync(userDir)
          
          if (stats.isDirectory()) {
            // 获取用户信息
            const user = await db.user.findUnique({
              where: { id: userIdDir },
              select: { id: true, name: true, email: true }
            })

            result.push({
              type: 'draft',
              name: user ? `${user.name} (${user.email})` : userIdDir,
              path: `upload/users/${userIdDir}`,
              tree: readDirectoryTree(userDir, `upload/users/${userIdDir}`, maxDepth)
            })
          }
        }
      }
    }

    return NextResponse.json({
      type,
      data: result
    })

  } catch (error) {
    console.error('Get file tree error:', error)
    return NextResponse.json({ error: '获取目录树失败' }, { status: 500 })
  }
}
