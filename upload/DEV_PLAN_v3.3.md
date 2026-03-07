# BioLab ELN 开发计划 v3.3

> **文档版本**: v3.3
> **创建日期**: 2025-03-28
> **状态**: 待确认

---

## 一、开发背景

### 1.1 当前版本状态

| 版本 | 状态 | 说明 |
|------|------|------|
| v3.0 | ✅ 完成 | AI提取、审核流程、完整度评分 |
| v3.1 | ✅ 完成 | 项目角色管理、用户管理、指定审核人、转交审核 |
| v3.2 | 🔄 部分完成 | 文件存储已重构，测试中发现权限漏洞已修复 |
| v3.3 | 📋 规划中 | 本版本开发内容 |

### 1.2 v3.2 测试发现的问题

| 问题 | 状态 | 解决方案 |
|------|------|----------|
| VIEWER可以创建实验并关联项目 | ✅ 已修复 | 前端隐藏按钮 + 后端权限检查 |
| 详情页附件上传后不显示 | 📋 待实施 | 详情页附件改为只读 |
| 项目列表搜索功能待完善 | 📋 待实施 | 增强搜索功能 |

### 1.3 确认的设计决策

| 决策项 | 确认方案 |
|--------|----------|
| 现有ADMIN用户迁移 | 保持ADMIN角色 |
| 超级管理员账户 | 创建默认账户 superadmin@example.com |
| 暂存实验清理 | 超过10天提醒，不自动删除 |
| 多项目关联 | 单项目存储 + .link引用文件 |
| .link文件命名 | 使用实验ID确保唯一性 |

---

## 二、功能模块规划

### 2.1 功能总览

```
v3.3 开发内容
├── 模块A：权限体系重构（P0）
│   ├── A1: 超级管理员角色
│   ├── A2: 权限矩阵调整
│   └── A3: 用户管理增强
│
├── 模块B：暂存实验功能（P0）
│   ├── B1: 用户暂存区
│   ├── B2: 文件迁移服务
│   ├── B3: 审计日志增强
│   └── B4: 暂存实验提醒
│
├── 模块C：多项目关联（P1）
│   ├── C1: .link引用文件
│   └── C2: 关联项目时迁移
│
├── 模块D：界面优化（P1）
│   ├── D1: 实验列表Tab分类
│   ├── D2: 详情页附件只读
│   └── D3: 搜索功能增强
│
└── 模块E：v3.2遗留功能（P1）
    ├── E1: 项目状态管理
    ├── E2: 项目文档管理
    └── E3: 解锁功能完善
```

### 2.2 开发优先级

| 优先级 | 模块 | 说明 |
|--------|------|------|
| P0 | 权限体系重构 | 基础设施，其他功能依赖 |
| P0 | 暂存实验功能 | 核心新功能 |
| P1 | 多项目关联 | 完善功能 |
| P1 | 界面优化 | 用户体验 |
| P1 | v3.2遗留 | 功能完善 |

---

## 三、模块详细设计

### 模块A：权限体系重构

#### A1: 超级管理员角色

**数据库改动：**
```prisma
enum UserRole {
  SUPER_ADMIN  // 新增
  ADMIN
  RESEARCHER
}
```

**默认账户：**
- 邮箱: superadmin@example.com
- 密码: super123
- 角色: SUPER_ADMIN

**权限定义：**
| 操作 | SUPER_ADMIN | ADMIN |
|------|:-----------:|:-----:|
| 用户管理 | ✅ | ❌ |
| 系统配置 | ✅ | ❌ |
| 删除项目 | ✅ | ❌ |
| 恢复归档项目 | ✅ | ❌ |
| 清理暂存实验 | ✅ | ❌ |
| 全局视角 | ✅ | ✅ |
| 归档项目 | ✅ | ✅ |

#### A2: 权限矩阵调整

**文件改动：**
- `src/lib/permissions.ts` - 新增超级管理员权限检查
- `src/app/api/users/manage/route.ts` - 仅超级管理员可访问
- `src/app/api/projects/[id]/route.ts` - 删除权限检查

#### A3: 用户管理增强

**超级管理员保护机制：**
- 不能修改自己的角色
- 系统至少保留一个超级管理员
- 其他角色不能提升为超级管理员

---

### 模块B：暂存实验功能

#### B1: 用户暂存区

**数据库改动：**
```prisma
model Experiment {
  // ... 现有字段
  storageLocation  String?   // "draft" | 项目ID
  primaryProjectId String?   // 主存储项目ID
}
```

**存储结构：**
```
upload/users/{用户ID}/drafts/{日期}_{实验标题}/
```

**创建逻辑：**
```
创建实验
├── 有关联项目 → 存储到第一个项目文件夹
└── 无关联项目 → 存储到用户暂存区
```

#### B2: 文件迁移服务

**新增文件：** `src/lib/experiment-migration.ts`

