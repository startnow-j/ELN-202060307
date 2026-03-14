# 审核流程技术文档

## 概述

审核流程是ELN系统的核心业务流程，支持实验记录的多级审核、退回修改、解锁申请等功能。

## 审核状态流转

```
                    ┌──────────────────────────────────┐
                    │                                  │
                    ▼                                  │
┌────────┐   提交   ┌────────────┐   通过   ┌────────┐ │
│  DRAFT │ ──────▶ │   PENDING  │ ──────▶ │ LOCKED │ │
└────────┘         │   REVIEW   │          └────────┘ │
     ▲             └────────────┘               │     │
     │                   │ 退回                  │     │
     │                   ▼                       │解锁 │
     │             ┌────────────┐                │申请 │
     └─────────────│   NEEDS    │◀───────────────┘     │
       修改重提    │  REVISION  │                      │
                   └────────────┘                      │
                                                       │
                   ┌────────────┐                      │
                   │   UNLOCK   │◀─────────────────────┘
                   │  REQUEST   │
                   └────────────┘
                         │
                    审批通过/拒绝
                         ▼
                   回到DRAFT状态
```

## 数据模型

### 审核请求

```prisma
model ReviewRequest {
  id           String              @id @default(cuid())
  status       ReviewRequestStatus @default(PENDING)
  note         String?
  
  experimentId String
  reviewerId   String
  reviewer     User                @relation(...)
  experiment   Experiment          @relation(...)
  
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
}
```

### 审核反馈

```prisma
model ReviewFeedback {
  id           String       @id @default(cuid())
  action       ReviewAction
  feedback     String?
  
  experimentId String
  reviewerId   String
  reviewer     User         @relation(...)
  experiment   Experiment   @relation(...)
  attachments  Attachment[]
  
  createdAt    DateTime     @default(now())
}
```

### 解锁申请

```prisma
model UnlockRequest {
  id           String              @id @default(cuid())
  reason       String
  status       UnlockRequestStatus @default(PENDING)
  response     String?
  processedAt  DateTime?
  
  experimentId String
  requesterId  String
  processorId  String?
  
  requester    User                @relation("UnlockRequester", ...)
  processor    User?               @relation("UnlockProcessor", ...)
  experiment   Experiment          @relation(...)
  
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
}
```

## 核心API

### 提交审核

```
POST /api/experiments/[id]/submit
```

```typescript
// 请求体
{
  reviewerIds: string[],   // 审核人ID列表
  submitNote?: string      // 提交说明
}

// 响应
{
  success: boolean,
  experiment: Experiment
}
```

**流程**：
1. 验证实验状态（必须是DRAFT或NEEDS_REVISION）
2. 验证审核人资格
3. 创建ReviewRequest记录
4. 更新实验状态为PENDING_REVIEW
5. 记录审计日志

### 审核操作

```
POST /api/experiments/[id]/review
```

```typescript
// 请求体
{
  action: 'APPROVE' | 'REQUEST_REVISION' | 'TRANSFER',
  feedback?: string,           // 审核意见
  transferToUserId?: string,   // 转交目标用户
  attachmentIds?: string[]     // 附件ID列表
}
```

**审核通过流程**：
1. 验证审核人权限
2. 检查所有审核人是否都已通过
3. 更新实验状态为LOCKED
4. 记录ReviewFeedback
5. 更新ReviewRequest状态

**退回修改流程**：
1. 更新实验状态为NEEDS_REVISION
2. 记录修改意见
3. 通知作者

**转交审核**：
1. 创建新的ReviewRequest
2. 更新原ReviewRequest状态为TRANSFERRED
3. 通知新审核人

### 申请解锁

```
POST /api/experiments/[id]/unlock-request
```

```typescript
// 请求体
{
  reason: string  // 解锁原因（必填）
}
```

### 处理解锁申请

```
POST /api/unlock-requests/[id]/process
```

```typescript
// 请求体
{
  action: 'approve' | 'reject',
  response?: string  // 处理说明
}
```

## 权限控制

### 可审核实验的条件

```typescript
export async function canReviewExperiment(
  userId: string,
  experimentId: string
): Promise<boolean> {
  // 1. 实验作者不能审核自己的实验
  // 2. 超级管理员和管理员可以审核
  // 3. 被指定的审核人可以审核
  // 4. 项目负责人可以审核
}
```

### 可解锁实验的条件

```typescript
export async function canUnlockExperiment(
  userId: string,
  experimentId: string
): Promise<boolean> {
  // 1. 超级管理员和管理员可以解锁
  // 2. 项目负责人可以解锁
}
```

## 视角差异

