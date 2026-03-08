# 实验记录审核流程开发指南

> **文档版本**: v1.0  
> **创建日期**: 2025-03-07  
> **适用版本**: BioLab ELN v3.3.x  
> **目的**: 为从头开发审核流程功能提供经验和指导

---

## 一、功能需求概述

### 1.1 核心需求

| 需求项 | 说明 | 优先级 |
|--------|------|--------|
| 提交时选择审核人 | 提交审核时可选择项目负责人作为审核人，并附留言 | P0 |
| 指定审核人通知 | 只有被选中的审核人能在"待我审核"看到记录 | P0 |
| 审核通过 | 审核人通过审核，记录自动锁定 | P0 |
| 返回修改意见 | 审核人返回修改意见，支持上传附件 | P0 |
| 审核转交 | 审核人转交给同项目的其他负责人 | P1 |
| 审核历史完整记录 | 显示提交、审核的人员、时间、意见等完整信息 | P1 |
| 解锁申请 | 锁定后可申请解锁 | P1 |
| 解锁处理 | 项目负责人和管理员可处理解锁申请 | P1 |

### 1.2 数据流程图

```
用户创建实验记录（草稿）
        ↓
提交审核 → 选择审核人 + 留言
        ↓
创建 ReviewRequest（指定审核人）
        ↓
更新 reviewStatus = PENDING_REVIEW
        ↓
被选中的审核人在"待我审核"看到记录
        ↓
┌─────────────────────────────────────────┐
│  审核操作选项:                           │
│  [通过] → 可选填写意见 → 锁定            │
│  [返回修改] → 必填意见 + 可上传附件      │
│  [转交] → 选择新审核人 → 转交           │
└─────────────────────────────────────────┘
        ↓
创建 ReviewFeedback 记录
        ↓
更新 Experiment 状态
```

---

## 二、数据库模型设计

### 2.1 核心枚举定义

```prisma
// 审核状态
enum ReviewStatus {
  DRAFT           // 草稿（可编辑）
  PENDING_REVIEW  // 待审核
  NEEDS_REVISION  // 需要修改
  LOCKED          // 已锁定（审核通过）
}

// 审核操作类型 - 重要：必须包含所有操作！
enum ReviewAction {
  SUBMIT           // 提交审核
  APPROVE          // 审核通过
  REQUEST_REVISION // 要求修改
  TRANSFER         // 转交审核
  UNLOCK           // 解锁
}

// 审核请求状态
enum ReviewRequestStatus {
  PENDING      // 待处理
  COMPLETED    // 已完成
  TRANSFERRED  // 已转交
  CANCELLED    // 已取消
}

// 解锁申请状态
enum UnlockRequestStatus {
  PENDING      // 待处理
  APPROVED     // 已批准
  REJECTED     // 已拒绝
  CANCELLED    // 已取消
}

// ⚠️ 重要：审计日志枚举也必须同步更新！
enum AuditAction {
  CREATE
  UPDATE
  DELETE
  LOGIN
  LOGOUT
  SUBMIT_REVIEW
  APPROVE
  REQUEST_REVISION
  TRANSFER        // ⚠️ 必须添加！否则会导致 PrismaClientValidationError
  MIGRATE_EXPERIMENT
  DOWNLOAD
}
```

### 2.2 核心模型定义

