# 我的任务模块文档

## 概述

"我的任务"模块是 BioLab ELN v3.3 版本新增的功能模块，旨在为用户提供一个统一的任务管理中心，方便用户快速处理与自己相关的实验记录任务。

## 模块入口

- **导航位置**：侧边栏（Sidebar）
- **菜单名称**：我的任务
- **图标**：ListTodo
- **徽章显示**：显示待处理任务总数（草稿数 + 待审核数 + 待修改数）

## 功能分类

### 1. 我的草稿

#### 功能描述
显示当前用户创建的所有草稿状态（DRAFT）的实验记录。

#### 筛选条件
- `reviewStatus === 'DRAFT'`
- `authorId === currentUser.id`

#### 操作功能
| 操作 | 说明 |
|------|------|
| 继续编辑 | 点击后进入实验记录编辑器，可继续编辑草稿 |

#### 界面元素
- 实验标题
- 审核状态标签（草稿）
- 摘要预览
- 更新时间
- 关联项目
- 完整度评分
- 标签列表

---

### 2. 待我审核

#### 功能描述
显示当前用户作为项目负责人需要审核的实验记录。当用户是某个项目的负责人（owner）时，该项目下提交审核的实验记录将显示在此。

#### 筛选条件
- `reviewStatus === 'PENDING_REVIEW'`
- 实验关联的项目中，至少有一个项目的 `ownerId === currentUser.id`

#### 操作功能
| 操作 | 说明 |
|------|------|
| 查看 | 查看实验记录详情 |
| 审核 | 打开审核对话框，进行审核操作 |

#### 审核对话框
**审核选项：**
- **审核通过**：实验记录状态变更为 `LOCKED`（已锁定）
- **要求修改**：实验记录状态变更为 `NEEDS_REVISION`（需要修改）

**反馈意见：**
- 审核通过：可选填写
- 要求修改：必填，需说明需要修改的内容

#### 界面元素
- 实验标题
- 审核状态标签（待审核）
- 摘要预览
- 作者信息
- 提交时间
- 关联项目
- 完整度评分

---

### 3. 待我修改

#### 功能描述
显示当前用户创建的、被审核人要求修改的实验记录。

#### 筛选条件
- `reviewStatus === 'NEEDS_REVISION'`
- `authorId === currentUser.id`

#### 操作功能
| 操作 | 说明 |
|------|------|
| 查看反馈 | 打开反馈历史对话框，查看审核人的反馈意见 |
| 去修改 | 进入实验记录编辑器，修改后可重新提交审核 |

#### 反馈历史对话框
- 显示所有审核反馈记录
- 包含：审核动作、审核人、反馈意见、时间

#### 界面元素
- 实验标题
- 审核状态标签（需要修改）- 橙色边框高亮
- 摘要预览
- 审核人信息
- 要求修改时间
- 完整度评分

---

### 4. 我的已锁定记录

#### 功能描述
显示当前用户创建的已审核通过并锁定的实验记录。

#### 筛选条件
- `reviewStatus === 'LOCKED'`
- `authorId === currentUser.id`

#### 操作功能
| 操作 | 说明 |
|------|------|
| 查看 | 查看实验记录详情（只读） |
| 申请解锁 | 打开解锁申请对话框，提交解锁申请 |

#### 解锁申请对话框
**必填字段：**
- 解锁原因：说明需要解锁此记录的原因

**申请流程：**
1. 用户提交解锁申请
2. 申请进入待处理状态
3. 审核人（项目负责人/管理员）审批
4. 审批通过后记录解锁，可重新编辑

#### 界面元素
- 实验标题
- 审核状态标签（已锁定）
- 摘要预览
- 锁定时间
- 关联项目
- 完整度评分

---

## 数据模型

### UnlockRequest（解锁申请）

```prisma
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
}
```

### UnlockRequestStatus（解锁申请状态）

| 状态 | 说明 |
|------|------|
| PENDING | 待处理 |
| APPROVED | 已批准 |
| REJECTED | 已拒绝 |
| CANCELLED | 已取消 |

---

## API 接口

### 1. 提交解锁申请

**端点：** `POST /api/experiments/[id]/unlock-request`

**请求体：**
```json
{
  "reason": "需要补充实验数据"
}
```

**成功响应：**
```json
{
  "success": true,
  "message": "解锁申请已提交",
  "data": {
    "id": "unlock_request_id",
    "reason": "需要补充实验数据",
    "status": "PENDING",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**错误响应：**
| 状态码 | 说明 |
|--------|------|
| 400 | 未填写解锁原因 / 记录未锁定 / 已有待处理申请 |
| 401 | 未登录 |
| 403 | 非作者无权申请 |
| 404 | 实验记录不存在 |

---

### 2. 获取审核反馈历史

**端点：** `GET /api/experiments/[id]/feedbacks`

**成功响应：**
```json
[
  {
    "id": "feedback_id",
    "action": "REQUEST_REVISION",
    "feedback": "请补充实验方法描述",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "reviewer": {
      "id": "reviewer_id",
      "name": "审核人姓名",
      "email": "reviewer@example.com"
    }
  }
]
```

---

## 组件结构

```
src/components/tasks/
├── MyTasks.tsx          # 主组件，包含Tab布局和所有功能
└── TaskListBase.tsx     # 基础列表组件（预留，可复用）

src/components/layout/
└── Sidebar.tsx          # 包含"我的任务"入口

src/app/api/experiments/[id]/
├── unlock-request/
│   └── route.ts         # 解锁申请API
└── feedbacks/
    └── route.ts         # 反馈历史API
```

---

## 权限控制

| 功能 | 角色 | 说明 |
|------|------|------|
| 查看我的草稿 | 作者本人 | 只能查看自己创建的草稿 |
| 审核实验记录 | 项目负责人 | 只能审核自己负责的项目下的记录 |
| 查看待修改记录 | 作者本人 | 只能查看自己需要修改的记录 |
| 查看已锁定记录 | 作者本人 | 只能查看自己的已锁定记录 |
| 申请解锁 | 作者本人 | 只能申请解锁自己的记录 |

---

## 用户交互流程

### 审核流程
```
作者创建草稿 → 提交审核 → 项目负责人审核
                                    ↓
                        ┌───────────┴───────────┐
                        ↓                       ↓
                   审核通过                   要求修改
                        ↓                       ↓
                   记录锁定                  作者修改
                                                ↓
                                          重新提交审核
```

### 解锁流程
```
作者申请解锁 → 项目负责人/管理员审批
                          ↓
              ┌───────────┴───────────┐
              ↓                       ↓
           批准解锁                 拒绝申请
              ↓                       ↓
          记录解锁                记录保持锁定
              ↓
         作者编辑修改
              ↓
         重新提交审核
```

---

## 版本历史

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v3.3 | 2024-xx-xx | 初始版本，实现我的任务模块 |

---

## 待优化项

1. **解锁审批功能**：需要在审核管理模块中添加解锁申请审批功能
2. **通知提醒**：当有待审核/待修改任务时，增加系统通知
3. **批量操作**：支持批量审核/批量修改等操作
4. **筛选增强**：添加更多筛选条件（时间范围、项目等）
