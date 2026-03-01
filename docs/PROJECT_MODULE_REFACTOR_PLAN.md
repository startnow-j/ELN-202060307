# 项目管理模块优化规划

> **文档版本**: v1.0
> **创建日期**: 2025-02-28
> **适用版本**: BioLab ELN v3.3+

---

## 开发状态

| 阶段 | 状态 | 完成日期 |
|------|------|----------|
| 阶段一：数据库改造 | ✅ 完成 | 2025-02-28 |
| 阶段二：后端API开发 | ✅ 完成 | 2025-02-28 |
| 阶段三：前端组件改造 | ✅ 完成 | 2025-02-28 |
| 阶段四：测试与文档 | ✅ 完成 | 2025-02-28 |

---

## 一、需求分析

### 1.1 核心需求

| 需求项 | 说明 |
|--------|------|
| 结束日期概念分离 | 新建项目的结束日期改为"预计结束日期"；项目状态变为"已结束"时产生真实结束时间 |
| 项目状态流转增强 | 进行中↔已结束↔已归档，不同角色有不同操作权限 |
| 项目结束自动锁定 | 项目结束时，所有关联实验记录自动锁定 |
| 项目详情页重构 | 三大功能区：人员管理、项目文档、实验记录文档 |
| 项目文档管理 | 支持立项报告、进展报告、结题报告、其他文件的上传下载 |

### 1.2 状态流转规则

```
┌─────────────┐
│   进行中    │ ◄──────────────────────┐
│  (ACTIVE)   │                        │
└─────────────┘                        │
      │ 项目负责人操作                   │
      │ （记录真实结束时间）              │
      ▼                                 │
┌─────────────┐  项目负责人解锁          │
│   已结束    │ ───────────────────────┘
│ (COMPLETED) │
└─────────────┘
      │ 项目负责人操作
      │
      ▼
┌─────────────┐  仅超级管理员解锁
│   已归档    │ ───────────────────────┐
│  (ARCHIVED) │                        │
└─────────────┘                        │
                                       │
              ┌────────────────────────┘
              ▼
        恢复到进行中/已结束
```

### 1.3 权限矩阵

| 操作 | 超级管理员 | 管理员 | 项目负责人 | 参与人 | 观察员 |
|------|:--------:|:-----:|:--------:|:-----:|:-----:|
| 结束项目 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 解锁已结束项目 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 归档项目 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 解锁已归档项目 | ✅ | ❌ | ❌ | ❌ | ❌ |
| 上传项目文档 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 下载项目文档 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 管理项目人员 | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 二、当前实现分析

### 2.1 数据库模型

**现有字段：**
```prisma
model Project {
  id          String
  name        String
  description String?
  status      ProjectStatus @default(ACTIVE)
  startDate   DateTime?       // 开始日期
  endDate     DateTime?       // 结束日期（需改造）
  createdAt   DateTime
  updatedAt   DateTime
  ...
}
```

**需要改造：**
- `endDate` → 重命名或新增 `expectedEndDate`（预计结束日期）
- 新增 `actualEndDate`（真实结束日期）
- 新增 `completedAt`（结束时间戳）
- 新增 `archivedAt`（归档时间戳）

### 2.2 前端组件

| 组件 | 当前状态 | 需要改造 |
|------|----------|----------|
| `CreateProjectDialog.tsx` | 结束日期字段 | 改为预计结束日期 |
| `ProjectList.tsx` | 状态编辑下拉框 | 增加状态流转逻辑和权限控制 |
| `ProjectDetail.tsx` | 简单信息展示 | 重构为三Tab布局 |

### 2.3 后端API

| API | 当前状态 | 需要改造 |
|-----|----------|----------|
| `PUT /api/projects/[id]` | 直接更新状态 | 增加状态流转逻辑、权限检查、自动锁定实验 |
| `POST /api/projects/[id]/status` | 不存在 | 新增：专门处理状态变更 |
| `GET /api/projects/[id]/documents` | 不存在 | 新增：获取项目文档列表 |
| `POST /api/projects/[id]/documents` | 不存在 | 新增：上传项目文档 |

---

## 三、改造方案

### 3.1 数据库模型改造

```prisma
model Project {
  id              String        @id @default(cuid())
  name            String
  description     String?
  status          ProjectStatus @default(ACTIVE)
  
  // 日期相关
  startDate       DateTime?       // 开始日期
  expectedEndDate DateTime?       // 预计结束日期（原endDate改名）
  actualEndDate   DateTime?       // 真实结束日期（新增）
  
  // 状态时间戳
  completedAt     DateTime?       // 结束时间（新增）
  archivedAt      DateTime?       // 归档时间（新增）
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  // ... 其他字段保持不变
}

// ProjectDocument 模型已存在，类型包括：
// PROPOSAL（立项报告）、PROGRESS_REPORT（进展报告）、
// FINAL_REPORT（结题报告）、OTHER（其他文档）
```

