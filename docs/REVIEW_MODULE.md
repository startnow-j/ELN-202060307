# 审核管理模块说明

> **版本**: v3.3.7  
> **最后更新**: 2025-03-08  
> **维护者**: 开发团队

---

> ⚠️ **重要通知**
> 
> **审核管理功能已合并到"我的任务"模块！**
> 
> - **原入口**: 侧边栏 → 审核管理（已移除）
> - **新入口**: 侧边栏 → 我的任务
> 
> **参考文档**: [我的任务模块文档](./MY_TASKS_MODULE.md)

---

## 一、审核状态流转

### 1.1 状态定义

| 状态 | 英文 | 说明 | 可执行操作 |
|------|------|------|-----------|
| 草稿 | DRAFT | 初始状态 | 编辑、删除、提交审核 |
| 待审核 | PENDING_REVIEW | 已提交审核 | 等待审核 |
| 需修改 | NEEDS_REVISION | 审核退回 | 编辑、重新提交 |
| 已锁定 | LOCKED | 审核通过 | 查看、申请解锁 |

### 1.2 状态流转图

```
┌────────────┐
│   DRAFT    │◄─────────────────────────────┐
│   (草稿)    │                              │
└────────────┘                              │
      │ 提交审核                             │
      ▼                                     │
┌────────────┐  审核通过   ┌────────────┐    │
│  PENDING   │ ─────────► │   LOCKED   │    │
│  REVIEW    │            │   (锁定)    │    │
│  (待审核)   │            └────────────┘    │
└────────────┘                  │ 批准解锁   │
      │ 需修改                  └───────────┘
      ▼
┌────────────┐
│   NEEDS    │
│  REVISION  │
│  (需修改)   │
└────────────┘
```

---

## 二、审核流程详解

### 2.1 提交审核

**前置条件**:
1. 实验状态为 DRAFT 或 NEEDS_REVISION
2. 已关联至少一个项目
3. 完整度评分 ≥ 60分

**提交选项**:
- 选择审核人（可多选，可选）
- 填写提交留言（可选）

**API**: `POST /api/experiments/[id]/submit`

**请求体**:
```json
{
  "reviewerIds": ["user_id_1", "user_id_2"],
  "note": "请审核这个实验"
}
```

### 2.2 审核操作

**审核人权限**:
- 项目负责人：可审核项目内实验
- 管理员：可审核所有实验
- 超级管理员：可审核所有实验
- 不能审核自己的实验

**审核决定**:

| 决定 | 结果状态 | 后续操作 |
|------|----------|----------|
| 审核通过 | LOCKED | 记录锁定，不可修改 |
| 要求修改 | NEEDS_REVISION | 作者修改后重新提交 |
| 转交审核 | PENDING_REVIEW | 转给其他审核人 |

**API**: `POST /api/experiments/[id]/review`

**请求体**:
```json
{
  "action": "APPROVE",
  "feedback": "实验内容完整",
  "attachmentIds": ["att_id_1"]
}
```

### 2.3 批注附件

审核人可以在"要求修改"时上传批注附件：

- 支持格式：PDF、Word、Excel、图片
- 附件存储在实验记录下
- 在审核历史中显示和下载

---

## 三、解锁功能

### 3.1 解锁申请

**触发条件**: 作者需要对已锁定的实验进行修改

**申请流程**:
1. 作者在"我的任务 → 已锁定"中点击"申请解锁"
2. 填写解锁原因
3. 提交申请

**API**: `POST /api/experiments/[id]/unlock-request`

**请求体**:
```json
{
  "reason": "需要补充实验数据"
}
```

### 3.2 解锁审批

**审批人**:
- 项目负责人（项目内实验）
- 管理员（所有实验）
- 超级管理员（所有实验）

**审批决定**:

| 决定 | 结果状态 | 后续操作 |
|------|----------|----------|
| 批准解锁 | NEEDS_REVISION | 记录解锁，作者可编辑 |
| 拒绝解锁 | LOCKED | 记录保持锁定 |

**API**: `PUT /api/experiments/[id]/unlock-request`

**请求体**:
```json
{
  "requestId": "unlock_request_id",
  "action": "APPROVE",
  "response": "批准解锁，请尽快完成修改"
}
```

### 3.3 解锁申请列表

**入口**: 我的任务 → 解锁申请 Tab

**显示条件**: 
- 管理员可见所有申请
- 项目负责人可见项目内实验的申请

