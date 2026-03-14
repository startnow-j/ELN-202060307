# 项目管理模块技术文档

## 概述

项目管理模块用于组织实验记录，支持项目创建、成员管理、状态流转等功能。

## 数据模型

```prisma
model Project {
  id                 String            @id @default(cuid())
  name               String
  description        String?
  status             ProjectStatus     @default(ACTIVE)
  startDate          DateTime?
  endDate            DateTime?
  expectedEndDate    DateTime?
  actualEndDate      DateTime?
  completedAt        DateTime?
  archivedAt         DateTime?
  primaryLeader      String?
  
  // 关联
  ownerId            String
  owner              User              @relation("OwnedProjects", ...)
  members            User[]            @relation("ProjectToUser", ...)
  projectMembers     ProjectMember[]
  projectDocuments   ProjectDocument[]
  experimentProjects ExperimentProject[]
  
  // 时间戳
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt
}

model ProjectMember {
  id        String            @id @default(cuid())
  projectId String
  userId    String
  role      ProjectMemberRole @default(MEMBER)
  joinedAt  DateTime          @default(now())
  
  user      User              @relation(...)
  project   Project           @relation(...)
  
  @@unique([projectId, userId])
}
```

## 项目状态

```typescript
enum ProjectStatus {
  ACTIVE    // 进行中
  COMPLETED // 已完成
  ARCHIVED  // 已归档
}
```

### 状态流转

```
ACTIVE ──────▶ COMPLETED ──────▶ ARCHIVED
   ▲               │                  │
   └───────────────┘                  │
        解锁                          │
                                      │
   ┌──────────────────────────────────┘
   │ 解除归档 (仅超级管理员)
   ▼
COMPLETED
```

## 核心API

### 创建项目

```
POST /api/projects
```

```typescript
{
  name: string
  description?: string
  expectedEndDate?: string
  memberIds?: string[]
}
```

### 更新项目

```
PUT /api/projects/[id]
```

### 项目状态操作

```
POST /api/projects/[id]/status
```

支持的action:
- `complete` - 完成项目
- `reactivate` - 解锁已完成的项目的
- `archive` - 归档项目
- `unarchive` - 解除归档（仅超级管理员）

### 成员管理

```
POST /api/projects/[id]/members     # 添加成员
DELETE /api/projects/[id]/members   # 移除成员
PATCH /api/projects/[id]/members    # 修改角色
```

## 权限规则

| 操作 | 项目创建者 | 项目负责人 | 成员 | 观察者 | 超管 |
|------|-----------|-----------|------|--------|------|
| 查看项目 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 编辑信息 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 添加成员 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 创建实验 | ✅ | ✅ | ✅ | ❌ | ✅ |
| 审核实验 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 完成项目 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 删除项目 | ❌ | ❌ | ❌ | ❌ | ✅ |

## 视角差异

管理员和超级管理员可切换视角，不同视角下项目数据的可见范围不同。

### 数据可见范围

| 视角模式 | 可见项目范围 | 适用角色 |
|---------|-------------|---------|
| **默认视角** | 自己创建的项目 + 参与的项目 | 所有用户 |
| **全局视角** | 系统中所有项目 | 管理员、超级管理员 |

### 操作权限对比

| 操作 | 默认视角 | 全局视角 |
|------|---------|---------|
| 查看项目列表 | 参与的项目 | 所有项目 |
| 查看项目详情 | 参与的项目 | 所有项目 |
| 编辑项目 | 负责的项目 | 所有项目 |
| 管理成员 | 负责的项目 | 所有项目 |
| 删除项目 | ❌ | ✅ (仅超管) |
| 恢复归档项目 | ❌ | ✅ (仅超管) |

### 数据过滤实现

```typescript
// 默认视角：仅显示用户参与的项目
if (viewMode !== 'global' || !isAdmin) {
  where = {
    OR: [
      { ownerId: userId },  // 自己创建的
      { projectMembers: { some: { userId } } }  // 参与的
    ]
  }
}

// 全局视角：返回所有项目
```

### 使用场景

#### 默认视角适用场景

- 管理自己的项目
- 查看参与项目进展
- 日常项目协作

#### 全局视角适用场景

- 监督实验室所有项目
- 跨项目管理
- 项目状态统计
- 归档/恢复项目操作

### 特殊权限说明

**超级管理员独有权限**：

| 操作 | 说明 |
|------|------|
| 删除项目 | 物理删除项目及其关联数据 |
| 恢复归档项目 | 将ARCHIVED状态恢复为COMPLETED |
| AI配置管理 | 管理AI服务商配置 |

## 项目与实验的关系

```
Project 1 ──┬── Experiment A
            ├── Experiment B
            └── Experiment C

Experiment D ──┬── Project 1  (主项目)
               └── Project 2  (关联项目)
```

### 关联规则

1. 一个实验可以关联多个项目
2. 一个项目可以包含多个实验
3. 实验必须有至少一个关联项目
4. 项目完成后，关联的实验自动锁定

## 前端组件

| 组件 | 路径 | 功能 |
|------|------|------|
| ProjectList | `components/projects/ProjectList.tsx` | 项目列表 |
| ProjectDetail | `components/projects/ProjectDetail.tsx` | 项目详情 |
| ProjectMembers | `components/projects/ProjectMembers.tsx` | 成员管理 |
| ProjectStatusActions | `components/projects/ProjectStatusActions.tsx` | 状态操作 |

## 数据查询优化

```typescript
// 获取用户可访问的项目
export async function getUserProjects(userId: string) {
  const owned = await db.project.findMany({
    where: { ownerId: userId }
  })
  
  const memberOf = await db.project.findMany({
    where: {
      projectMembers: { some: { userId } }
    }
  })
  
  // 合并去重
  return [...new Map([...owned, ...memberOf].map(p => [p.id, p])).values()]
}
```

## 项目文档管理

```prisma
model ProjectDocument {
  id          String              @id @default(cuid())
  name        String
  type        ProjectDocumentType @default(OTHER)
  description String?
  path        String
  size        Int
  projectId   String
  uploaderId  String
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
}
```

支持的文档类型：
- `PROPOSAL` - 项目提案
- `PROGRESS_REPORT` - 进度报告
- `FINAL_REPORT` - 最终报告
- `OTHER` - 其他