### 3.2 前端组件改造

#### 3.2.1 CreateProjectDialog 改造

**改动点：**
- `endDate` 标签改为"预计结束日期"
- 新增提示："此日期为计划结束时间，实际结束时间将在项目状态变更为已结束时自动记录"

#### 3.2.2 ProjectList 改造

**改动点：**
- 状态编辑下拉框改为"状态变更"对话框
- 根据当前状态和用户权限显示可选操作
- 项目结束/归档前显示确认对话框和影响说明

**状态变更对话框：**
```
┌─────────────────────────────────────┐
│  变更项目状态                         │
│                                     │
│  当前状态：进行中                     │
│  可选操作：                          │
│  ○ 结束项目                          │
│    项目结束后的影响：                 │
│    · 所有实验记录将被锁定             │
│    · 记录真实结束时间                 │
│    · 后续可解锁或归档                 │
│                                     │
│  [取消] [确认结束项目]                │
└─────────────────────────────────────┘
```

#### 3.2.3 ProjectDetail 重构（重点）

**新布局结构：**
```
┌─────────────────────────────────────────────────────┐
│  ← 项目名称                          [状态] [操作▼]  │
├─────────────────────────────────────────────────────┤
│  [项目信息] [人员管理] [项目文档] [实验记录]          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  根据选中的Tab显示不同内容                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Tab 1: 项目信息（默认）**
```
┌─────────────────────────────────────┐
│  项目基本信息                        │
│  ─────────────────────────────────  │
│  项目名称: XXX                       │
│  项目状态: 进行中                     │
│  开始日期: 2025-01-01                │
│  预计结束: 2025-06-30                │
│  真实结束: -                         │
│  项目负责人: 张三                     │
│  成员数量: 5人                        │
│  实验记录: 12个                       │
│                                     │
│  项目描述                            │
│  ─────────────────────────────────  │
│  项目描述内容...                      │
└─────────────────────────────────────┘
```

**Tab 2: 人员管理**
```
┌─────────────────────────────────────┐
│  项目成员管理                    [添加成员] │
│  ─────────────────────────────────  │
│  成员列表:                           │
│  ┌─────────────────────────────────┐│
│  │ 张三  项目负责人  [编辑] [移除]  ││
│  │ 李四  参与人     [编辑] [移除]  ││
│  │ 王五  观察员     [编辑] [移除]  ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

**Tab 3: 项目文档**
```
┌─────────────────────────────────────┐
│  项目文档                       [上传文档] │
│  ─────────────────────────────────  │
│  类型筛选: [全部▼]                   │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 📄 立项报告.pdf                  ││
│  │    类型: 立项报告  大小: 2.3MB   ││
│  │    上传于: 2025-01-15  [下载]   ││
│  ├─────────────────────────────────┤│
│  │ 📄 阶段性总结.docx               ││
│  │    类型: 阶段报告  大小: 1.1MB   ││
│  │    上传于: 2025-02-20  [下载]   ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

**Tab 4: 实验记录**
```
┌─────────────────────────────────────┐
│  实验记录                            │
│  ─────────────────────────────────  │
│  🔍 搜索...              状态: [全部▼]│
│                                     │
│  共 12 条实验记录                    │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 🧪 PCR实验数据分析               ││
│  │    作者: 李四  状态: 已锁定       ││
│  │    更新于: 2025-02-25   [查看]  ││
│  ├─────────────────────────────────┤│
│  │ 🧪 蛋白质提取实验                 ││
│  │    作者: 王五  状态: 草稿         ││
│  │    更新于: 2025-02-28   [查看]  ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### 3.3 后端API改造

#### 3.3.1 新增API

| API | 方法 | 功能 |
|-----|------|------|
| `/api/projects/[id]/status` | PUT | 状态变更（含权限检查、自动锁定） |
| `/api/projects/[id]/documents` | GET | 获取项目文档列表 |
| `/api/projects/[id]/documents` | POST | 上传项目文档 |
| `/api/projects/[id]/documents/[docId]` | DELETE | 删除项目文档 |
| `/api/projects/[id]/documents/[docId]/download` | GET | 下载项目文档 |
| `/api/projects/[id]/members` | GET/POST | 成员管理（已有，需增强） |

#### 3.3.2 状态变更API逻辑

