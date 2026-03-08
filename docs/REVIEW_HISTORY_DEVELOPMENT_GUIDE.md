# 审核历史显示组件开发指南

> 本文档记录了审核历史显示组件的开发经验、最终实现方案和注意事项，用于指导恢复开发时的参考。

## 一、最终实现方案概述

### 1.1 组件位置
- **文件路径**: `src/components/experiments/ReviewHistory.tsx`
- **调用位置**: `src/components/experiments/ExperimentDetail.tsx` 右侧面板底部

### 1.2 显示策略
采用**简化的卡片式显示**方案，每个审核动作独立显示为一个带背景色边框的卡片。

**关键设计决策**：
- ✅ 不使用复杂的折叠/展开时间线
- ✅ 每个动作一个卡片，视觉清晰
- ✅ 向上箭头（↑）指示时间顺序（最新的在上面）
- ✅ 锁定状态单独显示附件数量

### 1.3 数据来源
```typescript
interface ReviewHistoryProps {
  reviewFeedbacks: ReviewFeedback[]  // 审核反馈（通过、修改、转交、解锁）
  reviewRequests: ReviewRequest[]    // 审核请求（提交审核）
  reviewStatus: string               // 当前审核状态
  reviewedAt?: string | null         // 审核通过时间
  attachmentCount: number            // 附件数量
}
```

## 二、显示方案详细说明

### 2.1 动作类型与视觉样式

| 动作类型 | 图标 | 背景色 | 边框色 | 标题 |
|---------|------|--------|--------|------|
| SUBMIT | Send (发送) | bg-blue-50 | border-blue-200 | 提交审核 |
| TRANSFER | CornerDownRight (转交) | bg-purple-50 | border-purple-200 | 转交审核 |
| APPROVE | CheckCircle (勾选) | bg-green-50 | border-green-200 | 审核通过 |
| REQUEST_REVISION | XCircle (叉号) | bg-orange-50 | border-orange-200 | 要求修改 |
| UNLOCK_REQUEST | Unlock (解锁) | bg-amber-50 | border-amber-200 | 申请解锁 |
| UNLOCK_APPROVED | CheckCircle | bg-green-50 | border-green-200 | 批准解锁 |
| UNLOCK_REJECTED | XCircle | bg-red-50 | border-red-200 | 拒绝解锁 |

### 2.2 特殊显示逻辑

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

### 2.3 锁定状态显示
```typescript
// 当 reviewStatus === 'LOCKED' 时，在底部显示
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  <Lock className="w-4 h-4" />
  <span>记录已锁定，附件：{attachmentCount} 个</span>
</div>
```

## 三、后台审计数据保留

### 3.1 数据库模型

虽然前端显示简化，但后台必须保留完整的审计数据：

```prisma
// 审核请求（指定审核人）
model ReviewRequest {
  id          String              @id @default(cuid())
  status      ReviewRequestStatus @default(PENDING)  // PENDING/COMPLETED/TRANSFERRED/CANCELLED
  note        String?             // 提交留言
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  
  experimentId String
  reviewerId   String
  reviewer     User               @relation(...)
  
  @@map("review_requests")
}

// 审核反馈
model ReviewFeedback {
  id          String       @id @default(cuid())
  action      ReviewAction  // SUBMIT/APPROVE/REQUEST_REVISION/TRANSFER/UNLOCK
  feedback    String?       // 反馈内容
  createdAt   DateTime     @default(now())
  
  experimentId String
  reviewerId   String
  reviewer     User        @relation(...)
  
  @@map("review_feedbacks")
}

// 解锁申请
model UnlockRequest {
  id          String              @id @default(cuid())
  reason      String              // 申请原因
  status      UnlockRequestStatus @default(PENDING)  // PENDING/APPROVED/REJECTED/CANCELLED
  response    String?             // 审核回复
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  processedAt DateTime?           // 处理时间
  
  experimentId String
  requesterId  String
  processorId  String?
  processor    User?              @relation(...)
  
  @@map("unlock_requests")
}
```

### 3.2 API 返回数据要求

