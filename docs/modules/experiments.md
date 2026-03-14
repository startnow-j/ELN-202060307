# 实验记录模块技术文档

## 概述

实验记录是ELN系统的核心模块，支持实验的全生命周期管理，包括创建、编辑、审核、锁定、解锁等功能。

## 数据模型

```prisma
model Experiment {
  id                 String              @id @default(cuid())
  title              String
  summary            String?
  conclusion         String?
  extractedInfo      String?             // AI提取的信息(JSON)
  extractionStatus   ExtractionStatus    @default(PENDING)
  extractionError    String?
  reviewStatus       ReviewStatus        @default(DRAFT)
  completenessScore  Int                 @default(0)
  storageLocation    String?
  primaryProjectId   String?
  tags               String?
  
  // 关联
  authorId           String
  author             User                @relation(...)
  attachments        Attachment[]
  experimentProjects ExperimentProject[]
  versions           ExperimentVersion[]
  reviewFeedbacks    ReviewFeedback[]
  reviewRequests     ReviewRequest[]
  unlockRequests     UnlockRequest[]
  
  // 时间戳
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  submittedAt        DateTime?
  reviewedAt         DateTime?
}
```

## 状态流转

```
┌────────┐   提交审核   ┌────────────┐   审核通过   ┌────────┐
│  DRAFT │ ──────────▶ │PENDING_REVIEW│ ──────────▶ │ LOCKED │
└────────┘             └────────────┘             └────────┘
                             │ 需要修改                 ▲
                             ▼                         │
                        ┌────────────┐                 │
                        │NEEDS_REVISION│                │
                        └────────────┘                 │
                             │ 重新提交                  │
                             └──────────────────────────┘
                             解锁申请批准 ───────────────┘
```

## 核心API

### 1. 创建实验

**文件**: `src/app/api/experiments/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // 1. 验证用户身份
  const userId = await getUserIdFromToken(request)
  
  // 2. 验证创建权限
  const canCreate = await canCreateExperiment(userId)
  
  // 3. 创建实验记录
  const experiment = await db.experiment.create({
    data: { ... }
  })
  
  // 4. 记录审计日志
  await db.auditLog.create({ ... })
  
  return NextResponse.json(experiment)
}
```

### 2. 提交审核

**文件**: `src/app/api/experiments/[id]/submit/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // 1. 获取实验信息
  // 2. 验证提交权限（作者或全局视角下的管理员）
  // 3. 验证实验状态（必须是DRAFT或NEEDS_REVISION）
  // 4. 创建审核请求
  // 5. 更新实验状态为PENDING_REVIEW
  // 6. 发送通知（如有）
}
```

### 3. 审核实验

**文件**: `src/app/api/experiments/[id]/review/route.ts`

支持的审核操作：
- `APPROVE` - 通过，实验锁定
- `REQUEST_REVISION` - 需要修改，退回作者
- `TRANSFER` - 转交其他审核人

## 权限控制

**文件**: `src/lib/permissions.ts`

```typescript
// 检查是否可编辑实验
export async function canEditExperiment(userId: string, experimentId: string)

// 检查是否可审核实验
export async function canReviewExperiment(userId: string, experimentId: string)

// 检查是否可解锁实验
export async function canUnlockExperiment(userId: string, experimentId: string)
```

## 富文本编辑器

**组件**: `src/components/experiments/ExperimentEditor.tsx`

使用 TipTap 编辑器：

```typescript
const editor = useEditor({
  extensions: [
    StarterKit,
    Table.configure({ ... }),
    Image.configure({ ... }),
    CodeBlockLowlight.configure({ ... }),
    Placeholder.configure({ ... }),
  ],
  content: initialContent,
  onUpdate: ({ editor }) => {
    // 自动保存逻辑
  }
})
```

## 视角差异

ELN系统支持两种视角模式，不同视角下用户看到的实验数据范围不同。

### 数据可见范围

| 视角模式 | 可见实验范围 | 适用角色 |
|---------|-------------|---------|
| **默认视角** | 自己创建的实验 + 所属项目的实验 | 所有用户 |
| **全局视角** | 系统中所有实验 | 管理员、超级管理员 |

### 操作权限对比

| 操作 | 默认视角 | 全局视角 |
|------|---------|---------|
| 查看实验 | 可见范围内的实验 | 所有实验 |
| 编辑实验 | 自己的实验 | 所有可编辑状态的实验 |
| 删除实验 | 自己的草稿实验 | 所有实验 |
| 提交审核 | 自己的实验 | 可代理提交任何实验 |

### 数据过滤实现

**API请求参数**：

```typescript
// GET /api/experiments?viewMode=default|global
```

**后端过滤逻辑**：

```typescript
// 默认视角过滤
if (viewMode !== 'global' || !isAdmin) {
  where = {
    OR: [
      { authorId: userId },  // 自己创建的
      {
        experimentProjects: {
          some: {
            project: {
              projectMembers: { some: { userId } }  // 所属项目
            }
          }
        }
      }
    ]
  }
}

// 全局视角（管理员）
// where = {} 无过滤
```

### 使用场景

#### 默认视角适用场景

- 研究员日常工作
- 管理自己的实验记录
- 专注于个人工作内容

#### 全局视角适用场景

- 管理员监督实验室工作
- 跨项目查看实验进展
- 审核实验时需要查看更多上下文
- 处理待审核任务队列

### 前端实现

```tsx
// 实验列表组件根据视角获取数据
const { viewMode } = useApp()
const { data: experiments } = useExperiments({ viewMode })

// 视角切换后自动刷新
useEffect(() => {
  refetch()
}, [viewMode])
```

---

## 附件管理

附件存储在 `uploads/` 目录，支持：
- 文档: .doc, .docx, .pdf
- 数据: .xls, .xlsx, .csv
- 图片: .jpg, .png, .gif

```typescript
interface Attachment {
  id: string
  name: string
  type: string
  size: number
  path: string
  category: AttachmentCategory
  previewData?: PreviewData  // 预览数据
}
```

## 审核流程

### 多人审核

1. 提交时可选择多个审核人
2. 所有审核人都需要通过
3. 任一审核人退回则实验退回

### 审核人选择逻辑

```typescript
export async function getAvailableReviewers(experimentId: string) {
  // 1. 获取实验关联项目的负责人
  // 2. 获取系统管理员
  // 3. 排除实验作者
  // 4. 返回可选审核人列表
}
```

## 解锁申请流程

1. 已锁定实验的作者发起解锁申请
2. 填写解锁原因
3. 审核人审批
4. 批准后实验状态变为DRAFT

## 前端组件

| 组件 | 路径 | 功能 |
|------|------|------|
| ExperimentList | `components/experiments/ExperimentList.tsx` | 实验列表 |
| ExperimentEditor | `components/experiments/ExperimentEditor.tsx` | 实验编辑器 |
| ExperimentDetail | `components/experiments/ExperimentDetail.tsx` | 实验详情 |
| ReviewDialog | `components/experiments/ReviewDialog.tsx` | 审核对话框 |
| UnlockDialog | `components/experiments/UnlockDialog.tsx` | 解锁申请对话框 |
| SubmitDialog | `components/experiments/SubmitDialog.tsx` | 提交审核对话框 |
