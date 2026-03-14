# BioLab ELN 系统架构文档

## 1. 系统概述

BioLab ELN 是基于 Next.js 16 构建的电子实验记录系统，采用单页应用架构，前后端通过 RESTful API 通信。

## 2. 技术架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         客户端 (Browser)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    React 19 + TypeScript                │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │  Pages   │ │Components│ │  Hooks   │ │ Contexts │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  │                      │                                  │   │
│  │              ┌───────┴───────┐                         │   │
│  │              │ React Query   │                         │   │
│  │              │ (数据请求缓存) │                         │   │
│  │              └───────────────┘                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      服务端 (Next.js)                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     App Router API                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │   Auth   │ │Experiments│ │ Projects │ │  Users   │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  │              ┌───────────┴───────────┐                   │   │
│  │              │    Business Logic     │                   │   │
│  │              │  (Permissions/Utils)  │                   │   │
│  │              └───────────────────────┘                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  │              ┌───────────────────────┐                     │
│  │              │    Prisma ORM         │                     │
│  │              └───────────────────────┘                     │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    SQLite DB    │
                    └─────────────────┘
```

### 2.2 技术选型

| 层级 | 技术 | 版本 | 选型理由 |
|------|------|------|---------|
| 框架 | Next.js | 16.x | App Router、RSC支持、全栈能力 |
| 运行时 | Bun | 最新 | 快速安装、原生TypeScript支持 |
| UI框架 | React | 19.x | 最新特性、性能优化 |
| 类型系统 | TypeScript | 5.x | 类型安全、开发体验 |
| 样式方案 | Tailwind CSS | 4.x | 原子化CSS、快速开发 |
| 组件库 | shadcn/ui | 最新 | 可定制、无依赖锁定 |
| 富文本 | TipTap | 3.x | 可扩展、基于ProseMirror |
| 数据库 | SQLite | 3.x | 轻量级、无需部署 |
| ORM | Prisma | 6.x | 类型安全、迁移管理 |
| 状态管理 | React Query + Zustand | 5.x + 5.x | 服务端+客户端状态分离 |

## 3. 目录结构

```
/home/z/my-project/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # 主页面（单页应用入口）
│   │   ├── layout.tsx         # 根布局
│   │   ├── globals.css        # 全局样式
│   │   └── api/               # API路由
│   │       ├── auth/          # 认证相关
│   │       │   ├── login/     # 登录
│   │       │   ├── logout/    # 登出
│   │       │   ├── register/  # 注册
│   │       │   └── me/        # 获取当前用户
│   │       ├── experiments/   # 实验记录
│   │       │   ├── [id]/      # 单个实验操作
│   │       │   │   ├── submit/    # 提交审核
│   │       │   │   ├── review/    # 审核
│   │       │   │   ├── unlock-request/ # 解锁申请
│   │       │   │   └── extract/   # AI提取
│   │       │   └── route.ts   # 列表/创建
│   │       ├── projects/      # 项目管理
│   │       ├── users/         # 用户管理
│   │       ├── templates/     # 模板管理
│   │       ├── unlock-requests/ # 解锁申请列表
│   │       ├── ai-config/     # AI配置管理
│   │       └── ai-call/       # AI调用
│   │
│   ├── components/            # React组件
│   │   ├── ui/               # shadcn/ui基础组件
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ... (40+组件)
│   │   ├── layout/           # 布局组件
│   │   │   ├── Sidebar.tsx   # 侧边栏导航
│   │   │   └── Header.tsx    # 顶部导航
│   │   ├── experiments/      # 实验相关
│   │   │   ├── ExperimentList.tsx
│   │   │   ├── ExperimentEditor.tsx
│   │   │   ├── ExperimentDetail.tsx
│   │   │   └── ...
│   │   ├── projects/         # 项目相关
│   │   ├── tasks/            # 任务中心
│   │   ├── admin/            # 管理功能
│   │   ├── auth/             # 认证
│   │   └── common/           # 通用组件
│   │
│   ├── lib/                   # 核心库
│   │   ├── db.ts             # Prisma客户端
│   │   ├── auth.ts           # JWT认证
│   │   ├── permissions.ts    # 权限系统
│   │   └── ai-security.ts    # AI安全模块
│   │
│   ├── hooks/                 # 自定义Hooks
│   │   ├── api/              # React Query hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useExperiments.ts
│   │   │   ├── useProjects.ts
│   │   │   └── ...
│   │   └── use-toast.ts      # Toast通知
│   │
│   ├── contexts/             # React Context
│   │   └── AppContext.tsx    # 全局状态
│   │
│   └── providers/            # Provider组件
│       └── ReactQueryProvider.tsx
│
├── prisma/
│   └── schema.prisma         # 数据库模型定义
│
├── db/
│   └── custom.db             # SQLite数据库文件
│
├── docs/                     # 文档
├── public/                   # 静态资源
└── uploads/                  # 上传文件存储
```

## 4. 数据模型

### 4.1 核心模型关系

```
User (用户)
  │
  ├── owns ──────────► Project (项目)
  │                        │
  │                        ├── has ──► ProjectMember (成员)
  │                        │
  │                        └── contains ──► Experiment (实验)
  │                                              │
  ├── creates ──────────────────────────────────┘
  │
  ├── receives ──────► ReviewRequest (审核请求)
  │
  ├── submits ───────► UnlockRequest (解锁申请)
  │
  └── generates ─────► AuditLog (审计日志)