**迁移流程：**
```
1. 计算所有附件哈希值（SHA-256）
2. 在事务中执行：
   a. 复制文件到目标位置
   b. 验证哈希值一致
   c. 更新数据库路径
   d. 删除原文件
   e. 记录审计日志
3. 失败则回滚
```

#### B3: 审计日志增强

**审计日志格式：**
```json
{
  "action": "MIGRATE_EXPERIMENT",
  "entityType": "Experiment",
  "entityId": "exp_xxx",
  "userId": "user_xxx",
  "details": {
    "fromLocation": {
      "type": "USER_DRAFT",
      "path": "users/123/drafts/20250328_实验/"
    },
    "toLocation": {
      "type": "PROJECT",
      "projectId": "proj_xxx",
      "path": "projects/项目A/experiments/20250328_实验/"
    },
    "fileHashes": {
      "原始数据.xlsx": "sha256:abc123..."
    }
  }
}
```

#### B4: 暂存实验提醒

**提醒规则：**
- 实验创建后超过10天未关联项目
- Dashboard显示提醒卡片
- 实验列表中高亮显示

---

### 模块C：多项目关联

#### C1: .link引用文件

**文件位置：**
```
upload/projects/{项目名}/experiments/{实验ID}.link
```

**文件内容：**
```json
{
  "type": "cross_project_reference",
  "experimentId": "exp_xxx",
  "title": "PCR实验",
  "primaryStorage": {
    "projectId": "proj_A",
    "projectName": "项目A",
    "path": "projects/项目A/experiments/20250328_PCR实验"
  },
  "linkedAt": "2025-03-28T10:00:00Z",
  "linkedBy": "user_xxx"
}
```

#### C2: 关联项目时迁移

**逻辑：**
```
编辑实验，添加项目关联
├── 当前在暂存区 → 迁移到第一个项目
├── 当前在项目中 → 保持位置
│   └── 新关联项目 → 生成.link文件
└── 移除关联 → 删除对应.link文件
```

---

### 模块D：界面优化

#### D1: 实验列表Tab分类

**界面结构：**
```
┌─────────────────────────────────────────┐
│ 实验记录                                 │
│ [项目相关] [我的暂存]                     │
│                                         │
│ 🔍 搜索...                               │
│                                         │
│ 实验列表...                              │
└─────────────────────────────────────────┘
```

**搜索范围：**
- 项目相关：项目内实验
- 我的暂存：暂存实验
- 全局搜索：包含两者

#### D2: 详情页附件只读

**改动：**
- `ExperimentDetail.tsx` 中 `canEdit={false}`
- 添加提示："附件为只读，请进入编辑模式操作"

#### D3: 搜索功能增强

**改动：**
- 支持按标题、摘要、标签搜索
- 支持按状态筛选
- 支持按日期范围筛选

---

### 模块E：v3.2遗留功能

#### E1: 项目状态管理

**功能：**
- ACTIVE → COMPLETED（项目负责人/管理员）
- COMPLETED → ACTIVE（项目负责人/管理员）
- COMPLETED → ARCHIVED（仅管理员）
- ARCHIVED → ACTIVE（仅超级管理员）

#### E2: 项目文档管理

**文档类型：**
- 立项报告（PROPOSAL）
- 阶段性总结（PROGRESS_REPORT）
- 结题报告（FINAL_REPORT）
- 其他文档（OTHER）

#### E3: 解锁功能完善

**前端完善：**
- ExperimentDetail 添加解锁按钮
- 解锁确认对话框
- 解锁原因必填

---

## 四、开发任务清单

### 阶段一：权限体系重构（P0）

