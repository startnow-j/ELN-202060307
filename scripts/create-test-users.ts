import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// 测试账户列表
const testUsers = [
  {
    email: 'superadmin@example.com',
    password: 'SuperAdmin123!',
    name: '超级管理员',
    role: UserRole.SUPER_ADMIN,
  },
  {
    email: 'admin@example.com',
    password: 'admin123',
    name: '管理员',
    role: UserRole.ADMIN,
  },
  {
    email: 'PI@example.com',
    password: 'PI123456!',
    name: 'PI',
    role: UserRole.ADMIN,
  },
  {
    email: 'lead@example.com',
    password: 'lead123',
    name: '项目负责人',
    role: UserRole.RESEARCHER,
  },
  {
    email: 'researcher@example.com',
    password: 'Researcher123!',
    name: '研究员',
    role: UserRole.RESEARCHER,
  },
  {
    email: 'shiyan1@example.com',
    password: 'Shiyan1123!',
    name: '实验员1',
    role: UserRole.RESEARCHER,
  },
  {
    email: 'shiyan2@example.com',
    password: 'Shiyan2123!',
    name: '实验员2',
    role: UserRole.RESEARCHER,
  },
  {
    email: 'shiyan3@example.com',
    password: 'Shiyan3123!',
    name: '实验员3',
    role: UserRole.RESEARCHER,
  },
]

async function main() {
  console.log('开始创建测试账户...\n')

  for (const user of testUsers) {
    try {
      // 检查用户是否已存在
      const existing = await prisma.user.findUnique({
        where: { email: user.email },
      })

      if (existing) {
        // 更新现有用户的密码和角色
        const hashedPassword = await bcrypt.hash(user.password, 10)
        await prisma.user.update({
          where: { email: user.email },
          data: {
            name: user.name,
            password: hashedPassword,
            role: user.role,
          },
        })
        console.log(`✅ 更新用户: ${user.email} (${user.role})`)
      } else {
        // 创建新用户
        const hashedPassword = await bcrypt.hash(user.password, 10)
        await prisma.user.create({
          data: {
            email: user.email,
            name: user.name,
            password: hashedPassword,
            role: user.role,
          },
        })
        console.log(`✅ 创建用户: ${user.email} (${user.role})`)
      }
    } catch (error) {
      console.error(`❌ 处理用户 ${user.email} 失败:`, error)
    }
  }

  // 验证所有用户
  console.log('\n验证账户:')
  const allUsers = await prisma.user.findMany({
    select: { email: true, name: true, role: true },
    orderBy: { createdAt: 'asc' },
  })

  console.log('\n当前数据库中的用户:')
  console.table(allUsers)
}

main()
  .catch((e) => {
    console.error('执行失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
