/**
 * AI调用API
 * 
 * POST - 安全调用AI服务
 * 
 * 前端通过此API统一调用AI服务，后端负责：
 * 1. 权限验证
 * 2. 敏感信息脱敏
 * 3. 调用限流
 * 4. 审计日志
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromToken } from '@/lib/auth'
import { secureAICall, SecureAICallParams } from '@/lib/ai-security'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const body = await request.json()
    const { provider, messages, options } = body

    // 验证必填字段
    if (!provider) {
      return NextResponse.json(
        { error: '缺少provider参数' },
        { status: 400 }
      )
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'messages必须是非空数组' },
        { status: 400 }
      )
    }

    // 调用安全AI接口
    const result = await secureAICall({
      userId,
      provider,
      messages,
      options: {
        sanitizeInput: true, // 默认启用脱敏
        timeout: 30000,
        ...options
      }
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, sanitizedItems: result.sanitizedItems },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      content: result.content,
      usage: result.usage,
      sanitizedItems: result.sanitizedItems
    })
  } catch (error) {
    console.error('AI call error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI调用失败' },
      { status: 500 }
    )
  }
}