```prisma
// 实验记录模型
model Experiment {
  id          String          @id @default(cuid())
  title       String
  
  // 内容字段
  summary     String?
  conclusion  String?
  
  // AI提取相关
  extractedInfo   String?
  extractionStatus ExtractionStatus @default(PENDING)
  extractionError String?
  
  // 审核相关
  reviewStatus    ReviewStatus @default(DRAFT)
  completenessScore Int       @default(0)
  submittedAt DateTime?
  reviewedAt  DateTime?
  
  // 关联
  authorId    String
  author      User            @relation(fields: [authorId], references: [id])
  experimentProjects ExperimentProject[]
  attachments Attachment[]
  reviewFeedbacks ReviewFeedback[]
  reviewRequests ReviewRequest[]    // 审核请求（可多个）
  unlockRequests UnlockRequest[]
  
  @@map("experiments")
}

// 审核请求（指定审核人）
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

// 审核反馈
model ReviewFeedback {
  id          String       @id @default(cuid())
  action      ReviewAction              // 操作类型
  feedback    String?                   // 审核意见
  createdAt   DateTime     @default(now())

  experimentId String
  experiment   Experiment  @relation(fields: [experimentId], references: [id], onDelete: Cascade)
  reviewerId   String
  reviewer     User        @relation(fields: [reviewerId], references: [id])

  @@map("review_feedbacks")
}

// 解锁申请
model UnlockRequest {
  id          String              @id @default(cuid())
  reason      String              // 申请原因
  status      UnlockRequestStatus @default(PENDING)
  response    String?             // 审核回复
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  processedAt DateTime?           // 处理时间

  experimentId String
  experiment   Experiment         @relation(fields: [experimentId], references: [id], onDelete: Cascade)
  
  requesterId  String
  requester    User               @relation("UnlockRequester", fields: [requesterId], references: [id])
  
  processorId  String?
  processor    User?              @relation("UnlockProcessor", fields: [processorId], references: [id])

  @@map("unlock_requests")
}
```

---

## 三、API 开发指南

### 3.1 API 列表

| API | 方法 | 功能 |
|-----|------|------|
| `/api/experiments/[id]/submit` | POST | 提交审核（选择审核人+留言） |
| `/api/experiments/[id]/review` | POST | 审核操作（通过/修改/转交） |
| `/api/experiments/[id]/reviewers` | GET | 获取可选审核人列表 |
| `/api/experiments/[id]/feedbacks` | GET | 获取审核反馈历史 |
| `/api/experiments/[id]/unlock-request` | GET/POST/PUT | 解锁申请管理 |
| `/api/unlock-requests` | GET | 获取解锁申请列表 |
| `/api/unlock-requests/[id]/process` | POST | 处理解锁申请 |

### 3.2 提交审核 API 关键实现

```typescript
// /api/experiments/[id]/submit/route.ts

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const userId = await getUserIdFromToken(request)
  
  const body = await request.json()
  const { reviewerId, note } = body  // 新增参数

  // 1. 验证实验记录状态
  const experiment = await db.experiment.findUnique({
    where: { id },
    include: { experimentProjects: true }
  })
  
  if (!experiment || experiment.reviewStatus !== 'DRAFT') {
    return NextResponse.json({ error: '无法提交审核' }, { status: 400 })
  }

  // 2. 验证审核人有效性
  if (reviewerId) {
    // 检查审核人是否是关联项目的负责人或管理员
    const projectIds = experiment.experimentProjects.map(ep => ep.projectId)
    const isValidReviewer = await validateReviewer(reviewerId, projectIds)
    if (!isValidReviewer) {
      return NextResponse.json({ error: '选择的审核人无效' }, { status: 400 })
    }
  }

  // 3. 更新实验状态
  await db.experiment.update({
    where: { id },
    data: {
      reviewStatus: 'PENDING_REVIEW',
      submittedAt: new Date()
    }
  })

  // 4. 创建审核请求
  if (reviewerId) {
    await db.reviewRequest.create({
      data: {
        experimentId: id,
        reviewerId,
        note,
        status: 'PENDING'
      }
    })
  }

  // 5. 创建审计日志
  await db.auditLog.create({
    data: {
      action: 'SUBMIT_REVIEW',
      entityType: 'Experiment',
      entityId: id,
      userId
    }
  })

  return NextResponse.json({ success: true })
}
```

### 3.3 审核操作 API 关键实现