```typescript
// PUT /api/projects/[id]/status
// 请求体: { status: 'COMPLETED' | 'ACTIVE' | 'ARCHIVED' }

async function handleStatusChange(projectId, newStatus, userId) {
  // 1. 权限检查
  const canChange = await checkProjectStatusPermission(projectId, userId, newStatus)
  if (!canChange) throw new Error('权限不足')

  // 2. 状态流转检查
  const validTransition = await validateStatusTransition(project.status, newStatus)
  if (!validTransition) throw new Error('无效的状态变更')

  // 3. 执行变更（事务）
  return await db.$transaction(async (tx) => {
    // 3.1 更新项目状态
    const updateData = { status: newStatus }
    
    if (newStatus === 'COMPLETED') {
      updateData.completedAt = new Date()
      updateData.actualEndDate = new Date()
      
      // 3.2 锁定所有关联实验
      const experiments = await tx.experimentProject.findMany({
        where: { projectId }
      })
      for (const ep of experiments) {
        await tx.experiment.update({
          where: { id: ep.experimentId },
          data: { reviewStatus: 'LOCKED', reviewedAt: new Date() }
        })
      }
    }
    
    if (newStatus === 'ARCHIVED') {
      updateData.archivedAt = new Date()
    }
    
    if (newStatus === 'ACTIVE') {
      // 解锁：清除结束时间
      updateData.completedAt = null
      updateData.actualEndDate = null
      updateData.archivedAt = null
    }
    
    return await tx.project.update({
      where: { id: projectId },
      data: updateData
    })
  })
}
```

---

## 四、开发任务清单

### 阶段一：数据库改造（P0）

| ID | 任务 | 文件 | 预估工时 |
|----|------|------|---------|
| D1 | 新增expectedEndDate字段 | prisma/schema.prisma | 0.5h |
| D2 | 新增actualEndDate字段 | prisma/schema.prisma | 0.5h |
| D3 | 新增completedAt、archivedAt字段 | prisma/schema.prisma | 0.5h |
| D4 | 数据迁移脚本 | prisma/migrations | 1h |

### 阶段二：后端API开发（P0）

| ID | 任务 | 文件 | 预估工时 |
|----|------|------|---------|
| A1 | 状态变更API | api/projects/[id]/status/route.ts | 2h |
| A2 | 项目文档列表API | api/projects/[id]/documents/route.ts | 1h |
| A3 | 项目文档上传API | api/projects/[id]/documents/route.ts | 2h |
| A4 | 项目文档下载API | api/projects/[id]/documents/[docId]/download/route.ts | 1h |
| A5 | 项目文档删除API | api/projects/[id]/documents/[docId]/route.ts | 1h |
| A6 | 权限检查函数 | lib/permissions.ts | 1h |

### 阶段三：前端组件改造（P0）

| ID | 任务 | 文件 | 预估工时 |
|----|------|------|---------|
| F1 | CreateProjectDialog改造 | components/projects/CreateProjectDialog.tsx | 1h |
| F2 | ProjectList状态变更对话框 | components/projects/ProjectList.tsx | 2h |
| F3 | ProjectDetail重构-Tab布局 | components/projects/ProjectDetail.tsx | 2h |
| F4 | ProjectInfoTab组件 | components/projects/ProjectInfoTab.tsx | 1.5h |
| F5 | ProjectMembersTab组件 | components/projects/ProjectMembersTab.tsx | 2h |
| F6 | ProjectDocumentsTab组件 | components/projects/ProjectDocumentsTab.tsx | 3h |
| F7 | ProjectExperimentsTab组件 | components/projects/ProjectExperimentsTab.tsx | 2h |

### 阶段四：测试与文档（P1）

| ID | 任务 | 预估工时 |
|----|------|---------|
| T1 | 状态流转测试 | 1h |
| T2 | 权限控制测试 | 1h |
| T3 | 项目文档上传下载测试 | 1h |
| T4 | 模块文档编写 | 1h |

---

## 五、风险评估

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 数据迁移失败 | 高 | 先备份数据库，提供回滚脚本 |
| 状态流转逻辑复杂 | 中 | 详细设计后评审，单元测试覆盖 |
| 前端重构工作量大 | 中 | 分阶段实现，先核心功能后优化 |

---

## 六、依赖关系

```
数据库改造(D1-D4)
      ↓
后端API开发(A1-A6)
      ↓
前端组件改造(F1-F7)
      ↓
测试与文档(T1-T4)
```

---

## 七、验收标准

### 功能验收

- [ ] 新建项目时可填写预计结束日期
- [ ] 项目负责人可将进行中项目结束（记录真实结束时间）
- [ ] 项目结束时所有实验记录自动锁定
- [ ] 项目负责人可解锁已结束项目
- [ ] 项目负责人可将已结束项目归档
- [ ] 仅超级管理员可解锁已归档项目
- [ ] 项目详情页显示四大功能区
- [ ] 项目文档支持上传/下载
- [ ] 实验记录Tab支持搜索和状态筛选

### 权限验收

- [ ] 参与人/观察员无法变更项目状态
- [ ] 项目负责人无法解锁已归档项目
- [ ] 非项目成员无法访问项目详情

---

**文档版本：** v1.0
**创建日期：** 2025-02-28
**预计总工时：** 约22小时
