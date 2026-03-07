# BioLab ELN 项目管理模块说明文档

> **版本**: v3.3.5  
> **最后更新**: 2025-03-05  
> **维护者**: 开发团队

---

## 目录

1. [模块概述](#1-模块概述)
2. [数据模型](#2-数据模型)
3. [API端点详解](#3-api端点详解)
4. [项目状态管理](#4-项目状态管理)
5. [项目成员管理](#5-项目成员管理)
6. [权限控制](#6-权限控制)
7. [项目归档逻辑](#7-项目归档逻辑)
8. [变更记录](#8-变更记录)

---

## 1. 模块概述

### 1.1 功能定位

项目管理模块是ELN系统的组织核心，提供：

- 项目的创建、编辑、删除
- 项目成员角色管理
- 项目状态流转
- 项目文档管理
- 项目归档与实验锁定联动
- **全局视角切换**（管理员可查看所有项目）
- **项目主负责人**（支持手写填入）
- **日期概念分离**（预计结束日期/真实结束日期）

### 1.2 核心概念

| 概念 | 说明 |
|------|------|
| **项目** | 研究工作的组织单元，包含实验记录、文档、成员 |
| **项目负责人** | 项目创建者或被指定为 PROJECT_LEAD 的成员 |
| **项目主负责人** | 手写填入的主要负责人姓名（v3.3新增） |
| **项目状态** | ACTIVE（活跃）→ COMPLETED/ARCHIVED（完成/归档） |
| **项目文档** | 项目级别的文档文件（立项报告、阶段性总结、结题报告等） |
| **全局视角** | 管理员可查看所有项目的视图模式（v3.3新增） |
| **普通视角** | 用户查看自己创建和参与的项目的视图模式（v3.3新增） |

---

## 2. 数据模型

### 2.1 Project 模型

```prisma
model Project {
  id          String        @id @default(cuid())
  name        String
  description String?
  status      ProjectStatus @default(ACTIVE)

  // 日期相关（v3.3新增）
  startDate       DateTime?   // 开始日期
  endDate         DateTime?   // 结束日期（保留兼容）
  expectedEndDate DateTime?   // 预计结束日期
  actualEndDate   DateTime?   // 真实结束日期（项目结束时记录）

  // 状态时间戳（v3.3新增）
  completedAt DateTime?   // 结束时间
  archivedAt  DateTime?   // 归档时间

  // 项目负责人信息（v3.3新增）
  primaryLeader   String?   // 项目主负责人（手写填入）

  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  ownerId     String
  owner       User          @relation("OwnedProjects", fields: [ownerId], references: [id])
  members     User[]
  projectMembers ProjectMember[]
  experimentProjects ExperimentProject[]
  projectDocuments ProjectDocument[]

  @@map("projects")
}
```

### 2.2 ProjectMember 模型

```prisma
model ProjectMember {
  id        String            @id @default(cuid())
  projectId String
  userId    String
  role      ProjectMemberRole @default(MEMBER)
  joinedAt  DateTime          @default(now())

  project   Project           @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@map("project_members")
}
```

### 2.3 ProjectDocument 模型

```prisma
model ProjectDocument {
  id          String              @id @default(cuid())
  name        String
  type        ProjectDocumentType @default(OTHER)
  description String?
  path        String
  size        Int
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  projectId   String
  project     Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)

  uploaderId  String
  uploader    User                @relation(fields: [uploaderId], references: [id])

  @@map("project_documents")
}
```

### 2.4 枚举定义

#### ProjectStatus（项目状态）

| 值 | 说明 | 可创建实验 |
|------|------|:----------:|
| `ACTIVE` | 活跃状态 | ✅ |
| `COMPLETED` | 已完成 | ❌ |
| `ARCHIVED` | 已归档 | ❌ |

#### ProjectMemberRole（项目成员角色）

| 值 | 显示名称 | 权限范围 |
|------|---------|---------|
| `PROJECT_LEAD` | 项目负责人 | 编辑项目、管理成员、审核实验、解锁实验 |
| `MEMBER` | 参与人 | 查看项目、创建实验 |
| `VIEWER` | 观察员 | 仅查看项目 |

#### ProjectDocumentType（项目文档类型）

| 值 | 说明 |
|------|------|
| `PROPOSAL` | 立项报告 |
| `PROGRESS_REPORT` | 阶段性总结 |
| `FINAL_REPORT` | 结题报告 |
| `OTHER` | 其他文档 |

---

## 3. API端点详解

### 3.1 获取项目列表

**端点**: `GET /api/projects`

**权限**: 需登录

**返回数据**:
- 管理员：所有项目
- 普通用户：参与的项目（包括创建的和被添加的）

**响应格式**:
```json
[{
  "id": "clx123...",
  "name": "新药研发项目",
  "description": "项目描述",
  "status": "ACTIVE",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T00:00:00Z",
  "ownerId": "user123",
  "owner": {
    "id": "user123",
    "name": "张三",
    "email": "zhang@example.com",
    "role": "RESEARCHER",
    "avatar": null
  },
  "members": [...],
  "createdAt": "2025-01-01T10:00:00Z",
  "experiments": [{
    "id": "exp1",
    "title": "实验1",
    "reviewStatus": "LOCKED",
    "completenessScore": 85,
    "author": {...}
  }]
}]
```

### 3.2 创建项目

**端点**: `POST /api/projects`

**权限**: 需登录

**请求体**:
```json
{
  "name": "项目名称",           // 必填
  "description": "项目描述",    // 可选
  "startDate": "2025-01-01",   // 可选，ISO日期格式
  "endDate": "2025-12-31",     // 可选
  "memberIds": ["user1", "user2"]  // 可选，成员用户ID数组
}
```

**业务逻辑**:
1. 创建项目记录
2. 创建者自动成为项目负责人（owner）
3. 添加指定成员到项目
4. 记录审计日志

**响应格式**:
```json
{
  "id": "proj123",
  "name": "项目名称",
  "status": "ACTIVE",
  "ownerId": "user123",
  "owner": {...},
  "members": [...],
  "createdAt": "2025-03-01T10:00:00Z"
}
```

### 3.3 获取项目详情

**端点**: `GET /api/projects/[id]`

**权限**: 项目成员可访问

**响应**: 包含项目完整信息、成员角色、关联实验

### 3.4 更新项目

**端点**: `PUT /api/projects/[id]`

**权限**: 超级管理员、管理员、项目负责人

**请求体**:
```json
{
  "name": "新项目名称",
  "description": "新描述",
  "status": "ARCHIVED",        // 状态变更
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "memberIds": ["user1", "user2", "user3"]  // 成员更新
}
```

**归档特殊处理**:
- 状态变更为 `ARCHIVED` 时，自动锁定所有关联实验
- 使用数据库事务确保一致性
- 返回归档影响的实验数量

**响应示例**:
```json
{
  "id": "proj123",
  "name": "项目名称",
  "status": "ARCHIVED",
  "_archivedInfo": {
    "lockedExperiments": 5
  }
}
```

### 3.5 删除项目

**端点**: `DELETE /api/projects/[id]`

**权限**: 仅超级管理员

**删除流程**:
1. 验证超级管理员权限
2. 检查项目是否存在
3. 删除项目（级联删除关联数据）
4. 删除项目文件目录
5. 记录审计日志

**响应**:
```json
{
  "success": true,
  "message": "项目已删除"
}
```

---

## 4. 项目状态管理

### 4.1 状态流转图

```
┌─────────────────────────────────────────────────────────────┐
│                         ACTIVE                               │
│                        (活跃)                                │
│                                                              │
│   - 可创建实验                                               │
│   - 可编辑项目信息                                           │
│   - 可管理成员                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
           ▼                       ▼
    ┌─────────────┐         ┌─────────────┐
    │  COMPLETED  │         │  ARCHIVED   │
    │   (已完成)  │         │   (已归档)  │
    └─────────────┘         └─────────────┘
                                  │
                                  ▼
                         自动锁定关联实验
```

### 4.2 状态变更规则

| 当前状态 | 目标状态 | 条件 |
|---------|---------|------|
| ACTIVE | COMPLETED | 项目负责人/管理员操作 |
| ACTIVE | ARCHIVED | 项目负责人/管理员操作，触发实验锁定 |
| COMPLETED | ARCHIVED | 项目负责人/管理员操作 |
| ARCHIVED | ACTIVE | 仅超级管理员可恢复 |

---

## 5. 项目成员管理

### 5.1 成员角色权限

| 权限 | PROJECT_LEAD | MEMBER | VIEWER |
|------|:------------:|:------:|:------:|
| 查看项目 | ✅ | ✅ | ✅ |
| 编辑项目信息 | ✅ | ❌ | ❌ |
| 管理成员 | ✅ | ❌ | ❌ |
| 创建实验 | ✅ | ✅ | ❌ |
| 审核实验（非自己） | ✅ | ❌ | ❌ |
| 解锁实验 | ✅ | ❌ | ❌ |
| 管理项目文档 | ✅ | ❌ | ❌ |

### 5.2 成员管理逻辑

**添加成员**:
```typescript
// 创建项目时添加成员
members: memberIds ? {
  connect: memberIds.map(id => ({ id }))
} : undefined

// 更新项目时设置成员
members: memberIds ? {
  set: memberIds.map(id => ({ id }))
} : undefined
```

**获取成员角色**:
```typescript
export async function getProjectRole(userId: string, projectId: string): Promise<ProjectMemberRole | null> {
  // 检查是否为项目创建者
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true }
  })
  
  if (project?.ownerId === userId) {
    return 'PROJECT_LEAD'
  }
  
  // 检查项目成员表
  const membership = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } }
  })
  
  return membership?.role || null
}
```

### 5.3 项目负责人列表

```typescript
export async function getProjectLeads(projectId: string) {
  // 获取项目创建者
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true }
  })
  
  // 获取 PROJECT_LEAD 角色的成员
  const projectLeads = await db.projectMember.findMany({
    where: { projectId, role: 'PROJECT_LEAD' },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
  })
  
  // 合并并去重
  const leads = projectLeads.map(pm => pm.user)
  if (owner && !leads.find(l => l.id === owner.id)) {
    leads.unshift(owner)
  }
  
  return leads
}
```

---

## 6. 权限控制

### 6.1 权限矩阵

| 操作 | SUPER_ADMIN | ADMIN | PROJECT_LEAD | MEMBER | VIEWER |
|------|:-----------:|:-----:|:------------:|:------:|:------:|
| 查看所有项目 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 创建项目 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 编辑项目 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 删除项目 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 归档项目 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 恢复归档项目 | ✅ | ❌ | ❌ | ❌ | ❌ |

### 6.2 权限检查函数

```typescript
// 检查是否可编辑项目
async function canEditProject(userId: string, projectId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  // 管理员可编辑所有项目
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return true
  
  // 检查是否为项目负责人
  const role = await getProjectRole(userId, projectId)
  return role === 'PROJECT_LEAD'
}

// 检查是否可删除项目
export async function canDeleteProject(userId: string): Promise<boolean> {
  return isSuperAdmin(userId)
}

// 检查是否可恢复归档项目
export async function canRestoreArchivedProject(userId: string): Promise<boolean> {
  return isSuperAdmin(userId)
}
```

### 6.3 用户可访问项目

```typescript
export async function getUserAccessibleProjects(userId: string) {
  // 获取用户创建的项目
  const ownedProjects = await db.project.findMany({
    where: { ownerId: userId }
  })
  
  // 获取用户参与的项目
  const memberProjects = await db.projectMember.findMany({
    where: { userId },
    include: { project: true }
  })
  
  // 合并并去重
  const allProjects = [...ownedProjects]
  for (const mp of memberProjects) {
    if (!allProjects.find(p => p.id === mp.project.id)) {
      allProjects.push(mp.project)
    }
  }
  
  return allProjects
}
```

---

## 7. 项目归档逻辑

### 7.1 归档触发

当项目状态从非 `ARCHIVED` 变更为 `ARCHIVED` 时触发归档逻辑：

```typescript
const isArchiving = project.status !== 'ARCHIVED' && status === 'ARCHIVED'
```

### 7.2 归档流程

```typescript
// 使用事务处理
const updated = await db.$transaction(async (tx) => {
  // 1. 如果是归档操作，锁定所有关联的实验记录
  if (isArchiving) {
    const experimentIds = project.experimentProjects
      .filter(ep => ep.experiment.reviewStatus !== 'LOCKED')
      .map(ep => ep.experiment.id)
    
    if (experimentIds.length > 0) {
      // 批量更新实验状态
      await tx.experiment.updateMany({
        where: { id: { in: experimentIds } },
        data: { 
          reviewStatus: 'LOCKED',
          reviewedAt: new Date()
        }
      })
      
      // 记录每个实验的审计日志
      for (const expId of experimentIds) {
        await tx.auditLog.create({
          data: {
            action: 'UPDATE',
            entityType: 'Experiment',
            entityId: expId,
            userId,
            details: JSON.stringify({ 
              reason: '项目归档自动锁定',
              projectId: id,
              projectName: project.name
            })
          }
        })
      }
    }
  }
  
  // 2. 更新项目信息
  return await tx.project.update({
    where: { id },
    data: { name, description, status, startDate, endDate, members: {...} },
    include: {...}
  })
})
```

### 7.3 审计日志

**项目审计日志**:
```json
{
  "action": "UPDATE",
  "entityType": "Project",
  "entityId": "proj123",
  "userId": "user123",
  "details": {
    "name": "项目名称",
    "changes": { "status": "ARCHIVED" },
    "archived": true,
    "lockedExperiments": 5
  }
}
```

**实验锁定审计日志**:
```json
{
  "action": "UPDATE",
  "entityType": "Experiment",
  "entityId": "exp123",
  "userId": "user123",
  "details": {
    "reason": "项目归档自动锁定",
    "projectId": "proj123",
    "projectName": "项目名称"
  }
}
```

---

## 8. 变更记录

### v3.3.5 (2025-03-05)

**功能修复**:
- [x] 视角切换功能修复 - API参数统一使用viewMode
- [x] 项目关系标记细分 - 新增LEADING类型（项目负责人）
- [x] default视角过滤逻辑修复 - 管理员普通视角只显示相关项目

**修改文件**:
- `src/app/api/projects/route.ts` - 修复default视角过滤、新增LEADING关系
- `src/components/projects/ProjectList.tsx` - 使用函数初始值避免双重请求

**API变更**:
- `GET /api/projects` 统一使用 `viewMode` 参数（支持default/global）
- 返回数据新增 `LEADING` 关系类型（项目成员表中role为PROJECT_LEAD）

### v3.3.4 (2025-03-05)

**功能调整**:
- [x] 允许所有用户创建项目 - 移除创建项目的角色限制

**修改文件**:
- `src/app/api/projects/route.ts` - 移除后端角色限制
- `src/components/projects/ProjectList.tsx` - 移除前端按钮权限判断

### v3.3.1 (2025-03-02)

**新增功能**:
- [x] 项目主负责人字段 (`primaryLeader`) - 支持手写填入
- [x] 全局视角切换 - 管理员可查看所有项目
- [x] 视角简化 - 简化为普通视角/全局视角两种模式
- [x] 成员数计算优化 - 返回 `memberCount` 字段

**数据库变更**:
- `Project` 模型新增 `primaryLeader` 字段（String?）
- `Project` 模型新增 `expectedEndDate` 字段（预计结束日期）
- `Project` 模型新增 `actualEndDate` 字段（真实结束日期）
- `Project` 模型新增 `completedAt` 字段（结束时间戳）
- `Project` 模型新增 `archivedAt` 字段（归档时间戳）

**修改文件**:
- `prisma/schema.prisma` - 新增字段
- `src/app/api/projects/route.ts` - 视角切换、memberCount
- `src/app/api/projects/[id]/route.ts` - 支持新字段更新
- `src/components/projects/ProjectList.tsx` - 视角切换UI
- `src/components/projects/ProjectDetail.tsx` - 主负责人编辑
- `src/components/projects/CreateProjectDialog.tsx` - 主负责人输入

### v3.3 (2025-03-01)

**新增功能**:
- [x] 项目归档自动锁定实验
- [x] 项目成员角色权限细化
- [x] 项目文档管理
- [x] 审计日志记录

**修改文件**:
- `src/app/api/projects/route.ts`
- `src/app/api/projects/[id]/route.ts`
- `src/lib/permissions.ts`

**数据库变更**:
- 新增 `ProjectDocument` 模型
- 新增 `ProjectDocumentType` 枚举

---

## 附录

### A. 相关文件清单

```
src/
├── app/api/projects/
│   ├── route.ts                     # 项目列表/创建
│   └── [id]/route.ts                # 项目详情/更新/删除
│
├── lib/
│   └── permissions.ts               # 权限检查函数
│
└── components/
    └── projects/
        ├── ProjectList.tsx          # 项目列表组件
        └── ProjectForm.tsx          # 项目表单组件

prisma/
└── schema.prisma                    # 数据模型定义
```

### B. 错误码说明

| HTTP状态码 | 错误信息 | 原因 |
|-----------|---------|------|
| 400 | 项目名称不能为空 | 创建项目未提供名称 |
| 401 | 未登录 | Token无效或过期 |
| 403 | 无权限编辑此项目 | 非项目负责人且非管理员 |
| 403 | 权限不足，仅超级管理员可以删除项目 | 非超级管理员尝试删除 |
| 404 | 项目不存在 | ID无效 |

### C. 项目存储路径

```
upload/
└── projects/
    └── {项目名称}/
        ├── experiments/           # 实验记录目录
        │   └── {日期}_{实验标题}/
        └── documents/             # 项目文档目录
            ├── {文档ID}_立项报告.docx
            └── {文档ID}_阶段性总结.docx
```

---

> **注意**: 本文档应随模块变更及时更新。如发现文档与实际实现不符，请以代码为准并更新文档。
