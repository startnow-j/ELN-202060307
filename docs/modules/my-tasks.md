# 我的任务模块技术文档

## 概述

"我的任务"模块是一个任务中心，汇总用户的所有待办事项，包括待处理的草稿、待审核的实验、需要修改的实验等。

## 功能结构

```
我的任务中心
├── 我的草稿      - 我创建的草稿实验
├── 待我审核      - 等待我审核的实验
├── 需要修改      - 被退回需要修改的实验
└── 我的解锁申请   - 我提交的解锁申请记录
```

## 数据查询

### 我的草稿

```typescript
// 查询条件
const myDrafts = await db.experiment.findMany({
  where: {
    authorId: userId,
    reviewStatus: 'DRAFT'
  },
  orderBy: { updatedAt: 'desc' }
})
```

### 待我审核

```typescript
// 查询等待当前用户审核的实验
const pendingReview = await db.experiment.findMany({
  where: {
    reviewStatus: 'PENDING_REVIEW',
    OR: [
      // 方式1：被指定为审核人
      {
        reviewRequests: {
          some: {
            reviewerId: userId,
            status: 'PENDING'
          }
        }
      },
      // 方式2：是项目负责人（无指定审核人时的默认审核人）
      {
        reviewRequests: { none: {} },
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
})
```

### 需要修改

```typescript
// 查询被退回的实验
const needsRevision = await db.experiment.findMany({
  where: {
    authorId: userId,
    reviewStatus: 'NEEDS_REVISION'
  },
  include: {
    reviewFeedbacks: {
      where: { action: 'REQUEST_REVISION' },
      orderBy: { createdAt: 'desc' },
      take: 1
    }
  }
})
```

### 我的解锁申请

```typescript
// 查询用户提交的解锁申请
const unlockRequests = await db.unlockRequest.findMany({
  where: { requesterId: userId },
  orderBy: { createdAt: 'desc' }
})
```

## 前端组件

**文件**: `src/components/tasks/MyTasks.tsx`

```tsx
export function MyTasks({ 
  onViewExperiment, 
  onEditExperiment 
}: MyTasksProps) {
  const { data: user } = useAuth()
  const { data: experiments } = useExperiments()
  const { data: unlockRequests } = useUnlockRequests()
  
  // 分类统计
  const myDraftsCount = experiments.filter(...).length
  const pendingReviewCount = experiments.filter(...).length
  const needsRevisionCount = experiments.filter(...).length
  
  return (
    <div className="space-y-6">
      <TaskSection title="我的草稿" count={myDraftsCount}>
        {/* 草稿列表 */}
      </TaskSection>
      
      <TaskSection title="待我审核" count={pendingReviewCount}>
        {/* 待审核列表 */}
      </TaskSection>
      
      {/* ... */}
    </div>
  )
}
```

## 任务数量徽章

侧边栏显示任务总数徽章：

**文件**: `src/components/layout/Sidebar.tsx`

```tsx
// 计算总任务数
const totalTasksCount = myDraftsCount + pendingMyReviewCount + needsMyRevisionCount

// 显示徽章
{totalTasksCount > 0 && (
  <Badge variant="destructive" className="ml-auto">
    {totalTasksCount}
  </Badge>
)}
```

## 权限说明

| 任务类型 | 可见用户 |
|---------|---------|
| 我的草稿 | 实验作者 |
| 待我审核 | 被指定的审核人、项目负责人、管理员 |
| 需要修改 | 实验作者 |
| 我的解锁申请 | 申请发起人 |

## 视角差异

管理员和超级管理员切换视角后，任务中心的数据范围会发生变化。

### 默认视角下的任务

| 任务类型 | 数据来源 |
|---------|---------|
| 我的草稿 | 自己创建的草稿实验 |
| 待我审核 | 被指定为审核人 + 负责项目的待审核实验 |
| 需要修改 | 自己被退回的实验 |
| 我的解锁申请 | 自己提交的解锁申请 |

### 全局视角下的任务变化

| 任务类型 | 变化说明 |
|---------|---------|
| 我的草稿 | 不变（始终是自己的草稿） |
| 待我审核 | **增加**：所有待审核状态的实验 |
| 需要修改 | 不变（始终是自己的） |
| 我的解锁申请 | **增加**：所有待处理的解锁申请 |

### 使用场景对比

#### 默认视角

- 研究员处理自己的工作
- 项目负责人审核自己项目的实验
- 专注于被分配的任务

#### 全局视角

- 管理员主动处理系统中的待审核任务
- 查看并处理所有待审批的解锁申请
- 监督实验室整体工作进度

### 查询实现

```typescript
// 默认视角：待我审核
const pendingReview = await db.experiment.findMany({
  where: {
    reviewStatus: 'PENDING_REVIEW',
    OR: [
      // 被指定为审核人
      { reviewRequests: { some: { reviewerId: userId, status: 'PENDING' } } },
      // 负责的项目（无指定审核人时的默认）
      {
        reviewRequests: { none: {} },
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
})

// 全局视角：所有待审核
if (viewMode === 'global' && isAdmin) {
  const allPendingReview = await db.experiment.findMany({
    where: { reviewStatus: 'PENDING_REVIEW' }
  })
}
```

### 前端展示

```tsx
// 任务中心根据视角显示不同数据
function MyTasks() {
  const { viewMode, isAdmin } = useApp()
  
  // 默认视角的任务统计
  const myTasksCount = myDraftsCount + pendingMyReviewCount + needsRevisionCount
  
  // 全局视角增加的任务
  const globalExtraCount = viewMode === 'global' ? 
    (allPendingReviewCount - pendingMyReviewCount) : 0
  
  return (
    <>
      <TaskSection 
        title="待我审核" 
        count={viewMode === 'global' ? allPendingReviewCount : pendingMyReviewCount}
        showGlobalBadge={viewMode === 'global'}
      />
      {/* ... */}
    </>
  )
}
```

## 交互设计

### 快捷操作

- **草稿**: 点击 → 继续编辑 / 提交审核
- **待审核**: 点击 → 查看详情 → 审核操作
- **需要修改**: 点击 → 查看修改意见 → 编辑
- **解锁申请**: 查看状态 → 等待审批

### 状态指示

| 状态 | 颜色 | 说明 |
|------|------|------|
| PENDING | 黄色 | 待处理 |
| APPROVED | 绿色 | 已通过 |
| REJECTED | 红色 | 已拒绝 |

## API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/experiments?status=DRAFT` | GET | 获取草稿 |
| `/api/experiments?status=PENDING_REVIEW` | GET | 获取待审核 |
| `/api/experiments?status=NEEDS_REVISION` | GET | 获取需修改 |
| `/api/unlock-requests` | GET | 获取解锁申请 |

## 性能优化

1. **数据缓存**: 使用 React Query 缓存实验列表
2. **前端过滤**: 在前端对已获取的数据进行分类，避免多次请求
3. **分页加载**: 列表较长时支持分页

```typescript
// 使用同一数据源，前端分类
const { data: allExperiments } = useExperiments()

// 分类计算（内存操作，无需额外请求）
const myDrafts = allExperiments.filter(e => 
  e.reviewStatus === 'DRAFT' && e.authorId === userId
)
```
