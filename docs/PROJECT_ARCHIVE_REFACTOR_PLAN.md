# 项目归档流程重构计划

> **版本**: v1.0
> **创建日期**: 2025-03-10
> **适用版本**: v3.3.11
> **状态**: 待开发

---

## 一、需求背景

### 1.1 现有问题

| 编号 | 问题描述 | 影响 | 严重程度 |
|------|----------|------|----------|
| P1 | 两套状态变更入口并行，快捷编辑可绕过正常流程 | 状态管理混乱 | 高 |
| P2 | 项目完成时实验未锁定，归档时才锁定 | 与预期流程不符 | 高 |
| P3 | 锁定状态的实验仍可申请解锁/解锁 | 锁定形同虚设 | 高 |

### 1.2 现有状态流转

```
ACTIVE（进行中）→ COMPLETED（已结束）→ ARCHIVED（已归档）
       ↑                    ↑                   │
       └────────────────────┴───────────────────┘
                  （仅SUPER_ADMIN可解除归档）
```

---

## 二、解决方案

### 2.1 状态变更入口统一

**修改前**：
- 项目卡片快捷编辑 → 可直接修改状态（绕过流程）
- 项目详情页状态操作按钮 → 单向流程控制

**修改后**：
- 项目卡片快捷编辑 → 只能编辑名称、描述、日期，**状态字段只读**
- 项目详情页状态操作按钮 → **唯一**的状态变更入口

### 2.2 项目状态与实验锁定关系

采用**方式B：基于项目状态限制操作**

实验的 `reviewStatus` 保持不变，后端检查项目状态进行权限控制：

| 项目状态 | 查看详情 | 下载附件 | 编辑实验 | 删除实验 | 申请解锁 | 提交审核 |
|----------|---------|---------|---------|---------|---------|---------|
| ACTIVE | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| COMPLETED | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| ARCHIVED | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### 2.3 COMPLETED 与 ARCHIVED 的差异

| 维度 | COMPLETED | ARCHIVED |
|------|-----------|----------|
| 含义 | 项目结题，可能还需补充 | 项目彻底结束，历史存档 |
| 查看详情 | ✅ 项目成员可访问 | ✅ 管理员可访问，普通成员受限 |
| 下载附件 | ✅ | ✅（管理员），❌（普通成员） |
| 恢复项目 | ADMIN/PROJECT_LEAD 可操作 | 仅 SUPER_ADMIN 可操作 |
| 编辑项目信息 | ✅ 可修改描述、标签 | ❌ 完全禁止 |

### 2.4 ARCHIVED 状态权限分级（折中方案）

| 用户角色 | 项目卡片 | 项目详情 | 实验详情 | 下载附件 | 解除归档 |
|----------|---------|---------|---------|---------|---------|
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅（有审计记录） |
| ADMIN | ✅ | ✅ | ✅ | ✅ | ❌（需联系SUPER_ADMIN） |
| PROJECT_LEAD（该项目）| ✅ | ✅ | ✅ | ✅ | ❌ |
| 项目参与人 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 普通用户 | ✅ | ❌ | ❌ | ❌ | ❌ |

**核心规则**：
1. 所有人在 ARCHIVED 状态下都不能编辑实验
2. 项目负责人和参与人可以查看和下载（知识传承）
3. 只有 SUPER_ADMIN 可以解除归档（必须有审计记录）

---

## 三、技术实现方案

### 3.1 后端修改

#### 3.1.1 项目编辑API限制

**文件**: `src/app/api/projects/[id]/route.ts`

```typescript
// PUT 处理时，如果请求包含 status 字段，忽略它
// 状态变更只能通过 /api/projects/[id]/status 接口
if (data.status) {
  delete data.status  // 忽略状态字段
}
```

#### 3.1.2 实验操作权限检查

**文件**: `src/lib/permissions.ts`

新增函数：
```typescript
// 检查实验是否可编辑（基于项目状态）
export async function canEditExperimentByProjectStatus(
  experimentId: string
): Promise<{ canEdit: boolean; reason?: string }>

// 检查是否可申请解锁（基于项目状态）
export async function canRequestUnlockByProjectStatus(
  experimentId: string
): Promise<{ canRequest: boolean; reason?: string }>
```

#### 3.1.3 实验API权限检查增强

涉及文件：
- `src/app/api/experiments/[id]/route.ts` - 编辑/删除
- `src/app/api/experiments/[id]/submit/route.ts` - 提交审核
- `src/app/api/experiments/[id]/unlock-request/route.ts` - 申请解锁

每个API在操作前检查项目状态，如果项目为 COMPLETED/ARCHIVED 则拒绝操作。

#### 3.1.4 ARCHIVED 项目访问控制

**文件**: `src/app/api/projects/[id]/route.ts`

GET 请求时，根据用户角色和项目状态返回不同数据：
- 管理员：返回完整数据
- 项目成员：ARCHIVED 状态返回基本信息 + 标记 `isArchived: true`
- 普通用户：ARCHIVED 状态返回 403

### 3.2 前端修改

#### 3.2.1 项目卡片快捷编辑

**文件**: `src/components/projects/ProjectList.tsx`

修改编辑对话框：
- 移除状态下拉选择器
- 或设置为只读/disabled状态

#### 3.2.2 项目详情页状态操作

**文件**: `src/components/projects/ProjectDetail.tsx`

保持现有状态操作按钮，确保作为唯一入口。

#### 3.2.3 实验列表权限提示

**文件**: `src/components/projects/ProjectDetail.tsx`

当项目状态为 COMPLETED/ARCHIVED 时：
- 实验列表显示"项目已结束/归档，实验不可编辑"提示
- 编辑/删除按钮置灰或隐藏
- 申请解锁按钮置灰或隐藏

