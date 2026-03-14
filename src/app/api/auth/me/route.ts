import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    // 调试日志
    const cookieHeader = request.headers.get('cookie')
    console.log('[DEBUG] /api/auth/me - Cookie header:', cookieHeader ? 'present' : 'missing')
    console.log('[DEBUG] /api/auth/me - Cookie value:', cookieHeader)

    const userId = await getUserIdFromToken(request)

    if (!userId) {
      console.log('[DEBUG] /api/auth/me - No userId from token')
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 401 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Get current user error:', error)
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    )
  }
}
