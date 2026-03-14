import { NextResponse } from 'next/server'
import { AuditAction } from '@prisma/client'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromToken(request)
    
    if (userId) {
      // 记录审计日志
      try {
        await db.auditLog.create({
          data: {
            action: AuditAction.LOGOUT,
            entityType: 'User',
            entityId: userId,
            userId: userId,
          }
        })
      } catch (auditError) {
        console.error('Audit log error:', auditError)
      }
    }

    const response = NextResponse.json({ success: true })
    
    // 删除cookie - 需要指定与设置时相同的属性
    // 方法1：使用 cookies.delete (Next.js 14+)
    response.cookies.delete('auth-token')
    
    // 方法2：同时设置一个过期的cookie确保删除（兼容性更好）
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 0,  // 立即过期
      path: '/',
    })
    
    return response
  } catch (error) {
    console.error('Logout error:', error)
    // 即使出错也返回成功，让前端清除本地状态
    const response = NextResponse.json({ success: true })
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
    return response
  }
}
