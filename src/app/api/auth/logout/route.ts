import { NextResponse } from 'next/server'
import { AuditAction } from '@prisma/client'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromToken(request)
    
    if (userId) {
      // 记录审计日志
      await db.auditLog.create({
        data: {
          action: AuditAction.LOGOUT,
          entityType: 'User',
          entityId: userId,
          userId: userId,
        }
      })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.delete('auth-token')
    
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ success: true })
  }
}
