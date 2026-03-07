# BioLab ELN 用户管理模块说明文档

> **版本**: v3.3  
> **最后更新**: 2025-03-01  
> **维护者**: 开发团队

---

## 目录

1. [版本历史](#1-版本历史)
2. [系统角色体系](#2-系统角色体系)
3. [项目角色体系](#3-项目角色体系)
4. [权限矩阵](#4-权限矩阵)
5. [核心函数说明](#5-核心函数说明)
6. [数据库模型](#6-数据库模型)
7. [API端点](#7-api端点)
8. [业务规则](#8-业务规则)
9. [变更记录](#9-变更记录)

---

## 1. 版本历史

| 版本 | 日期 | 主要变更 | 影响范围 |
|------|------|---------|---------|
| v3.3 | 2025-03-01 | 新增 SUPER_ADMIN 角色、文件管理模块、项目归档锁定逻辑 | 用户管理、文件管理 |
| v3.2 | 2025-02-27 | 项目成员角色体系、暂存实验功能 | 项目管理、实验管理 |
| v3.1 | 2025-02-26 | 基础用户管理、项目关联 | 用户管理、项目管理 |
| v3.0 | 2025-02-25 | 系统初始化 | 基础架构 |

---

## 2. 系统角色体系

### 2.1 角色定义

| 角色枚举 | 显示名称 | 层级 | 说明 |
|---------|---------|------|------|
| `SUPER_ADMIN` | 超级管理员 | 最高 | v3.3新增，拥有系统最高权限 |
| `ADMIN` | 管理员 | 次高 | 可管理用户和项目 |
| `RESEARCHER` | 研究员 | 普通 | 默认角色，可参与项目和创建实验 |

### 2.2 角色权限对比

| 权限项 | SUPER_ADMIN | ADMIN | RESEARCHER |
|--------|:-----------:|:-----:|:----------:|
| 管理所有用户 | ✅ | ✅ | ❌ |
| 创建/修改 SUPER_ADMIN 账号 | ✅ | ❌ | ❌ |
| 删除项目 | ✅ | ❌ | ❌ |
| 恢复已归档项目 | ✅ | ❌ | ❌ |
| 清理暂存实验 | ✅ | ❌ | ❌ |
| 清理孤立文件 | ✅ | ❌ | ❌ |
| 访问文件管理模块 | ✅ | ✅ | ❌ |
| 审核实验 | ✅ | ✅ | 按项目角色 |
| 查看所有项目 | ✅ | ✅ | 仅参与的项目 |

### 2.3 代码位置

```typescript
// 枚举定义: prisma/schema.prisma
enum UserRole {
  SUPER_ADMIN
  ADMIN
  RESEARCHER
}

// 权限检查函数: src/lib/permissions.ts
export async function isSuperAdmin(userId: string): Promise<boolean>
export async function isAdmin(userId: string): Promise<boolean>
export async function canManageUsers(userId: string): Promise<boolean>
export async function canManageSuperAdminRole(userId: string): Promise<boolean>
```

---

## 3. 项目角色体系

### 3.1 角色定义

| 角色枚举 | 显示名称 | 说明 |
|---------|---------|------|
| `PROJECT_LEAD` | 项目负责人 | 项目创建者自动获得，可管理成员、审核实验 |
| `MEMBER` | 参与人 | 可查看项目、创建实验 |
| `VIEWER` | 观察员 | 仅可查看项目内容 |

### 3.2 项目权限列表

```typescript
// src/lib/permissions.ts
export type ProjectPermission = 
  | 'view'            // 查看项目
  | 'edit_project'    // 编辑项目信息
  | 'manage_members'  // 管理成员
  | 'create_experiment' // 创建实验
  | 'review'          // 审核实验
  | 'unlock'          // 解锁实验
  | 'manage_docs'     // 管理项目文档
```

### 3.3 项目权限矩阵

| 权限 | PROJECT_LEAD | MEMBER | VIEWER |
|------|:------------:|:------:|:------:|
| `view` | ✅ | ✅ | ✅ |
| `edit_project` | ✅ | ❌ | ❌ |
| `manage_members` | ✅ | ❌ | ❌ |
| `create_experiment` | ✅ | ✅ | ❌ |
| `review` | ✅ | ❌ | ❌ |
| `unlock` | ✅ | ❌ | ❌ |
| `manage_docs` | ✅ | ❌ | ❌ |

### 3.4 特殊规则

1. **项目创建者自动成为 PROJECT_LEAD**
   - 无需在 `project_members` 表中显式添加
   - 查询时需同时检查 `project.ownerId` 和 `project_members` 表

2. **系统管理员覆盖项目角色**
   - `SUPER_ADMIN` 和 `ADMIN` 在任何项目中都拥有所有权限
   - 不需要在 `project_members` 表中添加记录

3. **实验作者不能审核自己的实验**
   - 即使是 PROJECT_LEAD，也不能审核自己创建的实验

---

## 4. 权限矩阵

### 4.1 实验记录权限

| 操作 | SUPER_ADMIN | ADMIN | PROJECT_LEAD | MEMBER | VIEWER | 实验作者 |
|------|:-----------:|:-----:|:------------:|:------:|:------:|:--------:|
| 查看实验 | ✅ 全部 | ✅ 全部 | ✅ 参与项目 | ✅ 参与项目 | ✅ 参与项目 | ✅ 自己的 |
| 创建实验 | ✅ | ✅ | ✅ | ✅ 活跃项目 | ❌ | - |
| 编辑实验 | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ 未锁定 |
| 删除实验 | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ 草稿状态 |
| 提交审核 | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| 审核实验 | ✅ 非自己 | ✅ 非自己 | ✅ 非自己 | ❌ | ❌ | ❌ |
| 解锁实验 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### 4.2 附件权限

| 操作 | SUPER_ADMIN | ADMIN | 上传者 | 实验作者 | 项目成员 |
|------|:-----------:|:-----:|:------:|:--------:|:--------:|
| 上传附件 | ✅ | ✅ | - | ✅ 未锁定 | ✅ 未锁定 |
| 下载附件 | ✅ 全部 | ✅ 全部 | ✅ 自己上传 | ✅ 自己实验 | ✅ 可见实验 |
| 删除附件 | ✅ | ✅ | ✅ 自己上传 | ✅ 自己实验 | ❌ |

### 4.3 文件管理权限

| 操作 | SUPER_ADMIN | ADMIN |
|------|:-----------:|:-----:|
| 查看存储统计 | ✅ | ✅ |
| 浏览目录树 | ✅ | ✅ |
| 快速查找项目/实验 | ✅ | ✅ |
| 下载归档项目 | ✅ | ❌ |
| 批量下载归档项目 | ✅ | ❌ |
| 下载活跃项目 | ✅ | ❌ |
| 下载暂存区 | ✅ | ❌ |
| 查看孤立文件 | ✅ | ❌ |
| 清理孤立文件 | ✅ | ❌ |

> **注意**：为保护数据安全，文件下载功能仅对超级管理员开放。ADMIN可查看存储统计和目录结构，但不能下载文件。

---

## 5. 核心函数说明

### 5.1 系统角色检查函数

```typescript
// src/lib/permissions.ts

/**
 * 检查用户是否是超级管理员
 * @param userId - 用户ID
 * @returns 是否为超级管理员
 */
export async function isSuperAdmin(userId: string): Promise<boolean>

/**
 * 检查用户是否是管理员（包括超级管理员）
 * @param userId - 用户ID
 * @returns 是否为管理员
 */
export async function isAdmin(userId: string): Promise<boolean>

/**
 * 检查用户是否可以管理用户
 * ADMIN 和 SUPER_ADMIN 都可以管理用户
 * @param userId - 用户ID
 * @returns 是否有用户管理权限
 */
export async function canManageUsers(userId: string): Promise<boolean>

/**
 * 检查用户是否可以管理 SUPER_ADMIN 角色
 * 只有 SUPER_ADMIN 可以创建/修改 SUPER_ADMIN 账号
 * @param userId - 用户ID
 * @returns 是否有管理超级管理员的权限
 */
export async function canManageSuperAdminRole(userId: string): Promise<boolean>
```

### 5.2 项目角色查询函数

```typescript
/**
 * 获取用户在项目中的角色
 * 项目创建者自动拥有 PROJECT_LEAD 权限
 * @param userId - 用户ID
 * @param projectId - 项目ID
 * @returns 项目角色或 null
 */
export async function getProjectRole(
  userId: string, 
  projectId: string
): Promise<ProjectMemberRole | null>

/**
 * 获取项目的所有项目负责人（包括创建者）
 * @param projectId - 项目ID
 * @returns 项目负责人列表
 */
export async function getProjectLeads(projectId: string): Promise<User[]>

/**
 * 获取用户可访问的所有项目
 * @param userId - 用户ID
 * @returns 项目列表
 */
export async function getUserAccessibleProjects(userId: string): Promise<Project[]>
```

### 5.3 权限检查函数

```typescript
/**
 * 检查用户是否有项目的特定权限
 * 系统管理员自动拥有所有权限
 * @param userId - 用户ID
 * @param projectId - 项目ID
 * @param permission - 权限类型
 * @returns 是否有权限
 */
export async function hasProjectPermission(
  userId: string, 
  projectId: string, 
  permission: ProjectPermission
): Promise<boolean>

/**
 * 检查用户是否可以审核实验
 * 注意：实验作者不能审核自己的实验
 * @param userId - 用户ID
 * @param experimentId - 实验ID
 * @returns 是否有审核权限
 */
export async function canReviewExperiment(
  userId: string, 
  experimentId: string
): Promise<boolean>

/**
 * 检查用户是否可以编辑实验
 * 锁定状态的实验不能编辑
 * @param userId - 用户ID
 * @param experimentId - 实验ID
 * @returns 是否有编辑权限
 */
export async function canEditExperiment(
  userId: string, 
  experimentId: string
): Promise<boolean>
```

### 5.4 项目状态相关函数

```typescript
/**
 * 检查用户是否可以在项目中创建实验
 * 只有 ACTIVE 状态的项目才能创建实验
 * @param userId - 用户ID
 * @param projectId - 项目ID
 * @returns { allowed: boolean, reason?: string }
 */
export async function canCreateExperimentInProject(
  userId: string, 
  projectId: string
): Promise<{ allowed: boolean; reason?: string }>

/**
 * 检查用户是否可以删除项目（仅超级管理员）
 * @param userId - 用户ID
 * @returns 是否有删除权限
 */
export async function canDeleteProject(userId: string): Promise<boolean>

/**
 * 检查用户是否可以恢复已归档项目（仅超级管理员）
 * @param userId - 用户ID
 * @returns 是否有恢复权限
 */
export async function canRestoreArchivedProject(userId: string): Promise<boolean>
```

---

## 6. 数据库模型

### 6.1 用户表 (users)

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | String | 主键 (cuid) |
| `email` | String | 邮箱（唯一） |
| `name` | String | 用户名 |
| `password` | String | 密码（bcrypt哈希） |
| `role` | UserRole | 系统角色 |
| `avatar` | String? | 头像URL |
| `isActive` | Boolean | 是否激活 |
| `createdAt` | DateTime | 创建时间 |
| `updatedAt` | DateTime | 更新时间 |

### 6.2 项目表 (projects)

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | String | 主键 (cuid) |
| `name` | String | 项目名称 |
| `description` | String? | 项目描述 |
| `status` | ProjectStatus | 项目状态 |
| `ownerId` | String | 创建者ID |
| `startDate` | DateTime? | 开始日期 |
| `endDate` | DateTime? | 结束日期 |
| `createdAt` | DateTime | 创建时间 |
| `updatedAt` | DateTime | 更新时间 |

### 6.3 项目成员表 (project_members)

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | String | 主键 (cuid) |
| `projectId` | String | 项目ID（外键） |
| `userId` | String | 用户ID（外键） |
| `role` | ProjectMemberRole | 项目角色 |
| `joinedAt` | DateTime | 加入时间 |

**唯一约束**: `(projectId, userId)`

### 6.4 枚举类型

```prisma
// 系统角色
enum UserRole {
  SUPER_ADMIN
  ADMIN
  RESEARCHER
}

// 项目状态
enum ProjectStatus {
  ACTIVE      // 活跃
  COMPLETED   // 已完成
  ARCHIVED    // 已归档
}

// 项目成员角色
enum ProjectMemberRole {
  PROJECT_LEAD  // 项目负责人
  MEMBER        // 参与人
  VIEWER        // 观察员
}

// 实验审核状态
enum ReviewStatus {
  DRAFT          // 草稿
  PENDING_REVIEW // 待审核
  NEEDS_REVISION // 需修改
  LOCKED         // 已锁定
}
```

---

## 7. API端点

### 7.1 用户管理API

| 端点 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `/api/users/manage` | GET | ADMIN, SUPER_ADMIN | 获取用户列表 |
| `/api/users/manage` | POST | ADMIN, SUPER_ADMIN | 创建用户 |
| `/api/users/manage/[id]` | PUT | ADMIN, SUPER_ADMIN | 更新用户 |
| `/api/users/manage/[id]` | DELETE | ADMIN, SUPER_ADMIN | 删除用户 |

### 7.2 项目管理API

| 端点 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `/api/projects` | GET | 所有用户 | 获取可访问的项目 |
| `/api/projects` | POST | 所有用户 | 创建项目 |
| `/api/projects/[id]` | GET | 项目成员 | 获取项目详情 |
| `/api/projects/[id]` | PUT | PROJECT_LEAD, ADMIN | 更新项目 |
| `/api/projects/[id]` | DELETE | SUPER_ADMIN | 删除项目 |

### 7.3 文件管理API

| 端点 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `/api/admin/files/stats` | GET | ADMIN, SUPER_ADMIN | 存储统计 |
| `/api/admin/files/tree` | GET | ADMIN, SUPER_ADMIN | 目录树 |
| `/api/admin/files/download` | GET | **仅 SUPER_ADMIN** | 打包下载 |
| `/api/admin/files/search` | GET | ADMIN, SUPER_ADMIN | 搜索文件 |
| `/api/admin/files/orphaned` | GET | **仅 SUPER_ADMIN** | 孤立文件检测 |
| `/api/admin/files/orphaned` | DELETE | **仅 SUPER_ADMIN** | 清理孤立文件 |

> **权限调整**：下载和孤立文件相关功能仅对超级管理员开放。

---

## 8. 业务规则

### 8.1 项目归档规则

**触发条件**: 项目状态变更为 `ARCHIVED`

**执行动作**:
1. 自动锁定所有关联的实验记录 (`reviewStatus → LOCKED`)
2. 记录审计日志
3. 使用数据库事务确保一致性

**代码位置**: `src/app/api/projects/[id]/route.ts` - PUT方法

```typescript
// 归档时自动锁定实验
if (isArchiving) {
  const experimentIds = project.experimentProjects
    .filter(ep => ep.experiment.reviewStatus !== 'LOCKED')
    .map(ep => ep.experiment.id)
  
  if (experimentIds.length > 0) {
    await tx.experiment.updateMany({
      where: { id: { in: experimentIds } },
      data: { reviewStatus: 'LOCKED', reviewedAt: new Date() }
    })
  }
}
```

### 8.2 密码处理规则

- **存储**: 使用 bcrypt 哈希，成本因子 10
- **验证**: 使用 bcrypt.compare
- **代码位置**: `src/lib/auth.ts`

```typescript
// 密码哈希
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// 密码验证
export async function verifyPassword(
  password: string, 
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}
```

### 8.3 实验状态流转

```
DRAFT → PENDING_REVIEW → LOCKED
   ↑         ↓
   └── NEEDS_REVISION
```

| 当前状态 | 允许操作 | 目标状态 |
|---------|---------|---------|
| DRAFT | 提交审核 | PENDING_REVIEW |
| PENDING_REVIEW | 审核通过 | LOCKED |
| PENDING_REVIEW | 要求修改 | NEEDS_REVISION |
| NEEDS_REVISION | 重新提交 | PENDING_REVIEW |
| LOCKED | 解锁（SUPER_ADMIN/PROJECT_LEAD） | DRAFT |

### 8.4 孤立文件定义

| 类型 | 定义 | 建议操作 |
|------|------|---------|
| 用户已删除 | `upload/users/{user_id}/` 目录存在，但用户表中无记录 | 安全删除 |
| 项目孤立 | `upload/projects/{project_name}/` 目录存在，但项目表中无记录 | 审核后删除 |
| 附件孤立 | 文件存在，但 attachments 表中无对应记录 | 审核后处理 |

---

## 9. 变更记录

### v3.3 (2025-03-01)

**新增功能**:
- [x] SUPER_ADMIN 系统角色
- [x] 文件管理模块（存储统计、目录浏览、孤立文件检测）
- [x] 项目归档自动锁定实验记录
- [x] 下载警告机制（活跃项目/暂存区）

**权限调整** (2025-03-01):
- [x] 下载功能权限收紧：仅 `SUPER_ADMIN` 可下载文件
- [x] `ADMIN` 角色限制：仅可查看统计和目录，不可下载
- [x] 孤立文件检测和清理：仅 `SUPER_ADMIN` 可访问

**修改的文件**:
- `prisma/schema.prisma` - 新增 SUPER_ADMIN 角色
- `src/lib/permissions.ts` - 新增超级管理员权限检查函数
- `src/app/api/projects/[id]/route.ts` - 添加归档锁定逻辑
- `src/app/api/admin/files/*` - 新增文件管理API
- `src/components/admin/FileManager.tsx` - 文件管理前端组件

**API变更**:
- 新增 `GET /api/admin/files/stats` - 存储统计
- 新增 `GET /api/admin/files/tree` - 目录树
- 新增 `GET /api/admin/files/download` - 打包下载（仅SUPER_ADMIN）
- 新增 `GET /api/admin/files/search` - 搜索
- 新增 `GET /api/admin/files/orphaned` - 孤立文件检测（仅SUPER_ADMIN）
- 新增 `DELETE /api/admin/files/orphaned` - 清理孤立文件（仅SUPER_ADMIN）

---

## 附录

### A. 相关文件清单

```
prisma/
└── schema.prisma              # 数据模型定义

src/lib/
├── auth.ts                    # 认证相关函数
├── permissions.ts             # 权限检查函数
└── db.ts                      # 数据库客户端

src/app/api/
├── auth/login/route.ts        # 登录API
├── users/manage/              # 用户管理API
├── projects/                  # 项目管理API
├── experiments/               # 实验管理API
└── admin/files/               # 文件管理API

src/components/
├── admin/
│   ├── UserManager.tsx        # 用户管理组件
│   └── FileManager.tsx        # 文件管理组件
└── layout/
    └── Sidebar.tsx            # 侧边栏（包含管理入口）
```

### B. 权限检查流程图

```
用户请求
    │
    ▼
┌─────────────────┐
│ 验证登录状态    │
│ (getUserIdFromToken) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 检查系统角色    │
│ (isSuperAdmin/isAdmin) │
└────────┬────────┘
         │
         ├── 是 SUPER_ADMIN/ADMIN ──→ 允许访问（大部分情况）
         │
         ▼
┌─────────────────┐
│ 检查项目角色    │
│ (getProjectRole) │
└────────┬────────┘
         │
         ├── 无角色 ──→ 拒绝访问
         │
         ▼
┌─────────────────┐
│ 检查具体权限    │
│ (hasProjectPermission) │
└────────┬────────┘
         │
         ▼
    允许/拒绝
```

---

> **注意**: 本文档应随模块变更及时更新。如发现文档与实际实现不符，请以代码为准并更新文档。