审核流程在管理员全局视角下有显著变化，主要体现在审核范围和权限。

### 审核权限范围

| 视角 | 可审核实验范围 |
|------|---------------|
| 默认视角 | 指定为审核人 + 负责项目的待审核实验 |
| 全局视角 | 所有待审核状态的实验 |

### 解锁审批范围

| 视角 | 可审批解锁申请范围 |
|------|-------------------|
| 默认视角 | 负责项目的实验解锁申请 |
| 全局视角 | 所有待处理的解锁申请 |

### 使用场景

#### 默认视角（项目负责人/指定审核人）

- 审核被指定负责的实验
- 处理自己项目的实验审核
- 审批项目相关的解锁申请

**审核人来源**：
1. 提交时被指定为审核人
2. 实验所属项目的项目负责人
3. 系统管理员（全局视角下）

#### 全局视角（管理员/超级管理员）

- 可主动审核任何待审核实验
- 可处理任何解锁申请
- 监督整个审核流程
- 介入需要紧急处理的审核

### 数据过滤实现

```typescript
// 获取待审核实验（API层）
export async function GET(request: NextRequest) {
  const { viewMode } = getQueryParams(request)
  const isAdmin = await isAdmin(userId)
  
  let whereClause = { reviewStatus: 'PENDING_REVIEW' }
  
  // 默认视角：只返回用户有审核权限的实验
  if (viewMode !== 'global' || !isAdmin) {
    whereClause = {
      reviewStatus: 'PENDING_REVIEW',
      OR: [
        // 指定为审核人
        { reviewRequests: { some: { reviewerId: userId, status: 'PENDING' } } },
        // 项目负责人
        {
          experimentProjects: {
            some: {
              project: {
                OR: [
                  { ownerId: userId },
                  { projectMembers: { some: { userId, role: 'PROJECT_LEAD' } } }
                ]
              }
            }
          }
        }
      ]
    }
  }
  
  // 全局视角：返回所有待审核实验
  const experiments = await db.experiment.findMany({ where: whereClause })
}
```

### 审核操作对比

| 操作 | 默认视角 | 全局视角 |
|------|---------|---------|
| 查看待审核列表 | 有审核权限的实验 | 所有待审核实验 |
| 通过审核 | 有审核权限的实验 | 任何待审核实验 |
| 退回修改 | 有审核权限的实验 | 任何待审核实验 |
| 转交审核 | 有审核权限的实验 | 任何待审核实验 |
| 处理解锁申请 | 项目相关的申请 | 任何解锁申请 |

### 前端实现

```tsx
// 审核列表组件
function ReviewQueue() {
  const { viewMode, isAdmin } = useApp()
  
  // 根据视角获取不同的数据
  const { data: pendingReviews } = useQuery({
    queryKey: ['pending-reviews', viewMode],
    queryFn: () => authFetch(`/api/experiments?status=PENDING_REVIEW&viewMode=${viewMode}`)
  })
  
  // 全局视角显示提示
  const showGlobalHint = viewMode === 'global' && isAdmin
  
  return (
    <div>
      {showGlobalHint && (
        <Alert>
          <InfoIcon />
          当前为全局视角，显示所有待审核实验
        </Alert>
      )}
      {/* 审核列表 */}
    </div>
  )
}
```

## 前端组件

| 组件 | 功能 |
|------|------|
| ReviewDialog | 审核操作对话框 |
| SubmitDialog | 提交审核对话框 |
| UnlockDialog | 解锁申请对话框 |
| ReviewHistory | 审核历史展示 |
| ReviewerSelect | 审核人选择器 |

## 通知机制（规划中）

当前版本暂未实现实时通知，后续可扩展：

1. **站内消息** - WebSocket推送
2. **邮件通知** - 关键操作邮件提醒
3. **待办提醒** - 任务中心聚合

## 审计日志

所有审核操作记录审计日志：

```typescript
// 审核通过
{
  action: 'APPROVE',
  entityType: 'Experiment',
  details: { feedback: '...' }
}

// 申请解锁
{
  action: 'UNLOCK',
  entityType: 'Experiment',
  details: { reason: '...' }
}
```

## 性能优化

### 批量查询审核状态

```typescript
// 避免N+1查询
const reviewRequests = await db.reviewRequest.findMany({
  where: { experimentId: { in: experimentIds } }
})
```

### 缓存审核人信息

使用React Query缓存审核人列表：

```typescript
const { data: reviewers } = useQuery({
  queryKey: ['reviewers', experimentId],
  queryFn: () => getAvailableReviewers(experimentId),
  staleTime: 5 * 60 * 1000  // 5分钟
})
```
