// 创建默认超级管理员账户
// 运行方式: bun run scripts/create-super-admin.ts

import { PrismaClient, UserRole } from '@prisma/client'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

// 简单的密码哈希函数（与系统中使用的一致）
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

async function main() {
  const email = 'superadmin@example.com'
  const password = 'super123'
  const name = '超级管理员'

  // 检查是否已存在
  const existing = await prisma.user.findUnique({
    where: { email }
  })

  if (existing) {
    // 如果已存在，更新角色为超级管理员
    const updated = await prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN' }
    })
    console.log('✅ 已将现有用户更新为超级管理员:', updated.email)
    return
  }

  // 创建新的超级管理员账户
  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashPassword(password),
      role: 'SUPER_ADMIN',
      isActive: true
    }
  })

  console.log('✅ 超级管理员账户创建成功!')
  console.log('   邮箱:', email)
  console.log('   密码:', password)
  console.log('   请在登录后立即修改密码!')
}

main()
  .catch((e) => {
    console.error('❌ 创建失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