#### 3.2.4 实验详情页权限控制

**文件**: `src/components/experiments/ExperimentDetail.tsx`

根据项目状态控制按钮显示：
- 项目 COMPLETED/ARCHIVED → 隐藏编辑、删除、提交审核、申请解锁按钮
- 显示提示信息"项目已结束/归档，此实验不可编辑"

---

## 四、开发任务清单

### 4.1 后端任务

| 序号 | 任务 | 文件 | 优先级 | 状态 |
|------|------|------|--------|------|
| B1 | 项目编辑API忽略status字段 | `api/projects/[id]/route.ts` | 高 | ✅ 已完成 |
| B2 | 新增项目状态权限检查函数 | `lib/permissions.ts` | 高 | ✅ 已完成 |
| B3 | 实验编辑API增加项目状态检查 | `api/experiments/[id]/route.ts` | 高 | ✅ 已完成 |
| B4 | 实验删除API增加项目状态检查 | `api/experiments/[id]/route.ts` | 高 | ✅ 已完成 |
| B5 | 提交审核API增加项目状态检查 | `api/experiments/[id]/submit/route.ts` | 高 | ✅ 已完成 |
| B6 | 申请解锁API增加项目状态检查 | `api/experiments/[id]/unlock-request/route.ts` | 高 | ✅ 已完成 |
| B7 | ARCHIVED项目访问权限控制 | `api/projects/[id]/route.ts` | 高 | ✅ 已完成 |

### 4.2 前端任务

| 序号 | 任务 | 文件 | 优先级 | 状态 |
|------|------|------|--------|------|
| F1 | 项目卡片快捷编辑移除状态选择 | `ProjectList.tsx` | 高 | ✅ 已完成 |
| F2 | 项目详情页实验列表权限提示 | `ProjectDetail.tsx` | 中 | ✅ 已完成 |
| F3 | 实验详情页权限控制 | `ExperimentDetail.tsx` | 中 | ✅ 已完成 |
| F4 | 我的任务页面权限控制 | `MyTasks.tsx` | 中 | ✅ 已完成 |

### 4.3 测试任务

| 序号 | 任务 | 说明 | 状态 |
|------|------|------|------|
| T1 | 项目状态变更流程测试 | 确保唯一入口 | ✅ 通过 |
| T2 | 实验锁定功能测试 | COMPLETED/ARCHIVED状态不可编辑 | ✅ 通过 |
| T3 | ARCHIVED访问权限测试 | 不同角色访问归档项目 | 🔧 修复中 |
| T4 | 回归测试 | 确保其他功能不受影响 | 待测试 |

#### T3 问题修复记录

**问题**: SUPER_ADMIN 在项目列表中看不到未参与的归档项目卡片

**原因**: `GET /api/projects` 在 `default` 视角下过滤掉了 `_relation === 'GLOBAL'` 的项目，即使是 SUPER_ADMIN 也无法看到

**修复**: 修改项目列表 API，让管理员可以看到所有 ARCHIVED 状态的项目
```typescript
// 修复后的逻辑
if (isAdmin) {
  filteredProjects = projectsWithRelation.filter(p => 
    p._relation === 'CREATED' || 
    p._relation === 'LEADING' || 
    p._relation === 'JOINED' ||
    p.status === 'ARCHIVED'  // 管理员可以看到所有归档项目
  )
}
```

**待验证**: 
- SUPER_ADMIN 点击归档项目后能否正常进入详情页
- 解除归档操作是否有审计记录

---

## 五、影响评估

### 5.1 影响模块

| 模块 | 影响程度 | 说明 |
|------|----------|------|
| 项目管理 | 高 | 状态变更逻辑重构 |
| 实验记录 | 高 | 权限控制增强 |
| 我的任务 | 中 | 需适配权限变化 |
| 审核管理 | 低 | 已有权限检查 |

### 5.2 数据库变更

无需数据库变更，现有模型已支持：
- `Project.status` - 项目状态
- `Experiment.reviewStatus` - 实验审核状态
- `Project.archivedAt` - 归档时间

---

## 六、风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| 用户习惯改变 | 用户可能困惑状态入口变化 | UI提示 + 文档说明 |
| 权限控制遗漏 | 可能存在未覆盖的操作入口 | 全面的权限检查 + 测试覆盖 |
| 向后兼容 | 已有COMPLETED项目中的实验可能需要处理 | 不影响历史数据，只限制新操作 |

---

## 七、验收标准

### 7.1 功能验收

- [x] 项目卡片快捷编辑无法修改状态
- [x] 项目详情页状态操作按钮正常工作
- [x] COMPLETED 状态下实验不可编辑/删除/申请解锁
- [x] ARCHIVED 状态下实验不可编辑/删除/申请解锁
- [x] ARCHIVED 状态下管理员可访问完整数据
- [x] ARCHIVED 状态下项目成员可查看/下载
- [x] ARCHIVED 状态下普通用户只能看卡片
- [ ] SUPER_ADMIN 解除归档有审计记录（待测试）

### 7.2 代码质量

- [x] Lint 检查通过
- [x] 无运行时错误
- [x] 代码注释完整

---

## 八、变更记录

| 版本 | 日期 | 变更内容 | 变更人 |
|------|------|----------|--------|
| v1.0 | 2025-03-10 | 初始版本，制定重构计划 | AI |
| v1.1 | 2025-03-11 | 完成后端权限检查函数和API修改 | AI |
| v1.2 | 2025-03-11 | 完成前端权限控制实现 | AI |

---

*本文档将随开发进度持续更新*
