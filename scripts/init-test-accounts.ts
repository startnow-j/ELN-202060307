/**
 * 初始化测试账户脚本
 * 根据 docs/TEST_ACCOUNTS.md 创建测试账户
 */

import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 测试账户配置
const testAccounts = [
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
];

async function main() {
  console.log('=== 初始化测试账户 ===\n');
  
  // 查询现有用户
  const existingUsers = await prisma.user.findMany();
  const existingEmails = new Set(existingUsers.map(u => u.email));
  
  console.log(`数据库现有用户: ${existingUsers.length} 个`);
  existingUsers.forEach(u => {
    console.log(`  - ${u.email} (${u.role}) - ${u.name}`);
  });
  console.log('');
  
  // 创建缺失的账户
  let created = 0;
  let updated = 0;
  
  for (const account of testAccounts) {
    const hashedPassword = await bcrypt.hash(account.password, 10);
    
    if (existingEmails.has(account.email)) {
      // 更新现有用户的密码和角色（如果需要）
      const existing = existingUsers.find(u => u.email === account.email);
      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            password: hashedPassword,
            role: account.role,
            name: account.name,
            isActive: true,
          },
        });
        console.log(`✓ 更新用户: ${account.email} (${account.role})`);
        updated++;
      }
    } else {
      // 创建新用户
      await prisma.user.create({
        data: {
          email: account.email,
          password: hashedPassword,
          name: account.name,
          role: account.role,
          isActive: true,
        },
      });
      console.log(`✓ 创建用户: ${account.email} (${account.role})`);
      created++;
    }
  }
  
  console.log(`\n=== 完成 ===`);
  console.log(`创建: ${created} 个`);
  console.log(`更新: ${updated} 个`);
  
  // 验证结果
  const finalUsers = await prisma.user.findMany({
    orderBy: { role: 'asc' },
  });
  
  console.log('\n=== 最终用户列表 ===');
  finalUsers.forEach(u => {
    console.log(`  ${u.email} | ${u.role.padEnd(12)} | ${u.name} | ${u.isActive ? '活跃' : '禁用'}`);
  });
}

main()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