| ID | 任务 | 文件 | 状态 |
|----|------|------|------|
| A1.1 | 数据库添加SUPER_ADMIN角色 | prisma/schema.prisma | 📋 |
| A1.2 | 创建超级管理员权限检查函数 | src/lib/permissions.ts | 📋 |
| A1.3 | 创建默认超级管理员账户 | 脚本或种子数据 | 📋 |
| A1.4 | 用户管理API权限调整 | src/app/api/users/manage/*.ts | 📋 |
| A1.5 | 项目删除权限调整 | src/app/api/projects/[id]/route.ts | 📋 |
| A1.6 | 超级管理员保护机制 | 相关API | 📋 |

### 阶段二：暂存实验功能（P0）

| ID | 任务 | 文件 | 状态 |
|----|------|------|------|
| B1.1 | Experiment添加storageLocation字段 | prisma/schema.prisma | 📋 |
| B1.2 | 用户暂存区路径生成函数 | src/lib/file-path.ts | 📋 |
| B1.3 | 文件迁移服务 | src/lib/experiment-migration.ts | 📋 |
| B1.4 | 创建实验支持暂存 | src/app/api/experiments/route.ts | 📋 |
| B1.5 | 更新实验支持迁移 | src/app/api/experiments/[id]/route.ts | 📋 |
| B1.6 | 附件上传支持暂存区 | src/app/api/attachments/route.ts | 📋 |
| B1.7 | 暂存实验不能提交审核 | 提交审核逻辑 | 📋 |

### 阶段三：界面优化（P1）

| ID | 任务 | 文件 | 状态 |
|----|------|------|------|
| D1.1 | 实验列表Tab切换 | src/components/experiments/ExperimentList.tsx | 📋 |
| D1.2 | 暂存实验标识和警告 | ExperimentList.tsx | 📋 |
| D1.3 | Dashboard暂存提醒 | src/components/dashboard/Dashboard.tsx | 📋 |
| D2.1 | 详情页附件只读 | src/components/experiments/ExperimentDetail.tsx | 📋 |
| D3.1 | 搜索功能增强 | ExperimentList.tsx | 📋 |

### 阶段四：多项目关联（P1）

| ID | 任务 | 文件 | 状态 |
|----|------|------|------|
| C1.1 | .link文件生成函数 | src/lib/file-path.ts | 📋 |
| C1.2 | 关联项目时生成引用 | src/lib/experiment-migration.ts | 📋 |
| C1.3 | 移除关联时删除引用 | 实验更新API | 📋 |

### 阶段五：v3.2遗留功能（P1）

| ID | 任务 | 文件 | 状态 |
|----|------|------|------|
| E1.1 | 项目状态管理API完善 | src/app/api/projects/[id]/status/route.ts | 📋 |
| E1.2 | 项目状态前端完善 | src/components/projects/ProjectDetail.tsx | 📋 |
| E2.1 | 项目文档管理前端 | src/components/projects/ProjectDocuments.tsx | 📋 |
| E3.1 | 解锁功能前端完善 | src/components/experiments/ExperimentDetail.tsx | 📋 |

### 阶段六：审计增强（P2）

| ID | 任务 | 文件 | 状态 |
|----|------|------|------|
| F1.1 | 审计日志添加details字段 | prisma/schema.prisma | 📋 |
| F1.2 | 迁移操作审计日志 | src/lib/experiment-migration.ts | 📋 |
| F1.3 | 文件哈希验证 | src/lib/file-hash.ts | 📋 |

---

## 五、数据库变更汇总

```prisma
// ==================== v3.3 数据库变更 ====================

// 用户角色枚举修改
enum UserRole {
  SUPER_ADMIN   // 新增
  ADMIN
  RESEARCHER
}

// Experiment 模型新增字段
model Experiment {
  // ... 现有字段
  storageLocation  String?   // "draft" | 项目ID
  primaryProjectId String?   // 主存储项目ID
}

// AuditLog 模型增强
model AuditLog {
  // ... 现有字段
  details String?   // JSON 格式的详细信息
}
```

---

## 六、测试计划

### 6.1 权限测试

| 测试项 | 预期结果 |
|-------|---------|
| 超级管理员创建用户 | 成功 |
| 管理员创建用户 | 失败，权限不足 |
| 管理员删除项目 | 失败，权限不足 |
| 超级管理员删除项目 | 成功 |
| 超级管理员修改自己角色 | 失败，保护机制 |

### 6.2 暂存实验测试

| 测试项 | 预期结果 |
|-------|---------|
| 创建无项目关联的实验 | 存储到用户暂存区 |
| 暂存实验关联项目 | 文件迁移到项目文件夹 |
| 暂存实验提交审核 | 失败，提示先关联项目 |
| 暂存实验超过10天 | 显示提醒 |
| 删除暂存实验 | 成功，文件一并删除 |

### 6.3 多项目关联测试

| 测试项 | 预期结果 |
|-------|---------|
| 实验关联第二个项目 | 第一个项目存储文件，第二个生成.link |
| 查看.link实验 | 正确显示内容 |
| 移除关联 | 删除对应.link文件 |

---

## 七、发布计划

### 7.1 阶段发布

| 阶段 | 内容 | 预计时间 |
|------|------|---------|
| Alpha | 权限体系重构 | 阶段一完成 |
| Beta | 暂存实验功能 | 阶段二、三完成 |
| RC | 多项目关联 + 遗留功能 | 阶段四、五完成 |
| v3.3 | 审计增强 + 正式发布 | 全部完成 |

### 7.2 兼容性保证

- 现有ADMIN用户保持ADMIN角色
- 现有实验记录默认storageLocation为第一个关联项目
- 现有附件无需迁移

---

## 八、文档索引

| 文档 | 路径 | 说明 |
|------|------|------|
| 系统功能 | `upload/SYSTEM_FEATURES_v3.3.md` | 系统功能规划 |
| 开发计划 | `upload/DEV_PLAN_v3.3.md` | 本文档 |
| 测试方案 | `upload/TEST_PLAN_v3.2.md` | v3.2测试方案 |
| 工作日志 | `upload/worklog.md` | 历史开发记录 |

---

**文档版本：** v3.3
**创建日期：** 2025-03-28
**状态：** 待确认
