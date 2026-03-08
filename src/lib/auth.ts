import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'biolab-eln-secret-key-2024'

// 加密密码
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// 验证密码
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// 生成JWT token
export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

// 验证JWT token
export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    return decoded
  } catch {
    return null
  }
}

// 从请求中获取用户ID
export async function getUserIdFromToken(request: Request): Promise<string | null> {
  try {
    // 从cookie获取token
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) return null

    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    }, {} as Record<string, string>)

    const token = cookies['auth-token']
    if (!token) return null

    const decoded = verifyToken(token)
    return decoded?.userId || null
  } catch {
    return null
  }
}

// 设置认证cookie
export function setAuthCookie(response: Response, token: string): void {
  response.headers.append('Set-Cookie', `auth-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`)
}