**API**: `GET /api/unlock-requests`

---

## 四、审核历史

### 4.1 历史记录类型

| 类型 | 说明 | 显示内容 |
|------|------|----------|
| 提交审核 | 作者提交 | 提交时间、提交人、提交给谁、提交留言 |
| 审核通过 | 审核人通过 | 审核时间、审核人、审核意见 |
| 要求修改 | 审核人退回 | 审核时间、审核人、修改意见、批注附件 |
| 转交审核 | 审核人转交 | 转交时间、转交人、转交给谁、转交说明 |
| 批准解锁 | 处理人批准 | 处理时间、处理人、处理意见 |
| 拒绝解锁 | 处理人拒绝 | 处理时间、处理人、拒绝理由 |

### 4.2 界面设计

- 卡片化布局，每个操作独立卡片
- 向上箭头指示时间顺序（最新在下）
- 批注附件可点击下载
- 目标审核人高亮显示

### 4.3 组件位置

`src/components/experiments/ReviewHistory.tsx`

---

## 五、数据模型

### 5.1 ReviewRequest（审核请求）

```prisma
model ReviewRequest {
  id           String              @id @default(cuid())
  status       ReviewRequestStatus @default(PENDING)
  note         String?
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
  experimentId String
  reviewerId   String
  experiment   Experiment          @relation(...)
  reviewer     User                @relation(...)
}
```

### 5.2 ReviewFeedback（审核反馈）

```prisma
model ReviewFeedback {
  id           String       @id @default(cuid())
  action       ReviewAction
  feedback     String?
  createdAt    DateTime     @default(now())
  experimentId String
  reviewerId   String
  attachments  Attachment[]
  experiment   Experiment   @relation(...)
  reviewer     User         @relation(...)
}
```

### 5.3 UnlockRequest（解锁申请）

```prisma
model UnlockRequest {
  id           String              @id @default(cuid())
  reason       String
  status       UnlockRequestStatus @default(PENDING)
  response     String?
  createdAt    DateTime            @default(now())
  processedAt  DateTime?
  experimentId String
  requesterId  String
  processorId  String?
  experiment   Experiment          @relation(...)
  requester    User                @relation(...)
  processor    User?               @relation(...)
}
```

### 5.4 枚举类型

```prisma
enum ReviewStatus {
  DRAFT
  PENDING_REVIEW
  NEEDS_REVISION
  LOCKED
}

enum ReviewAction {
  SUBMIT
  APPROVE
  REQUEST_REVISION
  TRANSFER
  UNLOCK
}

enum ReviewRequestStatus {
  PENDING
  COMPLETED
  TRANSFERRED
  CANCELLED
}

enum UnlockRequestStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}
```

---

## 六、权限控制

### 6.1 审核权限

```typescript
// 检查用户是否可以审核实验
async function canReviewExperiment(userId: string, experimentId: string): boolean {
  // 1. 作者不能审核自己的实验
  // 2. 必须是管理员或项目负责人
  // 3. 被指定的审核人可以审核
}
```

### 6.2 解锁权限

```typescript
// 检查用户是否可以处理解锁申请
async function canProcessUnlock(userId: string, experimentId: string): boolean {
  // 1. 管理员可以处理所有申请
  // 2. 项目负责人可以处理项目内实验的申请
}
```

---

## 七、变更记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v3.3.7 | 2025-03-08 | 解锁功能完善：枚举值修复、审批流程优化 |
| v3.3.7 | 2025-03-07 | 审核历史重构：卡片化设计、简化展示、批注附件 |
| v3.4 | 2025-03-05 | 合并到我的任务模块 |
| v3.3 | 2025-03-01 | 审核请求管理、审核反馈记录、审计日志 |

---

## 八、相关文件

```
src/app/api/experiments/[id]/
├── submit/route.ts          # 提交审核
├── review/route.ts          # 审核操作
├── reviewers/route.ts       # 获取审核人列表
├── unlock-request/route.ts  # 解锁申请管理
└── feedbacks/route.ts       # 审核反馈历史

src/app/api/unlock-requests/
└── route.ts                 # 待处理解锁申请列表

src/components/experiments/
└── ReviewHistory.tsx        # 审核历史组件

src/components/tasks/
└── MyTasks.tsx              # 我的任务（含审核功能）

src/lib/
└── permissions.ts           # 权限检查函数
```

---

*本文档记录审核管理模块的所有功能和实现细节。*
