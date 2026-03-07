# BioLab ELN 审核管理模块说明文档

> **版本**: v3.5  
> **最后更新**: 2025-03-07  
> **维护者**: 开发团队

---

> ⚠️ **重要通知 (v3.4)**
> 
> **审核管理模块已合并到"我的任务"模块！**
> 
> - **原入口**: 侧边栏 → 审核管理
> - **新入口**: 侧边栏 → 我的任务
> 
> **功能映射**:
> | 原ReviewList Tab | 新MyTasks Tab |
> |-----------------|---------------|
> | 待审核 | 待我审核 |
> | 待修改 | 待我修改 |
> | 已锁定 | 我的已锁定记录 |
> 
> **变更原因**: 统一任务管理入口，避免功能重复，提升用户体验
> 
> **参考文档**: [我的任务模块文档](./MY_TASKS_MODULE.md)
> 
> **废弃组件**: `src/components/experiments/ReviewList.tsx` (已标记为 @deprecated)

> 📌 **v3.5 新增功能 (2025-03-07)**
> 
> **审核历史展示重构**
> 
> - 简化展示：移除IP地址、电子签名、评分等冗余信息
> - 卡片化设计：每个操作独立卡片，视觉分隔清晰
> - 时间指示：卡片间添加向上箭头，指示时间顺序
> - 目标显示：提交审核显示"提交给谁"、转交审核显示"转交给谁"
> - 锁定信息：锁定状态显示锁定时间和附件数

---

## 目录