```typescript
// /api/experiments/[id]/review/route.ts

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const userId = await getUserIdFromToken(request)
  
  const body = await request.json()
  const { action, feedback, transferToId, attachmentIds } = body

  // 1. 验证权限
  // 只有指定审核人、项目负责人和管理员可审核
  
  // 2. 根据操作类型处理
  switch (action) {
    case 'APPROVE':
      // 审核通过 → 锁定
      await db.experiment.update({
        where: { id },
        data: {
          reviewStatus: 'LOCKED',
          reviewedAt: new Date()
        }
      })
      // 更新 ReviewRequest 状态
      await db.reviewRequest.updateMany({
        where: { experimentId: id, status: 'PENDING' },
        data: { status: 'COMPLETED' }
      })
      break
      
    case 'REQUEST_REVISION':
      // 返回修改
      await db.experiment.update({
        where: { id },
        data: { reviewStatus: 'NEEDS_REVISION' }
      })
      break
      
    case 'TRANSFER':
      // ⚠️ 重要：转交时需要创建新的 ReviewRequest
      if (!transferToId) {
        return NextResponse.json({ error: '请选择转交目标' }, { status: 400 })
      }
      
      // 更新原请求状态
      await db.reviewRequest.updateMany({
        where: { experimentId: id, status: 'PENDING' },
        data: { status: 'TRANSFERRED' }
      })
      
      // 创建新的审核请求
      await db.reviewRequest.create({
        data: {
          experimentId: id,
          reviewerId: transferToId,
          status: 'PENDING'
        }
      })
      break
  }

  // 3. 创建审核反馈记录
  await db.reviewFeedback.create({
    data: {
      action,
      feedback,
      experimentId: id,
      reviewerId: userId
    }
  })

  // 4. 创建审计日志
  // ⚠️ 重要：确保 AuditAction 枚举包含所有操作类型！
  await db.auditLog.create({
    data: {
      action: action === 'TRANSFER' ? 'TRANSFER' : 
              action === 'APPROVE' ? 'APPROVE' : 'REQUEST_REVISION',
      entityType: 'Experiment',
      entityId: id,
      userId
    }
  })

  return NextResponse.json({ success: true })
}
```

---

## 四、前端开发指南

### 4.1 提交审核对话框

```tsx
// ExperimentEditor.tsx 中的关键实现

// 状态定义
const [showSubmitDialog, setShowSubmitDialog] = useState(false)
const [reviewers, setReviewers] = useState<Reviewer[]>([])
const [selectedReviewerId, setSelectedReviewerId] = useState<string>('')
const [submitNote, setSubmitNote] = useState('')

// 获取可选审核人
const fetchReviewers = async () => {
  const res = await fetch(`/api/experiments/${experiment.id}/reviewers`)
  if (res.ok) {
    const data = await res.json()
    setReviewers(data.reviewers)
  }
}

// 提交审核
const handleSubmitReview = async () => {
  const res = await fetch(`/api/experiments/${experiment.id}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reviewerId: selectedReviewerId,
      note: submitNote
    })
  })
  
  if (res.ok) {
    setShowSubmitDialog(false)
    // 刷新数据
    refreshData()
  }
}

