# 用户管理模块技术文档

## 概述

用户管理模块用于管理系统用户账号，包括创建用户、编辑用户信息、管理用户角色、禁用/启用用户等功能。仅管理员和超级管理员可访问。

## 权限要求

| 操作 | 管理员 | 超级管理员 |
|------|--------|-----------|
| 查看用户列表 | ✅ | ✅ |
| 创建用户 | ✅ | ✅ |
| 编辑用户信息 | ✅ | ✅ |
| 禁用/启用用户 | ✅ | ✅ |
| 管理管理员角色 | ❌ | ✅ |
| 管理超级管理员角色 | ❌ | ✅ |

## 数据模型

```prisma
model User {
  id                 String            @id @default(cuid())
  email              String            @unique
  name               String
  password           String            // bcrypt加密存储
  role               UserRole          @default(RESEARCHER)
  avatar             String?
  isActive           Boolean           @default(true)
  
  // 时间戳
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt
  
  // 关联
  experiments        Experiment[]
  projects           Project[]
  projectMemberships ProjectMember[]
  reviewRequests     ReviewRequest[]
  reviewFeedbacks    ReviewFeedback[]
  unlockRequests     UnlockRequest[]
  auditLogs          AuditLog[]
  attachments        Attachment[]
  templates          Template[]
  ownedProjects      Project[]
}

enum UserRole {
  SUPER_ADMIN   // 超级管理员
  ADMIN         // 管理员
  RESEARCHER    // 研究员
}
```

## 核心API

### 获取用户列表

```
GET /api/users
```

**权限**: 管理员或超级管理员

**响应**
```json
[
  {
    "id": "clxxx",
    "email": "user@example.com",
    "name": "用户名",
    "role": "RESEARCHER",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 创建用户

```
POST /api/users
```

**请求体**
```json
{
  "name": "新用户",
  "email": "newuser@example.com",
  "password": "password123",
  "role": "RESEARCHER"
}
```

**权限验证**
```typescript
// 管理员不能创建超级管理员
if (role === 'SUPER_ADMIN' && !isSuperAdmin(userId)) {
  return NextResponse.json({ error: '权限不足' }, { status: 403 })
}
```

### 更新用户

```
PUT /api/users/[id]
```

**请求体**
```json
{
  "name": "更新后的名称",
  "email": "updated@example.com",
  "role": "ADMIN"
}
```

### 禁用/启用用户

```
PATCH /api/users/[id]/status
```

**请求体**
```json
{
  "isActive": false
}
```

### 重置密码

```
POST /api/users/[id]/reset-password
```

**请求体**
```json
{
  "newPassword": "newpassword123"
}
```

## 密码安全

### 密码加密

使用 bcrypt 加密存储：

```typescript
import bcrypt from 'bcryptjs'

// 加密密码
const hashedPassword = await bcrypt.hash(password, 10)

// 验证密码
const isValid = await bcrypt.compare(password, hashedPassword)
```

### 密码要求

- 最小长度：6个字符
- 建议：包含字母和数字
- 不限制：特殊字符（兼容性考虑）

## 前端组件

**文件**: `src/components/users/UserManagement.tsx`

```tsx
export function UserManagement() {
  const { data: users } = useUsers()
  const { isSuperAdmin } = useUserRole()
  
  return (
    <div className="space-y-6">
      {/* 用户统计 */}
      <UserStats users={users} />
      
      {/* 用户列表 */}
      <UserList 
        users={users} 
        canManageSuperAdmin={isSuperAdmin}
      />
      
      {/* 创建用户对话框 */}
      <CreateUserDialog />
    </div>
  )
}
```

### 用户列表组件

```tsx
function UserList({ users, canManageSuperAdmin }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>用户名</TableHead>
          <TableHead>邮箱</TableHead>
          <TableHead>角色</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map(user => (
          <UserRow 
            key={user.id} 
            user={user}
            canEdit={canEditUser(user, canManageSuperAdmin)}
          />
        ))}
      </TableBody>
    </Table>
  )
}
```

## 权限控制实现

```typescript
// src/lib/permissions.ts

// 检查是否可管理用户
export async function canManageUsers(userId: string): Promise<boolean> {
  return isAdmin(userId)
}

// 检查是否可管理特定角色的用户
export async function canManageUserRole(
  operatorId: string, 
  targetRole: UserRole
): Promise<boolean> {
  const operatorRole = await getUserRole(operatorId)
  
  // 超级管理员可以管理所有角色
  if (operatorRole === 'SUPER_ADMIN') return true
  
  // 管理员不能管理超级管理员
  if (targetRole === 'SUPER_ADMIN') return false
  
  // 管理员可以管理管理员和研究员
  return operatorRole === 'ADMIN'
}
```

## 用户状态管理

### 禁用用户

禁用后：
- 用户无法登录
- 现有Token失效
- 数据保留

```typescript
// 禁用用户
await db.user.update({
  where: { id },
  data: { isActive: false }
})

// 登录时检查
if (!user.isActive) {
  return NextResponse.json({ error: '账号已被禁用' }, { status: 401 })
}
```

### 删除用户

**注意**: 系统不提供物理删除功能，原因：
1. 保持数据完整性
2. 审计追踪需要
3. 实验记录归属

如需"删除"用户：
1. 禁用账号
2. 清除个人信息（可选）
3. 保留关联数据

## 审计日志

用户管理操作记录审计日志：

```typescript
// 创建用户
await db.auditLog.create({
  data: {
    userId: operatorId,
    action: 'CREATE',
    entityType: 'User',
    entityId: newUserId,
    details: JSON.stringify({ role, email })
  }
})

// 修改角色
await db.auditLog.create({
  data: {
    userId: operatorId,
    action: 'UPDATE',
    entityType: 'User',
    entityId: targetUserId,
    details: JSON.stringify({ 
      field: 'role',
      oldValue: oldRole,
      newValue: newRole
    })
  }
})
```

## 默认账号

系统首次部署时的默认账号：

| 字段 | 值 |
|------|------|
| 邮箱 | admin@biolab.com |
| 密码 | admin123 |
| 角色 | SUPER_ADMIN |

⚠️ **安全建议**: 首次登录后立即修改密码

## 用户统计

管理员仪表盘显示用户统计：

```typescript
// 用户统计
const stats = {
  total: await db.user.count(),
  active: await db.user.count({ where: { isActive: true } }),
  byRole: {
    superAdmin: await db.user.count({ where: { role: 'SUPER_ADMIN' } }),
    admin: await db.user.count({ where: { role: 'ADMIN' } }),
    researcher: await db.user.count({ where: { role: 'RESEARCHER' } })
  },
  recentLogins: await db.auditLog.findMany({
    where: { action: 'LOGIN' },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
}
```

## 常见场景

### 新员工入职

1. 管理员创建账号
2. 设置为 RESEARCHER 角色
3. 分配到相关项目
4. 通知员工登录

### 员工离职

1. 禁用账号（立即生效）
2. 从项目中移除
3. 审计记录保留
4. 数据归属不变

### 权限提升

1. 验证操作权限
2. 修改用户角色
3. 记录审计日志
4. 通知相关人员