```

### 4.2 主要数据表

| 表名 | 说明 | 主要字段 |
|------|------|---------|
| User | 用户 | id, email, name, role, isActive |
| Project | 项目 | id, name, status, ownerId |
| ProjectMember | 项目成员 | projectId, userId, role |
| Experiment | 实验记录 | id, title, reviewStatus, authorId |
| Attachment | 附件 | id, name, path, experimentId |
| ReviewRequest | 审核请求 | experimentId, reviewerId, status |
| ReviewFeedback | 审核反馈 | experimentId, reviewerId, action |
| UnlockRequest | 解锁申请 | experimentId, requesterId, status |
| AuditLog | 审计日志 | userId, action, entityType |
| Template | 实验模板 | id, name, content, creatorId |
| AIConfig | AI配置 | id, provider, apiKeyEncrypted |

## 5. 权限系统

### 5.1 角色定义

```typescript
enum UserRole {
  SUPER_ADMIN  // 超级管理员
  ADMIN        // 管理员
  RESEARCHER   // 研究员
}
```

### 5.2 权限矩阵

| 权限 | RESEARCHER | ADMIN | SUPER_ADMIN |
|------|------------|-------|-------------|
| 创建实验 | ✅ 自己的 | ✅ | ✅ |
| 编辑实验 | ✅ 自己的 | ✅ 所有 | ✅ 所有 |
| 删除实验 | ✅ 自己的草稿 | ✅ | ✅ |
| 审核实验 | ❌ | ✅ | ✅ |
| 解锁实验 | ❌ | ✅ | ✅ |
| 创建项目 | ✅ | ✅ | ✅ |
| 删除项目 | ❌ | ❌ | ✅ |
| 用户管理 | ❌ | ✅ 非超管 | ✅ 所有 |
| AI配置 | ❌ | ❌ | ✅ |

### 5.3 项目角色

```typescript
enum ProjectMemberRole {
  PROJECT_LEAD  // 项目负责人 - 可管理成员、审核实验
  MEMBER        // 成员 - 可创建实验
  VIEWER        // 观察者 - 仅查看
}
```

### 5.4 视角系统架构

ELN系统引入"视角模式"概念，允许管理员在默认视角和全局视角之间切换。

#### 视角模式定义

| 视角 | 数据范围 | 适用角色 |
|------|---------|---------|
| 默认视角 | 用户参与的数据 | 所有用户 |
| 全局视角 | 系统中所有数据 | 管理员、超级管理员 |

#### 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端层                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  AppContext (viewMode状态)                                │   │
│  │    - viewMode: 'default' | 'global'                       │   │
│  │    - setViewMode: (mode) => void                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌───────────────────────────┴───────────────────────────────┐  │
│  │  React Query (携带viewMode参数)                            │  │
│  │    queryKey: ['experiments', viewMode]                     │  │
│  │    queryFn: () => fetch(`/api/...?viewMode=${viewMode}`)  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP API (?viewMode=default|global)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API层                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  视角权限验证                                             │   │
│  │    if (viewMode === 'global' && !isAdmin) {              │   │
│  │      viewMode = 'default' // 降级处理                     │   │
│  │    }                                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌───────────────────────────┴───────────────────────────────┐  │
│  │  数据过滤层                                               │   │
│  │    if (viewMode === 'global') {                           │   │
│  │      where = {} // 无过滤                                 │   │
│  │    } else {                                               │   │
│  │      where = buildUserScopeFilter(userId)                 │   │
│  │    }                                                      │   │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    SQLite DB    │
                    └─────────────────┘
```

