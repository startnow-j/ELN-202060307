/**
 * 孤立文件检测API
 * 
 * 功能：
 * - 扫描物理文件目录
 * - 对比数据库记录
 * - 识别孤立文件（物理存在但数据库无记录）
 * - 提供清理建议
 * 
 * 权限：SUPER_ADMIN
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

interface OrphanedFile {
  path: string
  relativePath: string
  size: number
  sizeFormatted: string
  modifiedAt: string
  type: 'attachment_orphan' | 'user_deleted' | 'project_orphan' | 'temp_file'
  suggestion: 'delete' | 'review' | 'keep'
  reason: string
}

interface OrphanedDirectory {
  path: string
  relativePath: string
  type: 'user_deleted' | 'project_orphan' | 'experiment_orphan'
  fileCount: number
  size: number
  sizeFormatted: string
  files: OrphanedFile[]
}

// 格式化文件大小
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 递归获取目录下所有文件
// relativePath 不含 'upload/' 前缀，以匹配数据库存储格式
function getAllFiles(dirPath: string, uploadRoot: string): { path: string; relativePath: string; size: number; modifiedAt: Date }[] {
  if (!fs.existsSync(dirPath)) return []

  const files: { path: string; relativePath: string; size: number; modifiedAt: Date }[] = []
  const items = fs.readdirSync(dirPath)

  for (const item of items) {
    const fullPath = path.join(dirPath, item)
    const stats = fs.statSync(fullPath)

    if (stats.isDirectory()) {
      files.push(...getAllFiles(fullPath, uploadRoot))
    } else {
      // 生成不含 'upload/' 前缀的相对路径，以匹配数据库存储格式
      // 例如：/home/z/my-project/upload/projects/xxx/... -> projects/xxx/...
      const relativePath = fullPath
        .replace(uploadRoot, '')
        .replace(/^\/+/, '')

      files.push({
        path: fullPath,
        relativePath,
        size: stats.size,
        modifiedAt: stats.mtime
      })
    }
  }

  return files
}

// 计算目录大小和文件数
function getDirStats(dirPath: string): { size: number; fileCount: number } {
  if (!fs.existsSync(dirPath)) return { size: 0, fileCount: 0 }
  
  let size = 0
  let fileCount = 0
  const items = fs.readdirSync(dirPath)
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item)
    const stats = fs.statSync(fullPath)
    
    if (stats.isDirectory()) {
      const subStats = getDirStats(fullPath)
      size += subStats.size
      fileCount += subStats.fileCount
    } else {
      size += stats.size
      fileCount++
    }
  }
  
  return { size, fileCount }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 检查权限 - 仅超级管理员可以访问
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '无权限访问，仅超级管理员可查看孤立文件' }, { status: 403 })
    }

    const projectRoot = process.cwd()
    const uploadRoot = path.join(projectRoot, 'upload')
    const usersRoot = path.join(uploadRoot, 'users')
    const projectsRoot = path.join(uploadRoot, 'projects')

    const orphanedFiles: OrphanedFile[] = []
    const orphanedDirectories: OrphanedDirectory[] = []

    // 1. 检查用户暂存区目录
    if (fs.existsSync(usersRoot)) {
      const userDirs = fs.readdirSync(usersRoot)
      
      for (const userDir of userDirs) {
        const userPath = path.join(usersRoot, userDir)
        const stats = fs.statSync(userPath)
        
        if (!stats.isDirectory()) continue
        
        // 检查用户是否存在
        const userExists = await db.user.findUnique({
          where: { id: userDir },
          select: { id: true }
        })
        
        if (!userExists) {
          // 用户已被删除，目录残留
          const dirStats = getDirStats(userPath)
          
          if (dirStats.fileCount > 0) {
            orphanedDirectories.push({
              path: userPath,
              relativePath: `upload/users/${userDir}`,
              type: 'user_deleted',
              fileCount: dirStats.fileCount,
              size: dirStats.size,
              sizeFormatted: formatSize(dirStats.size),
              files: getAllFiles(userPath, uploadRoot).map(f => ({
                path: f.path,
                relativePath: f.relativePath,
                size: f.size,
                sizeFormatted: formatSize(f.size),
                modifiedAt: f.modifiedAt.toISOString(),
                type: 'user_deleted' as const,
                suggestion: 'delete' as const,
                reason: '用户已删除，文件可安全清理'
              }))
            })
          }
        } else {
          // 用户存在，检查单个文件是否有对应记录
          const files = getAllFiles(userPath, uploadRoot)
          
          for (const file of files) {
            // 检查文件是否在数据库中有记录
            const attachment = await db.attachment.findFirst({
              where: { path: file.relativePath },
              select: { id: true }
            })
            
            if (!attachment) {
              orphanedFiles.push({
                path: file.path,
                relativePath: file.relativePath,
                size: file.size,
                sizeFormatted: formatSize(file.size),
                modifiedAt: file.modifiedAt.toISOString(),
                type: 'attachment_orphan',
                suggestion: 'review',
                reason: '文件无数据库记录，可能是上传后未关联或记录被删除'
              })
            }
          }
        }
      }
    }

    // 2. 检查项目目录
    if (fs.existsSync(projectsRoot)) {
      const projectDirs = fs.readdirSync(projectsRoot)
      
      for (const projectDir of projectDirs) {
        const projectPath = path.join(projectsRoot, projectDir)
        const stats = fs.statSync(projectPath)
        
        if (!stats.isDirectory()) continue
        
        // 检查项目是否存在（通过目录名匹配项目名）
        const project = await db.project.findFirst({
          where: { name: projectDir },
          select: { id: true, name: true }
        })
        
        if (!project) {
          // 项目已被删除或重命名，目录残留
          const dirStats = getDirStats(projectPath)
          
          if (dirStats.fileCount > 0) {
            orphanedDirectories.push({
              path: projectPath,
              relativePath: `upload/projects/${projectDir}`,
              type: 'project_orphan',
              fileCount: dirStats.fileCount,
              size: dirStats.size,
              sizeFormatted: formatSize(dirStats.size),
              files: getAllFiles(projectPath, uploadRoot).map(f => ({
                path: f.path,
                relativePath: f.relativePath,
                size: f.size,
                sizeFormatted: formatSize(f.size),
                modifiedAt: f.modifiedAt.toISOString(),
                type: 'project_orphan' as const,
                suggestion: 'review' as const,
                reason: '项目目录无对应数据库记录，可能是项目被重命名或删除'
              }))
            })
          }
        } else {
          // 项目存在，检查单个文件
          const files = getAllFiles(projectPath, uploadRoot)
          
          for (const file of files) {
            const attachment = await db.attachment.findFirst({
              where: { path: file.relativePath },
              select: { id: true }
            })
            
            if (!attachment) {
              orphanedFiles.push({
                path: file.path,
                relativePath: file.relativePath,
                size: file.size,
                sizeFormatted: formatSize(file.size),
                modifiedAt: file.modifiedAt.toISOString(),
                type: 'attachment_orphan',
                suggestion: 'review',
                reason: '文件无数据库记录'
              })
            }
          }
        }
      }
    }

    // 3. 检查统一存储目录 (files/images) 中的孤立文件
    const filesRoot = path.join(uploadRoot, 'files')
    const imagesRoot = path.join(uploadRoot, 'images')

    // 检查 files 目录
    if (fs.existsSync(filesRoot)) {
      const files = getAllFiles(filesRoot, uploadRoot)

      for (const file of files) {
        const attachment = await db.attachment.findFirst({
          where: { path: file.relativePath },
          select: { id: true }
        })

        if (!attachment) {
          orphanedFiles.push({
            path: file.path,
            relativePath: file.relativePath,
            size: file.size,
            sizeFormatted: formatSize(file.size),
            modifiedAt: file.modifiedAt.toISOString(),
            type: 'attachment_orphan',
            suggestion: 'review',
            reason: '统一存储目录中的孤立文件，无数据库记录'
          })
        }
      }
    }

    // 检查 images 目录
    if (fs.existsSync(imagesRoot)) {
      const files = getAllFiles(imagesRoot, uploadRoot)

      for (const file of files) {
        const attachment = await db.attachment.findFirst({
          where: { path: file.relativePath },
          select: { id: true }
        })

        if (!attachment) {
          orphanedFiles.push({
            path: file.path,
            relativePath: file.relativePath,
            size: file.size,
            sizeFormatted: formatSize(file.size),
            modifiedAt: file.modifiedAt.toISOString(),
            type: 'attachment_orphan',
            suggestion: 'review',
            reason: '统一存储目录中的孤立图片，无数据库记录'
          })
        }
      }
    }

    // 统计汇总
    const summary = {
      totalOrphanedFiles: orphanedFiles.length + orphanedDirectories.reduce((sum, d) => sum + d.files.length, 0),
      totalSize: orphanedFiles.reduce((sum, f) => sum + f.size, 0) + orphanedDirectories.reduce((sum, d) => sum + d.size, 0),
      totalSizeFormatted: formatSize(
        orphanedFiles.reduce((sum, f) => sum + f.size, 0) + 
        orphanedDirectories.reduce((sum, d) => sum + d.size, 0)
      ),
      byType: {
        userDeleted: {
          count: orphanedDirectories.filter(d => d.type === 'user_deleted').length,
          fileCount: orphanedDirectories.filter(d => d.type === 'user_deleted').reduce((sum, d) => sum + d.fileCount, 0),
          size: orphanedDirectories.filter(d => d.type === 'user_deleted').reduce((sum, d) => sum + d.size, 0)
        },
        projectOrphan: {
          count: orphanedDirectories.filter(d => d.type === 'project_orphan').length,
          fileCount: orphanedDirectories.filter(d => d.type === 'project_orphan').reduce((sum, d) => sum + d.fileCount, 0),
          size: orphanedDirectories.filter(d => d.type === 'project_orphan').reduce((sum, d) => sum + d.size, 0)
        },
        attachmentOrphan: {
          count: orphanedFiles.filter(f => f.type === 'attachment_orphan').length,
          size: orphanedFiles.filter(f => f.type === 'attachment_orphan').reduce((sum, f) => sum + f.size, 0)
        }
      }
    }

    return NextResponse.json({
      summary,
      orphanedFiles: orphanedFiles.slice(0, 100), // 限制返回数量
      orphanedDirectories,
      hasMore: orphanedFiles.length > 100
    })

  } catch (error) {
    console.error('Orphaned files scan error:', error)
    return NextResponse.json({ error: '扫描孤立文件失败' }, { status: 500 })
  }
}

// 清理孤立文件
export async function DELETE(request: NextRequest) {
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
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const body = await request.json()
    const { paths, type } = body as { paths: string[]; type: 'all' | 'user_deleted' | 'project_orphan' | 'attachment_orphan' }

    const uploadRoot = path.join(process.cwd(), 'upload')
    const deletedFiles: string[] = []
    const failedFiles: { path: string; error: string }[] = []

    if (type === 'all' || type === 'user_deleted') {
      // 清理已删除用户的目录
      const usersRoot = path.join(uploadRoot, 'users')
      if (fs.existsSync(usersRoot)) {
        const userDirs = fs.readdirSync(usersRoot)
        for (const userDir of userDirs) {
          const userExists = await db.user.findUnique({ where: { id: userDir } })
          if (!userExists) {
            const userPath = path.join(usersRoot, userDir)
            try {
              fs.rmSync(userPath, { recursive: true, force: true })
              deletedFiles.push(`upload/users/${userDir}`)
            } catch (e) {
              failedFiles.push({ path: userPath, error: String(e) })
            }
          }
        }
      }
    }

    if (type === 'all' || type === 'project_orphan') {
      // 清理无项目记录的目录
      const projectsRoot = path.join(uploadRoot, 'projects')
      if (fs.existsSync(projectsRoot)) {
        const projectDirs = fs.readdirSync(projectsRoot)
        for (const projectDir of projectDirs) {
          const project = await db.project.findFirst({ where: { name: projectDir } })
          if (!project) {
            const projectPath = path.join(projectsRoot, projectDir)
            try {
              fs.rmSync(projectPath, { recursive: true, force: true })
              deletedFiles.push(`upload/projects/${projectDir}`)
            } catch (e) {
              failedFiles.push({ path: projectPath, error: String(e) })
            }
          }
        }
      }
    }

    if (type === 'all' || type === 'attachment_orphan') {
      // 清理统一存储目录中的孤立文件
      const projectRoot = process.cwd()

      // 检查 files 目录
      const filesRoot = path.join(uploadRoot, 'files')
      if (fs.existsSync(filesRoot)) {
        const files = getAllFiles(filesRoot, uploadRoot)
        for (const file of files) {
          const attachment = await db.attachment.findFirst({
            where: { path: file.relativePath }
          })
          if (!attachment) {
            try {
              fs.unlinkSync(file.path)
              deletedFiles.push(file.relativePath)
            } catch (e) {
              failedFiles.push({ path: file.path, error: String(e) })
            }
          }
        }
      }

      // 检查 images 目录
      const imagesRoot = path.join(uploadRoot, 'images')
      if (fs.existsSync(imagesRoot)) {
        const files = getAllFiles(imagesRoot, uploadRoot)
        for (const file of files) {
          const attachment = await db.attachment.findFirst({
            where: { path: file.relativePath }
          })
          if (!attachment) {
            try {
              fs.unlinkSync(file.path)
              deletedFiles.push(file.relativePath)
            } catch (e) {
              failedFiles.push({ path: file.path, error: String(e) })
            }
          }
        }
      }

      // 检查用户暂存区中的孤立文件（用户存在但文件无记录）
      const usersRoot = path.join(uploadRoot, 'users')
      if (fs.existsSync(usersRoot)) {
        const userDirs = fs.readdirSync(usersRoot)
        for (const userDir of userDirs) {
          const userExists = await db.user.findUnique({ where: { id: userDir } })
          if (userExists) {
            const userPath = path.join(usersRoot, userDir)
            const files = getAllFiles(userPath, uploadRoot)
            for (const file of files) {
              const attachment = await db.attachment.findFirst({
                where: { path: file.relativePath }
              })
              if (!attachment) {
                try {
                  fs.unlinkSync(file.path)
                  deletedFiles.push(file.relativePath)
                } catch (e) {
                  failedFiles.push({ path: file.path, error: String(e) })
                }
              }
            }
          }
        }
      }

      // 检查项目目录中的孤立文件（项目存在但文件无记录）
      const projectsRoot = path.join(uploadRoot, 'projects')
      if (fs.existsSync(projectsRoot)) {
        const projectDirs = fs.readdirSync(projectsRoot)
        for (const projectDir of projectDirs) {
          // 只处理存在的项目目录中的孤立文件
          const project = await db.project.findFirst({ where: { name: projectDir } })
          if (project) {
            // 项目存在，检查其中的孤立文件
            const projectPath = path.join(projectsRoot, projectDir)
            const files = getAllFiles(projectPath, uploadRoot)
            for (const file of files) {
              const attachment = await db.attachment.findFirst({
                where: { path: file.relativePath }
              })
              if (!attachment) {
                try {
                  fs.unlinkSync(file.path)
                  deletedFiles.push(file.relativePath)
                } catch (e) {
                  failedFiles.push({ path: file.path, error: String(e) })
                }
              }
            }
          }
          // 如果项目不存在，则属于 project_orphan 类型，已在上面的 project_orphan 逻辑中处理
        }
      }
    }

    // 记录审计日志（异步执行，失败不影响清理结果）
    // 使用 Promise.resolve 包裹以避免阻塞响应
    Promise.resolve().then(async () => {
      try {
        await db.auditLog.create({
          data: {
            action: 'DELETE',
            entityType: 'OrphanedFiles',
            entityId: null,
            userId,
            details: JSON.stringify({
              type,
              deletedCount: deletedFiles.length,
              failedCount: failedFiles.length,
              deletedPaths: deletedFiles.slice(0, 20),
              failedPaths: failedFiles.slice(0, 5)
            })
          }
        })
      } catch (auditError) {
        console.error('Audit log failed (non-critical):', auditError)
      }
    })

    return NextResponse.json({
      success: true,
      deletedCount: deletedFiles.length,
      failedCount: failedFiles.length,
      deletedFiles: deletedFiles.slice(0, 20),
      failedFiles: failedFiles.slice(0, 10)
    })

  } catch (error) {
    console.error('Clean orphaned files error:', error)
    return NextResponse.json({ error: '清理孤立文件失败' }, { status: 500 })
  }
}
