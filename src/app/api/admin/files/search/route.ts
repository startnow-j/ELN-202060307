/**
 * 文件搜索API
 * 
 * 功能：
 * - 按项目名称搜索项目
 * - 按实验标题搜索实验记录
 * - 返回匹配结果及其存储位置
 * 
 * 权限：SUPER_ADMIN, ADMIN
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'

interface SearchResult {
  type: 'project' | 'experiment'
  id: string
  title: string
  projectId?: string
  projectName?: string
  storageLocation?: string
  userId?: string
  userName?: string
  attachmentCount: number
  createdAt: string
  updatedAt: string
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
    const query = searchParams.get('q')?.trim() || ''
    const type = searchParams.get('type') || 'all' // all | projects | experiments

    if (!query) {
      return NextResponse.json({ 
        query: '',
        results: [] 
      })
    }

    const results: SearchResult[] = []

    // 搜索项目
    if (type === 'all' || type === 'projects') {
      const projects = await db.project.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { description: { contains: query } }
          ]
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { experiments: true }
          }
        },
        take: 20
      })

      for (const project of projects) {
        results.push({
          type: 'project',
          id: project.id,
          title: project.name,
          attachmentCount: project._count.experiments, // 使用实验数作为参考
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString()
        })
      }
    }

    // 搜索实验记录
    if (type === 'all' || type === 'experiments') {
      const experiments = await db.experiment.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } }
          ]
        },
        select: {
          id: true,
          title: true,
          storageLocation: true,
          createdAt: true,
          updatedAt: true,
          projectId: true,
          project: {
            select: { name: true }
          },
          userId: true,
          user: {
            select: { name: true }
          },
          _count: {
            select: { attachments: true }
          }
        },
        take: 20
      })

      for (const exp of experiments) {
        results.push({
          type: 'experiment',
          id: exp.id,
          title: exp.title,
          projectId: exp.projectId || undefined,
          projectName: exp.project?.name || undefined,
          storageLocation: exp.storageLocation || undefined,
          userId: exp.userId,
          userName: exp.user?.name || undefined,
          attachmentCount: exp._count.attachments,
          createdAt: exp.createdAt.toISOString(),
          updatedAt: exp.updatedAt.toISOString()
        })
      }
    }

    // 按相关性排序：标题匹配优先
    results.sort((a, b) => {
      const aStartsWithQuery = a.title.toLowerCase().startsWith(query.toLowerCase())
      const bStartsWithQuery = b.title.toLowerCase().startsWith(query.toLowerCase())
      
      if (aStartsWithQuery && !bStartsWithQuery) return -1
      if (!aStartsWithQuery && bStartsWithQuery) return 1
      
      // 其次按更新时间排序
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    return NextResponse.json({
      query,
      totalResults: results.length,
      results: results.slice(0, 50) // 最多返回50条
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: '搜索失败' }, { status: 500 })
  }
}
