/**
 * 文件存储统计API
 * 
 * 功能：
 * - 统计各项目的存储空间占用和实验记录数量
 * - 按用户统计暂存区存储空间和暂存实验数量
 * - 统计总体存储情况
 * 
 * 权限：SUPER_ADMIN, ADMIN
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

// 计算目录大小
function getDirectorySize(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0
  
  let totalSize = 0
  const files = fs.readdirSync(dirPath)
  
  for (const file of files) {
    const filePath = path.join(dirPath, file)
    const stats = fs.statSync(filePath)
    
    if (stats.isDirectory()) {
      totalSize += getDirectorySize(filePath)
    } else {
      totalSize += stats.size
    }
  }
  
  return totalSize
}

// 格式化文件大小
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 统计目录下的文件数量
function countFiles(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0
  
  let count = 0
  const files = fs.readdirSync(dirPath)
  
  for (const file of files) {
    const filePath = path.join(dirPath, file)
    const stats = fs.statSync(filePath)
    
    if (stats.isDirectory()) {
      count += countFiles(filePath)
    } else {
      count++
    }
  }
  
  return count
}

interface ProjectStat {
  id: string
  name: string
  status: string
  size: number
  sizeFormatted: string
  fileCount: number
  experimentCount: number
}

interface UserDraftStat {
  userId: string
  userName: string
  userEmail: string
  size: number
  sizeFormatted: string
  fileCount: number
  draftCount: number
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

    const uploadRoot = path.join(process.cwd(), 'upload')
    const projectsRoot = path.join(uploadRoot, 'projects')
    const usersRoot = path.join(uploadRoot, 'users')

    // 获取所有项目及其关联的实验数量
    const projects = await db.project.findMany({
      select: { 
        id: true, 
        name: true, 
        status: true,
        _count: {
          select: { experimentProjects: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    // 统计各项目存储
    const projectStats: ProjectStat[] = []
    for (const project of projects) {
      const safeName = project.name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').slice(0, 100)
      const projectDir = path.join(projectsRoot, safeName)
      
      const size = getDirectorySize(projectDir)
      const fileCount = countFiles(projectDir)
      
      projectStats.push({
        id: project.id,
        name: project.name,
        status: project.status,
        size,
        sizeFormatted: formatSize(size),
        fileCount,
        experimentCount: project._count.experimentProjects
      })
    }

    // 按用户统计暂存区
    const userDraftStats: UserDraftStat[] = []
    
    // 获取所有有暂存实验的用户
    const usersWithDrafts = await db.user.findMany({
      where: {
        experiments: {
          some: {
            storageLocation: 'draft'
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        experiments: {
          where: { storageLocation: 'draft' },
          select: { id: true }
        }
      }
    })

    for (const u of usersWithDrafts) {
      const userDir = path.join(usersRoot, u.id)
      const size = getDirectorySize(userDir)
      const fileCount = countFiles(userDir)
      
      userDraftStats.push({
        userId: u.id,
        userName: u.name || u.email,
        userEmail: u.email,
        size,
        sizeFormatted: formatSize(size),
        fileCount,
        draftCount: u.experiments.length
      })
    }

    // 如果没有暂存实验但目录存在，也要统计
    if (fs.existsSync(usersRoot)) {
      const existingUserDirs = fs.readdirSync(usersRoot)
      for (const userDirName of existingUserDirs) {
        // 检查是否已经在统计中
        if (!userDraftStats.find(u => u.userId === userDirName)) {
          const userDir = path.join(usersRoot, userDirName)
          const stats = fs.statSync(userDir)
          
          if (stats.isDirectory()) {
            const userInfo = await db.user.findUnique({
              where: { id: userDirName },
              select: { id: true, name: true, email: true }
            })
            
            const size = getDirectorySize(userDir)
            const fileCount = countFiles(userDir)
            
            if (fileCount > 0) {
              userDraftStats.push({
                userId: userDirName,
                userName: userInfo?.name || userInfo?.email || userDirName,
                userEmail: userInfo?.email || '',
                size,
                sizeFormatted: formatSize(size),
                fileCount,
                draftCount: 0
              })
            }
          }
        }
      }
    }

    // 暂存区总体统计
    const draftStats = {
      size: userDraftStats.reduce((sum, u) => sum + u.size, 0),
      sizeFormatted: formatSize(userDraftStats.reduce((sum, u) => sum + u.size, 0)),
      fileCount: userDraftStats.reduce((sum, u) => sum + u.fileCount, 0),
      userCount: userDraftStats.length,
      totalDrafts: userDraftStats.reduce((sum, u) => sum + u.draftCount, 0)
    }

    // 总体统计
    const totalSize = projectStats.reduce((sum, p) => sum + p.size, 0) + draftStats.size
    const totalFiles = projectStats.reduce((sum, p) => sum + p.fileCount, 0) + draftStats.fileCount

    // 数据库统计
    const dbStats = {
      totalAttachments: await db.attachment.count(),
      totalExperiments: await db.experiment.count(),
      totalProjects: await db.project.count(),
      draftExperiments: await db.experiment.count({
        where: { storageLocation: 'draft' }
      })
    }

    return NextResponse.json({
      projects: projectStats,
      userDrafts: userDraftStats,
      drafts: draftStats,
      summary: {
        totalSize,
        totalSizeFormatted: formatSize(totalSize),
        totalFiles,
        projectCount: projects.length
      },
      database: dbStats,
      // 返回当前用户角色，前端用于权限判断
      currentUserRole: user.role
    })

  } catch (error) {
    console.error('Get file stats error:', error)
    return NextResponse.json({ error: '获取存储统计失败' }, { status: 500 })
  }
}