// UI 组件
<Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>提交审核</DialogTitle>
    </DialogHeader>
    
    <div className="space-y-4">
      {/* 审核人选择 */}
      <div>
        <Label>选择审核人</Label>
        <Select value={selectedReviewerId} onValueChange={setSelectedReviewerId}>
          <SelectTrigger>
            <SelectValue placeholder="请选择审核人" />
          </SelectTrigger>
          <SelectContent>
            {reviewers.map(r => (
              <SelectItem key={r.id} value={r.id}>
                {r.name} ({r.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* 留言 */}
      <div>
        <Label>留言（可选）</Label>
        <Textarea
          value={submitNote}
          onChange={e => setSubmitNote(e.target.value)}
          placeholder="请输入留言..."
        />
      </div>
    </div>
    
    <DialogFooter>
      <Button onClick={handleSubmitReview}>确认提交</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 4.2 审核历史组件

```tsx
// ReviewHistory.tsx 的简化实现

interface ReviewHistoryProps {
  reviewFeedbacks: ReviewFeedback[]
  reviewRequests: ReviewRequest[]
  reviewStatus: string
  reviewedAt?: string | null
  attachmentCount: number
}

export function ReviewHistory({ 
  reviewFeedbacks, 
  reviewRequests, 
  reviewStatus, 
  reviewedAt,
  attachmentCount 
}: ReviewHistoryProps) {
  // 构建事件列表
  const events = []
  
  // 添加提交事件
  reviewRequests.forEach(request => {
    if (request.status === 'PENDING' || request.status === 'COMPLETED') {
      events.push({
        type: 'SUBMIT',
        timestamp: request.createdAt,
        target: request.reviewer,
        note: request.note
      })
    }
    if (request.status === 'TRANSFERRED') {
      events.push({
        type: 'TRANSFER',
        timestamp: request.updatedAt,
        target: request.reviewer
      })
    }
  })
  
  // 添加审核反馈事件
  reviewFeedbacks.forEach(feedback => {
    events.push({
      type: feedback.action,
      timestamp: feedback.createdAt,
      user: feedback.reviewer,
      feedback: feedback.feedback
    })
  })
  
  // 按时间倒序排序
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  
  // 渲染...
}
```

### 4.3 视角切换组件

```tsx
// ⚠️ 重要：视角初始化时机问题

// ❌ 错误做法：在 useState 中直接判断
const [viewMode, setViewMode] = useState(
  isAdmin ? 'global' : 'default'  // currentUser 可能还未加载
)

// ✅ 正确做法1：使用 useEffect 监听用户变化
const [viewMode, setViewMode] = useState('default')

useEffect(() => {
  if (currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN')) {
    setViewMode('global')
  }
}, [currentUser])

// ✅ 正确做法2（推荐）：默认普通视角，用户手动切换
const [viewMode, setViewMode] = useState('default')
// 不自动切换，让用户自己选择
```

---

## 五、常见问题与解决方案

### 5.1 PrismaClientValidationError: action 不是有效的 AuditAction

**问题描述**：
```
PrismaClientValidationError: action: "TRANSFER" 不是有效的 AuditAction
```

**原因**：
- ReviewAction 枚举添加了 TRANSFER
- 但 AuditAction 枚举没有同步添加
- 创建审计日志时使用 TRANSFER 作为 action 值导致验证失败

**解决方案**：
```prisma
// prisma/schema.prisma
enum AuditAction {
  // ... 其他值
  TRANSFER        // ⚠️ 必须添加！
}

// 然后执行
// bun run db:push
// npx prisma generate
```

### 5.2 数据库 Schema 同步问题

**问题描述**：
- 修改了 Prisma schema
- 运行 `db:push` 后数据库被重置

**原因**：
- SQLite 在某些结构变更时会重建表
- 强制同步可能导致数据丢失

**解决方案**：
```bash
# 1. 开发阶段：使用 db:push（快速同步）
bun run db:push

# 2. 重要：每次修改 schema 后重新生成 Prisma 客户端
npx prisma generate

# 3. 生产环境：使用迁移
bun run db:migrate
```

### 5.3 视角切换无效

**问题描述**：
- 管理员登录后，全局视角和普通视角显示相同数据

**原因**：
- useState 初始值只在首次渲染时计算
- currentUser 可能在组件渲染时还未加载
- 导致 isAdmin 永远是 false

**解决方案**：
- 所有用户默认使用普通视角
- 管理员手动切换到全局视角
- 避免自动判断角色进行视角初始化

### 5.4 审核转交后原审核人仍可见

**问题描述**：
- 审核转交后，原审核人仍能在"待我审核"看到记录

**原因**：
- 只创建了新的 ReviewRequest
- 没有更新原 ReviewRequest 的状态

**解决方案**：
```typescript
// 转交时必须更新原请求状态
await db.reviewRequest.updateMany({
  where: { 
    experimentId: id, 
    status: 'PENDING' 
  },
  data: { status: 'TRANSFERRED' }
})

// 然后创建新请求
await db.reviewRequest.create({
  data: {
    experimentId: id,
    reviewerId: transferToId,
    status: 'PENDING'
  }
})
```

### 5.5 项目新建后不显示在列表中

**问题描述**：
- 管理员新建项目后，项目列表中看不到新项目

**原因**：
- API 默认视角处理逻辑不一致
- AppContext 的 refreshData 没有传递视角参数

**解决方案**：
- 所有用户默认使用普通视角
- 新建的项目会显示在"我创建的"中
- 全局视角需要手动切换

---

## 六、开发顺序建议

### 6.1 推荐开发顺序

```
阶段1: 数据库模型
├── 1. 更新 ReviewAction 枚举
├── 2. 更新 AuditAction 枚举（同步添加！）
├── 3. 创建 ReviewRequest 模型
├── 4. 创建 UnlockRequest 模型
└── 5. 执行 db:push 和 prisma generate

阶段2: 后端 API
├── 1. /api/experiments/[id]/reviewers (获取审核人)
├── 2. /api/experiments/[id]/submit (提交审核)
├── 3. /api/experiments/[id]/review (审核操作)
├── 4. /api/experiments/[id]/feedbacks (审核历史)
├── 5. /api/experiments/[id]/unlock-request (解锁申请)
└── 6. /api/unlock-requests (解锁列表)

阶段3: 前端组件
├── 1. 提交审核对话框（ExperimentEditor.tsx）
├── 2. 审核对话框增强（MyTasks.tsx）
├── 3. 审核历史组件（ReviewHistory.tsx）
├── 4. 解锁申请对话框
└── 5. 解锁处理界面

阶段4: 类型定义更新
├── 1. AppContext.tsx 类型定义
└── 2. API 返回数据格式

阶段5: 测试与修复
├── 1. 提交审核流程测试
├── 2. 审核操作测试（通过/修改/转交）
├── 3. 解锁流程测试
└── 4. 视角切换测试
```

### 6.2 每次修改 Schema 后必须执行

```bash
# 1. 同步数据库
bun run db:push

# 2. 重新生成 Prisma 客户端
npx prisma generate

# 3. 检查 TypeScript 类型
bun run lint
```

---

## 七、测试账户

| 邮箱 | 密码 | 角色 | 用途 |
|------|------|------|------|
| superadmin@example.com | SuperAdmin123! | SUPER_ADMIN | 全局管理测试 |
| admin@example.com | admin123 | ADMIN | 管理员审核测试 |
| PI@example.com | PI123456! | ADMIN | PI审核测试 |
| lead@example.com | lead123 | RESEARCHER | 项目负责人测试 |
| researcher@example.com | Researcher123! | RESEARCHER | 研究员测试 |

---

## 八、关键经验总结

### 8.1 必须同步更新的内容

| 修改项 | 需同步更新 |
|--------|------------|
| ReviewAction 枚举 | AuditAction 枚举 |
| Prisma Schema | Prisma Client (npx prisma generate) |
| API 返回字段 | AppContext 类型定义 |
| 前端组件状态 | useEffect 依赖项 |

### 8.2 开发检查清单

- [ ] ReviewAction 和 AuditAction 枚举同步
- [ ] 执行 db:push 后执行 prisma generate
- [ ] API 测试通过后再开发前端
- [ ] 视角切换逻辑正确处理 currentUser 可能为 null 的情况
- [ ] 转交操作更新原 ReviewRequest 状态
- [ ] 审核历史包含所有操作类型

### 8.3 常见错误代码

| 错误 | 原因 | 解决 |
|------|------|------|
| PrismaClientValidationError | 枚举值未定义 | 添加缺失的枚举值 |
| 数据库被重置 | 强制同步 | 使用迁移或备份数据 |
| 视角切换无效 | 初始化时机 | 默认普通视角，手动切换 |
| 转交失败 | 未更新原请求 | updateMany 更新状态 |

---

*此文档基于 BioLab ELN v3.3.x 实际开发经验整理，用于指导审核流程功能的开发工作。*