#### experiments API 必须返回
```typescript
// 在 experiments API 中必须包含 reviewRequests
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

#### experiments/[id] API 必须返回
```typescript
// 单个实验详情 API 必须包含完整的审核历史
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

## 四、解锁处理开发经验

### 4.1 解锁流程

```
用户申请解锁
    ↓
创建 UnlockRequest (status: PENDING)
    ↓
项目负责人/管理员收到通知
    ↓
┌─────────────────────────────────┐
│  批准 → status: APPROVED        │
│       → 实验状态变为 NEEDS_REVISION │
│       → 用户可编辑              │
│                                 │
│  拒绝 → status: REJECTED        │
│       → 实验保持锁定            │
│       → 记录拒绝原因            │
└─────────────────────────────────┘
```

### 4.2 解锁申请 API

**创建解锁申请**: `POST /api/experiments/[id]/unlock-request`

验证条件：
1. 用户已登录
2. 必须填写解锁原因
3. 只有作者才能申请解锁
4. 实验必须处于锁定状态（LOCKED）
5. 不能重复提交待处理的申请

### 4.3 解锁处理 API

**处理解锁申请**: `PUT /api/experiments/[id]/unlock-request`

```typescript
// 处理逻辑
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

### 4.4 解锁申请界面入口

**用户端入口**：我的任务 → 已锁定记录 Tab → 申请解锁按钮

**管理员处理入口**：
- 全局视角下可以看到待处理的解锁申请列表
- 需要在 MyTasks 组件中添加解锁申请处理 Tab

## 五、类型定义

### 5.1 AppContext 中的类型

```typescript
// 审核请求类型
interface ReviewRequest {
  id: string
  status: string
  note: string | null
  createdAt: string
  updatedAt: string
  reviewerId: string
  reviewer: AppUser
}

// 审核反馈类型
interface ReviewFeedback {
  id: string
  action: string  // SUBMIT | APPROVE | REQUEST_REVISION | TRANSFER | UNLOCK
  feedback: string | null
  createdAt: string
  reviewerId: string
  reviewer: AppUser
}

// Experiment 接口扩展
interface Experiment {
  // ... 其他字段
  reviewFeedbacks?: ReviewFeedback[]
  reviewRequests?: ReviewRequest[]
}
```

## 六、常见问题与解决方案

### 6.1 审核历史为空但显示锁定状态
**原因**：旧数据没有 ReviewRequest/ReviewFeedback 记录
**解决**：组件处理空数组情况，仅显示锁定信息卡片

### 6.2 转交审核显示不完整
**原因**：API 未返回 transferTo 用户信息
**解决**：确保 API 查询包含完整的关联用户信息

### 6.3 解锁类型判断错误
**原因**：feedback 内容格式不一致
**解决**：统一使用关键词匹配（"批准"、"拒绝"、"申请"）

### 6.4 时间排序问题
**解决**：始终使用倒序排列（最新的在上面）

```typescript
events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
```

## 七、开发注意事项

1. **数据完整性**：前端显示简化，但后台必须保留完整审计数据
2. **兼容性处理**：处理旧数据没有审核历史的情况
3. **权限控制**：解锁申请只能由作者发起，处理需要项目负责人/管理员权限
4. **状态一致性**：解锁后实验状态必须正确更新为 NEEDS_REVISION
5. **审计追踪**：所有操作都应记录审计日志

## 八、相关文件清单

| 文件 | 用途 |
|-----|------|
| `src/components/experiments/ReviewHistory.tsx` | 审核历史显示组件 |
| `src/components/experiments/ExperimentDetail.tsx` | 实验详情页（调用审核历史） |
| `src/app/api/experiments/route.ts` | 实验列表 API（返回 reviewRequests） |
| `src/app/api/experiments/[id]/route.ts` | 实验详情 API |
| `src/app/api/experiments/[id]/unlock-request/route.ts` | 解锁申请 API |
| `src/contexts/AppContext.tsx` | 类型定义 |
| `prisma/schema.prisma` | 数据库模型 |
