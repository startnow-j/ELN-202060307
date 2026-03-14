import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, generateToken, setAuthCookie } from '@/lib/auth'
import { AuditAction } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码不能为空' },
        { status: 400 }
      )
    }

    // 查找用户
    const user = await db.user.findUnique({
      where: { email }
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    // 验证密码
    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    // 生成token
    const token = generateToken(user.id)

    // 记录审计日志（不阻塞登录流程）
    try {
      await db.auditLog.create({
        data: {
          action: AuditAction.LOGIN,
          entityType: 'User',
          entityId: user.id,
          userId: user.id,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        }
      })
    } catch (auditError) {
      console.error('Audit log error:', auditError)
    }

    // 设置cookie - 针对 sandboxed iframe 的特殊配置
    // 注意：sandboxed iframe 需要 SameSite=None 和 Secure
    // 但 Secure 需要 HTTPS，开发环境可能不支持
    // 所以我们同时设置两种方式：cookie + 返回 token
    
    const isDev = process.env.NODE_ENV !== 'production'
    
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
      token, // 返回token用于 sandboxed 场景
    })
    
    // 设置 cookie - 开发环境使用 lax 模式
    // 注意：sandboxed iframe 中 cookie 可能无法工作
    // 所以我们主要依赖返回的 token + 前端内存存储
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: false, // 开发环境
      sameSite: 'lax', // lax 模式兼容性更好
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: '登录失败，请重试' },
      { status: 500 }
    )
  }
}
