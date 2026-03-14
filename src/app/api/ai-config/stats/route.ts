import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { AuditAction } from '@prisma/client'

/**
 * 获取AI调用统计
 * 支持按时间范围筛选
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 检查权限 - 只有管理员可以查看统计
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    const provider = searchParams.get('provider') // 可选：按服务商筛选

    // 计算时间范围
    const now = new Date()
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    // 构建查询条件
    const whereClause: any = {
      action: AuditAction.AI_CALL,
      createdAt: { gte: startDate }
    }

    // 获取审计日志
    const auditLogs = await db.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    })

    // 解析日志详情
    interface ParsedLog {
      id: string
      provider: string
      model: string
      promptTokens: number
      completionTokens: number
      totalTokens: number
      responseTime: number
      status: 'success' | 'failed' | 'timeout'
      errorMessage?: string
      sanitizedItems?: string[]
      userId: string | null
      createdAt: Date
    }

    const parsedLogs: ParsedLog[] = auditLogs.map(log => {
      const details = JSON.parse(log.details || '{}')
      return {
        id: log.id,
        provider: details.provider || 'unknown',
        model: details.model || 'unknown',
        promptTokens: details.promptTokens || 0,
        completionTokens: details.completionTokens || 0,
        totalTokens: details.totalTokens || 0,
        responseTime: details.responseTime || 0,
        status: details.status || 'failed',
        errorMessage: details.errorMessage,
        sanitizedItems: details.sanitizedItems,
        userId: log.userId,
        createdAt: log.createdAt
      }
    })

    // 按provider筛选
    const filteredLogs = provider 
      ? parsedLogs.filter(log => log.provider === provider)
      : parsedLogs

    // 计算统计数据
    const totalCalls = filteredLogs.length
    const successCalls = filteredLogs.filter(l => l.status === 'success').length
    const failedCalls = filteredLogs.filter(l => l.status === 'failed').length
    const timeoutCalls = filteredLogs.filter(l => l.status === 'timeout').length

    const totalTokens = filteredLogs.reduce((sum, l) => sum + l.totalTokens, 0)
    const totalPromptTokens = filteredLogs.reduce((sum, l) => sum + l.promptTokens, 0)
    const totalCompletionTokens = filteredLogs.reduce((sum, l) => sum + l.completionTokens, 0)
    const avgResponseTime = successCalls > 0
      ? Math.round(filteredLogs.filter(l => l.status === 'success').reduce((sum, l) => sum + l.responseTime, 0) / successCalls)
      : 0

    // 按服务商分组统计
    const providerStats: Record<string, {
      calls: number
      success: number
      failed: number
      tokens: number
      avgResponseTime: number
    }> = {}

    filteredLogs.forEach(log => {
      if (!providerStats[log.provider]) {
        providerStats[log.provider] = { calls: 0, success: 0, failed: 0, tokens: 0, avgResponseTime: 0 }
      }
      providerStats[log.provider].calls++
      providerStats[log.provider].tokens += log.totalTokens
      if (log.status === 'success') {
        providerStats[log.provider].success++
      } else {
        providerStats[log.provider].failed++
      }
    })

    // 计算每个服务商的平均响应时间
    Object.keys(providerStats).forEach(p => {
      const providerLogs = filteredLogs.filter(l => l.provider === p && l.status === 'success')
      providerStats[p].avgResponseTime = providerLogs.length > 0
        ? Math.round(providerLogs.reduce((sum, l) => sum + l.responseTime, 0) / providerLogs.length)
        : 0
    })

    // 按日期分组（最近N天）
    const dailyStats: Record<string, { calls: number; tokens: number; success: number }> = {}
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      dailyStats[dateStr] = { calls: 0, tokens: 0, success: 0 }
    }

    filteredLogs.forEach(log => {
      const dateStr = log.createdAt.toISOString().split('T')[0]
      if (dailyStats[dateStr]) {
        dailyStats[dateStr].calls++
        dailyStats[dateStr].tokens += log.totalTokens
        if (log.status === 'success') {
          dailyStats[dateStr].success++
        }
      }
    })

    // 按用户分组统计（Top 10）
    const userStats: Record<string, { calls: number; tokens: number }> = {}
    filteredLogs.forEach(log => {
      if (log.userId) {
        if (!userStats[log.userId]) {
          userStats[log.userId] = { calls: 0, tokens: 0 }
        }
        userStats[log.userId].calls++
        userStats[log.userId].tokens += log.totalTokens
      }
    })

    // 获取用户信息
    const userIds = Object.keys(userStats)
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    })
    const userMap = new Map(users.map(u => [u.id, u]))

    const topUsers = Object.entries(userStats)
      .map(([id, stats]) => ({
        user: userMap.get(id) || { id, name: '未知用户', email: '' },
        ...stats
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10)

    return NextResponse.json({
      summary: {
        totalCalls,
        successCalls,
        failedCalls,
        timeoutCalls,
        successRate: totalCalls > 0 ? Math.round(successCalls / totalCalls * 100) : 0,
        totalTokens,
        totalPromptTokens,
        totalCompletionTokens,
        avgResponseTime
      },
      providerStats,
      dailyStats: Object.entries(dailyStats)
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topUsers,
      recentLogs: filteredLogs.slice(0, 20) // 最近20条记录
    })
  } catch (error) {
    console.error('AI stats error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
