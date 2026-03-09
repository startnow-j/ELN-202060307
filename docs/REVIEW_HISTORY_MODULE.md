# 审核历史模块说明文档

> **版本**: v1.0  
> **最后更新**: 2025-03-09  
> **维护者**: 开发团队

---

## 目录

1. [模块概述](#1-模块概述)
2. [数据模型](#2-数据模型)
3. [API接口](#3-api接口)
4. [前端组件](#4-前端组件)
5. [显示策略](#5-显示策略)
6. [解锁流程](#6-解锁流程)
7. [权限控制](#7-权限控制)
8. [常见问题](#8-常见问题)
9. [相关文件](#9-相关文件)
10. [变更记录](#10-变更记录)

---

## 1. 模块概述

### 1.1 功能定位

审核历史模块用于记录和展示实验记录的完整审核流程，包括：

- 提交审核记录
- 审核通过/要求修改记录
- 转交审核记录
- 解锁申请与处理记录

### 1.2 设计原则

| 原则 | 说明 |
|------|------|
| **审计完整性** | 后台保留完整的审计数据，不可删除 |
| **显示简洁性** | 前端采用简化卡片式显示，突出关键信息 |
| **时间可追溯** | 所有操作记录时间戳，支持历史追溯 |

---

## 2. 数据模型

### 2.1 ReviewRequest（审核请求）

记录提交审核时指定的审核人信息。

```prisma
model ReviewRequest {
  id           String              @id @default(cuid())
  status       ReviewRequestStatus @default(PENDING)
  note         String?             // 提交留言
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
  
  experimentId String
  reviewerId   String
  
  experiment   Experiment          @relation(...)
  reviewer     User                @relation(...)
  
  @@map("review_requests")
}

enum ReviewRequestStatus {
  PENDING      // 待审核
  COMPLETED    // 已完成
  TRANSFERRED  // 已转交
  CANCELLED    // 已取消
}
```

### 2.2 ReviewFeedback（审核反馈）

记录所有审核操作的历史。

```prisma
model ReviewFeedback {
  id           String       @id @default(cuid())
  action       ReviewAction // 操作类型
  feedback     String?      // 反馈内容
  createdAt    DateTime     @default(now())
  
  experimentId String
  reviewerId   String
  
  experiment   Experiment   @relation(...)
  reviewer     User         @relation(...)
  attachments  Attachment[] // 批注附件
  
  @@map("review_feedbacks")
}

enum ReviewAction {
  SUBMIT            // 提交审核
  APPROVE           // 审核通过
  REQUEST_REVISION  // 要求修改
  TRANSFER          // 转交审核
  UNLOCK            // 解锁操作
}
```

### 2.3 UnlockRequest（解锁申请）

记录解锁申请和处理情况。

```prisma
model UnlockRequest {
  id           String              @id @default(cuid())
  reason       String              // 申请原因
  status       UnlockRequestStatus @default(PENDING)
  response     String?             // 审核回复
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
  processedAt  DateTime?           // 处理时间
  
  experimentId String
  requesterId  String
  processorId  String?
  
  experiment   Experiment          @relation(...)
  requester    User                @relation(...)
  processor    User?               @relation(...)
  
  @@map("unlock_requests")
}

enum UnlockRequestStatus {
  PENDING    // 待处理
  APPROVED   // 已批准
  REJECTED   // 已拒绝
  CANCELLED  // 已取消
}
```

---

## 3. API接口

### 3.1 获取审核历史

**端点**: `GET /api/experiments/[id]/feedbacks`

**权限**: 所有登录用户

**返回数据**:
```typescript
{
  feedbacks: ReviewFeedback[],
  requests: ReviewRequest[],
  unlockRequests: UnlockRequest[]
}
```

### 3.2 提交审核

**端点**: `POST /api/experiments/[id]/submit`

**请求体**:
```json
{
  "reviewerIds": ["user_id_1", "user_id_2"],
  "note": "请审核这个实验"
}
```

### 3.3 审核操作

**端点**: `POST /api/experiments/[id]/review`

**请求体**:
```json
{
  "action": "APPROVE",
  "feedback": "实验内容完整",
  "attachmentIds": ["att_id_1"]
}
```

### 3.4 解锁申请

**端点**: `POST /api/experiments/[id]/unlock-request`

**请求体**:
```json
{
  "reason": "需要补充实验数据"
}
```

### 3.5 解锁处理

**端点**: `PUT /api/experiments/[id]/unlock-request`

**请求体**:
```json
{
  "requestId": "unlock_request_id",
  "action": "APPROVE",
  "response": "批准解锁，请尽快完成修改"
}
```

---

## 4. 前端组件

### 4.1 组件位置

| 文件 | 用途 |
|-----|------|
| `src/components/experiments/ReviewHistory.tsx` | 审核历史显示组件 |
| `src/components/experiments/ExperimentDetail.tsx` | 实验详情页（调用审核历史） |
| `src/components/tasks/MyTasks.tsx` | 我的任务（解锁申请处理Tab） |

### 4.2 组件Props

```typescript
interface ReviewHistoryProps {
  reviewFeedbacks: ReviewFeedback[]  // 审核反馈
  reviewRequests: ReviewRequest[]    // 审核请求
  reviewStatus: string               // 当前审核状态
  reviewedAt?: string | null         // 审核通过时间
  attachmentCount: number            // 附件数量
}
```

### 4.3 数据获取要求

**实验列表 API 必须返回**:
```typescript
include: {
  reviewRequests: {
    include: {
      reviewer: {
        select: { id: true, name: true, email: true, role: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  }
}
```

**实验详情 API 必须返回**:
```typescript
include: {
  reviewFeedbacks: {
    include: {
      reviewer: {
        select: { id: true, name: true, email: true, role: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  },
  reviewRequests: {
    include: {
      reviewer: {
        select: { id: true, name: true, email: true, role: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  }
}
```

---

## 5. 显示策略

### 5.1 卡片式显示

采用简化的卡片式显示方案，每个审核动作独立显示为一个带背景色边框的卡片。

**设计要点**:
- ✅ 不使用复杂的折叠/展开时间线
- ✅ 每个动作一个卡片，视觉清晰
- ✅ 向上箭头（↑）指示时间顺序（最新的在上面）
- ✅ 锁定状态单独显示附件数量

### 5.2 动作类型与视觉样式

| 动作类型 | 图标 | 背景色 | 边框色 | 标题 |
|---------|------|--------|--------|------|
| SUBMIT | Send（发送） | bg-blue-50 | border-blue-200 | 提交审核 |
| TRANSFER | CornerDownRight（转交） | bg-purple-50 | border-purple-200 | 转交审核 |
| APPROVE | CheckCircle（勾选） | bg-green-50 | border-green-200 | 审核通过 |
| REQUEST_REVISION | XCircle（叉号） | bg-orange-50 | border-orange-200 | 要求修改 |
| UNLOCK_REQUEST | Unlock（解锁） | bg-amber-50 | border-amber-200 | 申请解锁 |
| UNLOCK_APPROVED | CheckCircle | bg-green-50 | border-green-200 | 批准解锁 |
| UNLOCK_REJECTED | XCircle | bg-red-50 | border-red-200 | 拒绝解锁 |

### 5.3 特殊显示逻辑

#### 提交审核（SUBMIT）
```typescript
// 显示内容
- 标题：提交审核
- 时间：格式化的时间戳
- 目标对象：提交给：XXX（角色）
- 留言：note 字段内容
```

#### 转交审核（TRANSFER）
```typescript
// 显示内容
- 标题：转交审核
- 时间：格式化的时间戳
- 目标对象：转交给：XXX（角色）
- 说明：note 或 feedback 字段内容
```

#### 解锁操作类型判断
```typescript
// 解锁操作有三种类型，通过 feedback 内容判断
if (feedback.action === 'UNLOCK') {
  const fb = feedback.feedback?.toLowerCase() || ''
  if (fb.includes('批准') || fb.includes('同意')) {
    eventType = 'UNLOCK_APPROVED'
  } else if (fb.includes('拒绝') || fb.includes('驳回')) {
    eventType = 'UNLOCK_REJECTED'
  } else if (fb.includes('申请')) {
    eventType = 'UNLOCK_REQUEST'
  }
}
```

### 5.4 锁定状态显示

```typescript
// 当 reviewStatus === 'LOCKED' 时，在底部显示
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  <Lock className="w-4 h-4" />
  <span>记录已锁定，附件：{attachmentCount} 个</span>
</div>
```

---

## 6. 解锁流程

### 6.1 流程图

```
用户申请解锁
    ↓
创建 UnlockRequest (status: PENDING)
    ↓
项目负责人/管理员收到通知
    ↓
┌─────────────────────────────────────┐
│  批准 → status: APPROVED            │
│        → 实验状态变为 NEEDS_REVISION │
│        → 用户可编辑                 │
│                                     │
│  拒绝 → status: REJECTED            │
│        → 实验保持锁定               │
│        → 记录拒绝原因               │
└─────────────────────────────────────┘
```

### 6.2 解锁申请验证条件

1. 用户已登录
2. 必须填写解锁原因
3. 只有作者才能申请解锁
4. 实验必须处于锁定状态（LOCKED）
5. 不能重复提交待处理的申请

### 6.3 解锁处理逻辑

```typescript
if (action === 'approve') {
  // 1. 更新解锁申请状态
  await db.unlockRequest.update({
    where: { id: unlockRequestId },
    data: {
      status: 'APPROVED',
      response: responseReason,
      processedAt: new Date(),
      processorId: userId
    }
  })
  
  // 2. 更新实验状态为需要修改
  await db.experiment.update({
    where: { id: experimentId },
    data: { reviewStatus: 'NEEDS_REVISION' }
  })
  
  // 3. 创建审核反馈记录
  await db.reviewFeedback.create({
    data: {
      action: 'UNLOCK',
      feedback: `批准解锁：${responseReason || '同意解锁申请'}`,
      experimentId,
      reviewerId: userId
    }
  })
}
```

### 6.4 界面入口

| 角色 | 入口位置 |
|------|---------|
| 作者 | 我的任务 → 已锁定 Tab → 申请解锁按钮 |
| 项目负责人/管理员 | 我的任务 → 解锁申请 Tab |

---

## 7. 权限控制

### 7.1 权限矩阵

| 操作 | SUPER_ADMIN | ADMIN | PROJECT_LEAD | MEMBER | 作者 |
|------|:-----------:|:-----:|:------------:|:------:|:----:|
| 查看审核历史 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 提交审核 | ❌ | ❌ | ❌ | ❌ | ✅ |
| 审核实验 | ✅(非自己) | ✅(非自己) | ✅(项目内) | ❌ | ❌ |
| 申请解锁 | ❌ | ❌ | ❌ | ❌ | ✅ |
| 处理解锁 | ✅ | ✅ | ✅(项目内) | ❌ | ❌ |

### 7.2 审核权限检查

> **⚠️ BUG-001 修复说明 (2025-03-09)**
> 
> **问题**：项目负责人审核实验时返回 403 Forbidden
> 
> **根因**：权限检查使用 `members` 字段（系统角色）而非 `projectMembers`（项目角色）
> 
> **修复**：将 `members` 替换为 `projectMembers`
> 
> **修复文件**：`src/app/api/experiments/[id]/review/route.ts`

---

## 8. 常见问题

### 8.1 审核历史为空但显示锁定状态

**原因**：旧数据没有 ReviewRequest/ReviewFeedback 记录

**解决**：组件处理空数组情况，仅显示锁定信息卡片

### 8.2 转交审核显示不完整

**原因**：API 未返回 transferTo 用户信息

**解决**：确保 API 查询包含完整的关联用户信息

### 8.3 解锁类型判断错误

**原因**：feedback 内容格式不一致

**解决**：统一使用关键词匹配（"批准"、"拒绝"、"申请"）

### 8.4 时间排序问题

**解决**：始终使用倒序排列（最新的在上面）

```typescript
events.sort((a, b) => 
  new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
)
```

---

## 9. 相关文件

### 9.1 前端文件

```
src/components/experiments/
├── ReviewHistory.tsx          # 审核历史组件
└── ExperimentDetail.tsx       # 实验详情页

src/components/tasks/
└── MyTasks.tsx                # 我的任务（含解锁处理）

src/contexts/
└── AppContext.tsx             # 类型定义
```

### 9.2 后端文件

```
src/app/api/experiments/[id]/
├── submit/route.ts            # 提交审核
├── review/route.ts            # 审核操作
├── reviewers/route.ts         # 获取审核人列表
├── unlock-request/route.ts    # 解锁申请管理
└── feedbacks/route.ts         # 审核反馈历史

src/app/api/unlock-requests/
└── route.ts                   # 待处理解锁申请列表

src/lib/
└── permissions.ts             # 权限检查函数
```

---

## 10. 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0 | 2025-03-09 | 初始版本：整合 REVIEW_HISTORY_DEVELOPMENT_GUIDE 和 REVIEW_WORKFLOW_DEVELOPMENT_GUIDE |

---

*本文档记录审核历史模块的所有功能和实现细节。*