#### 各模块过滤规则

```typescript
// 实验记录
const experimentFilter = viewMode === 'global' ? {} : {
  OR: [
    { authorId: userId },
    { experimentProjects: { some: { project: { projectMembers: { some: { userId } } } } } }
  ]
}

// 项目管理
const projectFilter = viewMode === 'global' ? {} : {
  OR: [
    { ownerId: userId },
    { projectMembers: { some: { userId } } }
  ]
}

// 待审核任务
const reviewFilter = viewMode === 'global' ? 
  { reviewStatus: 'PENDING_REVIEW' } : 
  { reviewStatus: 'PENDING_REVIEW', OR: [
    { reviewRequests: { some: { reviewerId: userId } } },
    { experimentProjects: { some: { project: { projectMembers: { some: { userId, role: 'PROJECT_LEAD' } } } } } }
  ]}
```

#### 视角与权限的关系

> **核心原则**: 视角只影响数据可见范围，不改变操作权限

```
┌───────────────────────────────────────────────────────────────┐
│                      视角 vs 权限                              │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  视角（Visibility）          权限（Permission）               │
│  ─────────────────          ─────────────────                │
│  决定能"看到"什么            决定能"操作"什么                  │
│                                                               │
│  示例:                                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 全局视角 + 管理员权限                                     │ │
│  │   ✓ 能看到所有实验                                       │ │
│  │   ✓ 能编辑未锁定的实验                                   │ │
│  │   ✗ 不能编辑已锁定的实验（权限限制）                       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 默认视角 + 研究员权限                                     │ │
│  │   ✓ 能看到自己参与的实验                                  │ │
│  │   ✓ 能编辑自己的草稿实验                                  │ │
│  │   ✗ 不能编辑他人的实验（视角+权限双重限制）                 │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## 6. API设计

### 6.1 认证API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | POST | 登录 |
| `/api/auth/logout` | POST | 登出 |
| `/api/auth/register` | POST | 注册 |
| `/api/auth/me` | GET | 获取当前用户 |

### 6.2 实验API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/experiments` | GET | 获取实验列表 |
| `/api/experiments` | POST | 创建实验 |
| `/api/experiments/[id]` | GET | 获取实验详情 |
| `/api/experiments/[id]` | PUT | 更新实验 |
| `/api/experiments/[id]` | DELETE | 删除实验 |
| `/api/experiments/[id]/submit` | POST | 提交审核 |
| `/api/experiments/[id]/review` | POST | 审核实验 |
| `/api/experiments/[id]/unlock-request` | POST | 申请解锁 |

### 6.3 响应格式

```typescript
// 成功响应
{
  success: true,
  data: { ... }
}

// 错误响应
{
  success: false,
  error: "错误信息"
}
```

## 7. 状态管理

### 7.1 服务端状态 (React Query)

```typescript
// Query Keys
const authKeys = {
  currentUser: ['currentUser']
}

const experimentKeys = {
  all: ['experiments'],
  detail: (id: string) => ['experiments', id]
}
```

### 7.2 客户端状态 (Zustand/AppContext)

- 当前用户信息
- 视角模式（默认/全局）
- 侧边栏状态

## 8. 安全机制

### 8.1 认证

- JWT Token 存储（Cookie + 内存/SessionStorage 双重备份）
- Token 有效期：7天
- 自动续期机制

### 8.2 权限验证

- API 层：每个请求验证用户身份和权限
- 前端层：UI组件根据权限显示/隐藏

### 8.3 数据安全

- 密码：bcrypt 加密存储
- AI密钥：AES-256-GCM 加密存储
- 敏感操作：审计日志记录

## 9. 性能优化

### 9.1 前端优化

- React Query 缓存减少重复请求
- 组件懒加载
- 虚拟列表（长列表场景）

### 9.2 后端优化

- 权限检查请求级缓存（AsyncLocalStorage）
- 批量查询替代N+1查询
- SQLite 内置缓存

## 10. 扩展性

### 10.1 AI功能扩展

- 支持多AI服务商配置
- 统一的AI调用接口
- 调用限流和审计

### 10.2 后续规划

- WebSocket 实时通知
- 移动端适配
- 数据导出增强
