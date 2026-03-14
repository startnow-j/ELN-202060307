/**
 * AI配置管理API
 * 
 * GET  - 获取所有AI配置（密钥已脱敏）
 * POST - 创建或更新AI配置
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/permissions'
import { encryptApiKey } from '@/lib/ai-security'
import { AuditAction } from '@prisma/client'

// 获取所有AI配置
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 检查是否为超级管理员（只有超级管理员可以管理AI配置）
    const canManage = await isSuperAdmin(userId)
    if (!canManage) {
      return NextResponse.json({ error: '权限不足，仅超级管理员可访问' }, { status: 403 })
    }

    // 获取所有配置，但不返回密钥
    const configs = await db.aIConfig.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        apiEndpoint: true,
        modelName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // 注意：不返回 apiKeyEncrypted
      }
    })

    // 获取调用统计
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const stats = await db.auditLog.groupBy({
      by: ['entityType'],
      where: {
        action: AuditAction.AI_CALL,
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: true
    })

    return NextResponse.json({
      configs,
      stats: {
        totalCalls: stats.reduce((acc, s) => acc + s._count, 0),
        last30Days: stats
      }
    })
  } catch (error) {
    console.error('Error fetching AI configs:', error)
    return NextResponse.json(
      { error: '获取AI配置失败' },
      { status: 500 }
    )
  }
}

// 创建或更新AI配置
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 检查是否为超级管理员
    const canManage = await isSuperAdmin(userId)
    if (!canManage) {
      return NextResponse.json({ error: '权限不足，仅超级管理员可操作' }, { status: 403 })
    }

    const body = await request.json()
    const { provider, apiKey, apiEndpoint, modelName, isActive } = body

    // 验证必填字段
    if (!provider || !apiKey || !modelName) {
      return NextResponse.json(
        { error: '缺少必填字段：provider, apiKey, modelName' },
        { status: 400 }
      )
    }

    // 验证provider
    const validProviders = ['openai', 'azure', 'deepseek', 'zhipu', 'aliyun']
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: `无效的provider，支持的值：${validProviders.join(', ')}` },
        { status: 400 }
      )
    }

    // 加密API密钥
    const apiKeyEncrypted = encryptApiKey(apiKey)

    // 创建或更新配置
    const config = await db.aIConfig.upsert({
      where: { provider },
      create: {
        provider,
        apiKeyEncrypted,
        apiEndpoint,
        modelName,
        isActive: isActive ?? true
      },
      update: {
        apiKeyEncrypted,
        apiEndpoint,
        modelName,
        isActive: isActive ?? true
      }
    })

    // 记录审计日志
    await db.auditLog.create({
      data: {
        userId,
        action: AuditAction.UPDATE,
        entityType: 'AI_CONFIG',
        entityId: config.id,
        details: JSON.stringify({
          provider,
          modelName,
          isActive: isActive ?? true,
          action: 'create_or_update'
        })
      }
    })

    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        provider: config.provider,
        apiEndpoint: config.apiEndpoint,
        modelName: config.modelName,
        isActive: config.isActive
      }
    })
  } catch (error) {
    console.error('Error saving AI config:', error)
    return NextResponse.json(
      { error: '保存AI配置失败' },
      { status: 500 }
    )
  }
}

// 删除AI配置
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 检查是否为超级管理员
    const canManage = await isSuperAdmin(userId)
    if (!canManage) {
      return NextResponse.json({ error: '权限不足，仅超级管理员可操作' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '缺少配置ID' },
        { status: 400 }
      )
    }

    // 删除配置
    await db.aIConfig.delete({
      where: { id }
    })

    // 记录审计日志
    await db.auditLog.create({
      data: {
        userId,
        action: AuditAction.DELETE,
        entityType: 'AI_CONFIG',
        entityId: id,
        details: JSON.stringify({ action: 'delete' })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting AI config:', error)
    return NextResponse.json(
      { error: '删除AI配置失败' },
      { status: 500 }
    )
  }
}