1. [模块概述](#1-模块概述)
2. [数据模型](#2-数据模型)
3. [审核状态流转](#3-审核状态流转)
4. [API端点详解](#4-api端点详解)
5. [权限控制](#5-权限控制)
6. [审核流程](#6-审核流程)
7. [审计日志](#7-审计日志)
8. [变更记录](#8-变更记录)

---

## 1. 模块概述

### 1.1 功能定位

审核管理模块是ELN系统的质量控制核心，提供：

- 实验记录提交审核
- 审核人指派
- 审核通过/拒绝操作
- 实验解锁（管理员）
- 审核历史追溯

### 1.2 核心概念

| 概念 | 说明 |
|------|------|
| **审核状态** | 实验记录在审核流程中的状态 |
| **审核请求** | 提交给指定审核人的请求记录 |
| **审核反馈** | 审核人给出的审核意见 |
| **审核人** | 有权限审核实验的用户（管理员、项目负责人） |

---

## 2. 数据模型

### 2.1 ReviewStatus（审核状态枚举）

```prisma
enum ReviewStatus {
  DRAFT           // 草稿
  PENDING_REVIEW  // 待审核
  NEEDS_REVISION  // 需要修改
  LOCKED          // 已锁定（审核通过）
}
```

### 2.2 ReviewAction（审核操作枚举）

```prisma
enum ReviewAction {
  SUBMIT           // 提交审核
  APPROVE          // 审核通过
  REQUEST_REVISION // 要求修改
  TRANSFER         // 转交审核
  UNLOCK           // 解锁
}
```

### 2.3 ReviewRequest（审核请求模型）

```prisma
model ReviewRequest {
  id          String              @id @default(cuid())
  status      ReviewRequestStatus @default(PENDING)
  note        String?             // 提交留言
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  experimentId String
  experiment   Experiment         @relation(fields: [experimentId], references: [id], onDelete: Cascade)
  reviewerId   String
  reviewer     User               @relation(fields: [reviewerId], references: [id])

  @@map("review_requests")
}
```

### 2.4 ReviewFeedback（审核反馈模型）

```prisma
model ReviewFeedback {
  id          String       @id @default(cuid())
  action      ReviewAction
  feedback    String?      // 审核意见
  createdAt   DateTime     @default(now())

  experimentId String
  experiment   Experiment  @relation(fields: [experimentId], references: [id], onDelete: Cascade)
  reviewerId   String
  reviewer     User        @relation(fields: [reviewerId], references: [id])

  @@map("review_feedbacks")
}
```

### 2.5 ReviewRequestStatus（审核请求状态）

```prisma
enum ReviewRequestStatus {
  PENDING      // 待处理
  COMPLETED    // 已完成
  TRANSFERRED  // 已转交
  CANCELLED    // 已取消
}
```

---

## 3. 审核状态流转

### 3.1 状态流转图

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
┌─────────┐     提交审核      ┌────────────────┐               │
│  DRAFT  │ ────────────────▶ │ PENDING_REVIEW │               │
└─────────┘                   └────────────────┘               │
     ▲                              │                          │
     │                              │                          │
     │         ┌────────────────────┴────────────────────┐     │
     │         │                                         │     │
     │    解锁(管理员)                              要求修改     │
     │         │                                         │     │
     │         ▼                                         ▼     │
     │  ┌─────────┐                              ┌────────────────┐
     └──│ LOCKED  │◄─────── 审核通过 ────────────│ NEEDS_REVISION │
        └─────────┘                              └────────────────┘
                                                      │
                                                      │ 修改后重新提交
                                                      └──────────▶ ...
```

### 3.2 状态变更规则

| 当前状态 | 操作 | 目标状态 | 执行者 |
|---------|------|---------|--------|
| DRAFT | 提交审核 | PENDING_REVIEW | 作者 |
| NEEDS_REVISION | 提交审核 | PENDING_REVIEW | 作者 |
| PENDING_REVIEW | 审核通过 | LOCKED | 审核人 |
| PENDING_REVIEW | 要求修改 | NEEDS_REVISION | 审核人 |
| LOCKED | 解锁 | DRAFT | 管理员/项目负责人 |

### 3.3 状态限制

| 状态 | 可编辑 | 可删除 | 可提交 |
|------|:------:|:------:|:------:|
| DRAFT | ✅ | ✅ | ✅ |
| PENDING_REVIEW | ❌ | ❌ | ❌ |
| NEEDS_REVISION | ✅ | ✅ | ✅ |
| LOCKED | ❌ | ❌ | ❌ |

---

## 4. API端点详解

### 4.1 提交审核

**端点**: `POST /api/experiments/[id]/submit`

**权限**: 仅作者可提交

**前置条件**:

| 条件 | 要求 |
|------|------|
| 存储位置 | 必须关联项目（不能是暂存区） |
| 当前状态 | `DRAFT` 或 `NEEDS_REVISION` |
| 完整度评分 | ≥60分（v3.3更新） |

**请求体**:
```json
{
  "reviewerId": "user123",    // 可选，指定审核人
  "note": "请审核这个实验"    // 可选，提交留言
}
```

**响应**:
```json
{
  "id": "exp123",
  "title": "实验标题",
  "reviewStatus": "PENDING_REVIEW",
  "submittedAt": "2025-03-01T10:00:00Z",
  "reviewRequest": {
    "id": "req123",
    "reviewerId": "user123",
    "status": "PENDING"
  }
}
```

### 4.2 审核操作

**端点**: `POST /api/experiments/[id]/review`

**权限**: 审核人（非作者）

**请求体**:
```json
{
  "action": "APPROVE",        // APPROVE | REQUEST_REVISION
  "feedback": "实验内容完整，数据可靠"  // 可选，审核意见
}
```

**审核通过逻辑**:
1. 状态变更为 `LOCKED`
2. 记录审核时间
3. 创建 `ReviewFeedback` 记录
4. 更新 `ReviewRequest` 状态为 `COMPLETED`
5. 记录审计日志

**要求修改逻辑**:
1. 状态变更为 `NEEDS_REVISION`
2. 创建 `ReviewFeedback` 记录
3. 更新 `ReviewRequest` 状态为 `COMPLETED`
4. 记录审计日志

**响应**:
```json
{
  "id": "exp123",
  "title": "实验标题",
  "reviewStatus": "LOCKED",
  "completenessScore": 100,
  "reviewedAt": "2025-03-01T11:00:00Z",
  "reviewFeedbacks": [{
    "id": "fb123",
    "action": "APPROVE",
    "feedback": "实验内容完整",
    "reviewer": { "name": "审核人" },
    "createdAt": "2025-03-01T11:00:00Z"
  }]
}
```

### 4.3 解锁实验

**端点**: `POST /api/experiments/[id]/unlock`

**权限**: 超级管理员、管理员、项目负责人

**业务逻辑**:
1. 检查实验状态是否为 `LOCKED`
2. 检查用户是否有解锁权限
3. 状态变更为 `DRAFT`
4. 清除审核时间
5. 记录审计日志

**请求体**:
```json
{
  "reason": "需要补充实验数据"  // 必填，解锁原因
}
```

**响应**:
```json
{
  "id": "exp123",
  "title": "实验标题",
  "reviewStatus": "DRAFT",
  "reviewedAt": null
}
```

### 4.4 获取可用审核人

**端点**: `GET /api/experiments/[id]/reviewers`

**返回**: 可审核该实验的用户列表

**逻辑**:
1. 项目负责人（排除作者）
2. 系统管理员（排除作者）
3. 已指定的审核人

---

## 5. 权限控制

### 5.1 审核权限矩阵

| 操作 | SUPER_ADMIN | ADMIN | PROJECT_LEAD | MEMBER | 作者 |
|------|:-----------:|:-----:|:------------:|:------:|:----:|
| 提交审核 | ❌ | ❌ | ❌ | ❌ | ✅ |
| 审核实验 | ✅(非自己) | ✅(非自己) | ✅(非自己) | ❌ | ❌ |
| 解锁实验 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 查看审核历史 | ✅ | ✅ | ✅ | ✅ | ✅ |

### 5.2 审核权限检查

```typescript
export async function canReviewExperiment(userId: string, experimentId: string): Promise<boolean> {
  const experiment = await db.experiment.findUnique({
    where: { id: experimentId },
    include: { experimentProjects: true }
  })
  
  if (!experiment) return false
  
  // 作者不能审核自己的实验
  if (experiment.authorId === userId) return false
  
  // 系统管理员可以审核（但不能审核自己的）
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return true
  
  // 检查是否为指定审核人
  const reviewRequest = await db.reviewRequest.findFirst({
    where: { experimentId, reviewerId: userId, status: 'PENDING' }
  })
  
  if (reviewRequest) return true
  
  // 检查是否为项目负责人的实验
  for (const ep of experiment.experimentProjects) {
    const role = await getProjectRole(userId, ep.projectId)
    if (role === 'PROJECT_LEAD') return true
  }
  
  return false
}
```

### 5.3 解锁权限检查

```typescript
export async function canUnlockExperiment(userId: string, experimentId: string): Promise<boolean> {
  // 系统管理员可以解锁
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return true
  
  // 检查是否为项目负责人的实验
  const experiment = await db.experiment.findUnique({
    where: { id: experimentId },
    include: { experimentProjects: true }
  })
  
  if (!experiment) return false
  
  for (const ep of experiment.experimentProjects) {
    const role = await getProjectRole(userId, ep.projectId)
    if (role === 'PROJECT_LEAD') return true
  }
  
  return false
}
```

### 5.4 可用审核人获取

```typescript
export async function getAvailableReviewers(experimentId: string) {
  const experiment = await db.experiment.findUnique({
    where: { id: experimentId },
    include: { experimentProjects: true }
  })
  
  if (!experiment) return []
  
  const leads: ReviewerInfo[] = []
  
  // 收集项目负责人
  for (const ep of experiment.experimentProjects) {
    const projectLeads = await getProjectLeads(ep.projectId)
    for (const lead of projectLeads) {
      if (lead.id !== experiment.authorId && !leads.find(l => l.id === lead.id)) {
        leads.push({
          ...lead,
          isProjectLead: true,
          projectName: ep.project.name
        })
      }
    }
  }
  
  // 获取系统管理员
  const admins = await db.user.findMany({
    where: {
      role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      isActive: true
    },
    select: { id: true, name: true, email: true, avatar: true }
  })
  
  for (const admin of admins) {
    if (admin.id !== experiment.authorId && !leads.find(l => l.id === admin.id)) {
      leads.push({ ...admin, isProjectLead: false })
    }
  }
  
  return leads
}
```

---

## 6. 审核流程

### 6.1 标准审核流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        作者视角                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 创建实验记录（DRAFT）                                         │
│  2. 上传附件、填写内容                                            │
│  3. 关联项目                                                     │
│  4. 提交审核 ───────────────────────────────────────┐            │
│                                                     │            │
└─────────────────────────────────────────────────────┼────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        审核人视角                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 收到审核请求通知                                              │
│  2. 查看实验内容和附件                                            │
│  3. 做出审核决定：                                                │
│     ├── 审核通过 ──▶ LOCKED（不可修改）                           │
│     └── 要求修改 ──▶ NEEDS_REVISION（退回作者）                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 修改后重新提交流程

```
NEEDS_REVISION ──▶ 作者修改内容 ──▶ 重新提交 ──▶ PENDING_REVIEW ──▶ ...
```

### 6.3 项目归档触发审核

```
项目归档（ARCHIVED）
      │
      ▼
自动锁定所有关联实验（LOCKED）
      │
      ▼
记录审计日志（原因：项目归档自动锁定）
```

---

## 7. 审计日志

### 7.1 审核相关审计操作

| AuditAction | 触发场景 |
|-------------|----------|
| `SUBMIT_REVIEW` | 提交审核 |
| `APPROVE` | 审核通过 |
| `REQUEST_REVISION` | 要求修改 |
| `UPDATE` | 解锁实验 / 项目归档锁定 |

### 7.2 审计日志示例

**提交审核**:
```json
{
  "action": "SUBMIT_REVIEW",
  "entityType": "Experiment",
  "entityId": "exp123",
  "userId": "author123",
  "details": {
    "title": "实验标题",
    "reviewerId": "reviewer123",
    "note": "请审核"
  }
}
```

**审核通过**:
```json
{
  "action": "APPROVE",
  "entityType": "Experiment",
  "entityId": "exp123",
  "userId": "reviewer123",
  "details": {
    "title": "实验标题",
    "feedback": "实验内容完整，可以锁定"
  }
}
```

**项目归档锁定**:
```json
{
  "action": "UPDATE",
  "entityType": "Experiment",
  "entityId": "exp123",
  "userId": "admin123",
  "details": {
    "reason": "项目归档自动锁定",
    "projectId": "proj123",
    "projectName": "项目名称"
  }
}
```

---

## 8. 变更记录

### v3.5 (2025-03-07)

**审核历史展示重构**:
- [x] 简化展示内容，移除冗余信息（IP地址、电子签名显示、评分、附件数、状态变更）
- [x] 卡片化设计，每个操作独立卡片
- [x] 卡片间添加向上箭头指示时间顺序
- [x] 显示目标审核人（提交给/转交给）
- [x] 锁定状态显示锁定时间和附件数

**修改文件**:
- `src/components/experiments/ReviewHistory.tsx` - 完全重构
- `src/components/experiments/ExperimentDetail.tsx` - 移除审核状态简要记录
- `src/app/api/experiments/route.ts` - 返回所有reviewRequests

### v3.4 (2025-03-05)

**合并到我的任务模块**:
- [x] 移除侧边栏独立入口
- [x] ReviewList 组件标记废弃
- [x] 功能整合到 MyTasks 组件

### v3.3 (2025-03-01)

**新增功能**:
- [x] 审核请求管理
- [x] 审核反馈记录
- [x] 项目归档自动锁定
- [x] 审计日志记录

**修改文件**:
- `src/app/api/experiments/[id]/submit/route.ts`
- `src/app/api/experiments/[id]/review/route.ts`
- `src/lib/permissions.ts`

**数据库变更**:
- 新增 `ReviewRequest` 模型
- 新增 `ReviewFeedback` 模型
- 新增 `ReviewAction` 枚举
- 新增 `ReviewRequestStatus` 枚举
- `AuditAction` 新增 `MIGRATE_EXPERIMENT`

---

## 附录

### A. 相关文件清单

```
src/
├── app/api/experiments/[id]/
│   ├── submit/route.ts              # 提交审核
│   ├── review/route.ts              # 审核操作
│   └── unlock/route.ts              # 解锁实验
│
├── lib/
│   └── permissions.ts               # 权限检查函数
│
└── components/
    └── experiments/
        ├── SubmitReviewDialog.tsx   # 提交审核对话框
        └── ReviewDialog.tsx         # 审核对话框

prisma/
└── schema.prisma                    # 数据模型定义
```

### B. 错误码说明

| HTTP状态码 | 错误信息 | 原因 |
|-----------|---------|------|
| 400 | 无效的审核操作 | action不是APPROVE或REQUEST_REVISION |
| 400 | 当前状态不能审核 | 状态不是PENDING_REVIEW |
| 400 | 实验必须关联项目才能提交审核 | 暂存实验 |
| 400 | 完整度不足，无法提交审核 | 评分低于60分（v3.3更新） |
| 401 | 未登录 | Token无效或过期 |
| 403 | 无权限审核此实验记录 | 非审核人 |
| 403 | 作者不能审核自己的实验 | 作者尝试审核 |
| 404 | 实验记录不存在 | ID无效 |

### C. 通知机制（规划中）

| 事件 | 接收者 | 通知方式 |
|------|--------|---------|
| 提交审核 | 审核人 | 站内消息 / 邮件 |
| 审核通过 | 作者 | 站内消息 |
| 要求修改 | 作者 | 站内消息 / 邮件 |
| 实验解锁 | 作者 | 站内消息 |

---

> **注意**: 本文档应随模块变更及时更新。如发现文档与实际实现不符，请以代码为准并更新文档。
