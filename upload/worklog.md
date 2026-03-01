# 项目开发记录

> BioLab ELN - 生物实验室电子实验记录管理系统

---

# 项目概述

**项目名称**: BioLab ELN (电子实验记录本)
**当前版本**: v3.0
**目标用户**: 生物实验室研究人员 (10-20人)
**核心价值**: 数字化管理实验记录，提高实验效率和数据可追溯性

---

## 已确认的设计方案

| 功能点 | 确认方案 |
|--------|----------|
| 用户权限 | 三级：管理员 / 项目负责人 / 研究员 |
| 实验步骤记录 | 自由文本 + 模板混合模式 |
| 模板分类 | 标签分类系统 |
| 实验与项目关联 | 多对多关系（一个实验可关联多个项目） |
| 文件附件 | PDF/Text/Word/Excel 在线预览，其他下载 |
| 界面风格 | 绿色+白色，清爽大方 |
| AI提取 | 支持从附件中提取试剂、仪器、参数、步骤 |
| 审核流程 | 草稿 → 待审核 → 需修改/已锁定 |

---

## 技术栈

- **前端**: Next.js 16 + React + TypeScript + Tailwind CSS
- **UI组件**: shadcn/ui (New York style) + Lucide icons
- **数据库**: Prisma ORM + SQLite
- **富文本编辑器**: TipTap
- **认证**: JWT + Cookie
- **AI服务**: z-ai-web-dev-sdk
- **文件解析**: mammoth, xlsx, pdf-parse

---

## 版本历史

| 版本 | 日期 | 主要功能 |
|------|------|----------|
| v1.0 MVP | 2025-01 | 基础CRUD功能、用户认证、项目管理 |
| v2.0 | 2025-01 | 富文本编辑器(TipTap)、图片上传、表格编辑 |
| v3.0 | 2025-02-27 | AI智能提取、审核流程、完整度评分、实验员沟通 |

---

## 测试账户

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@example.com | admin123 |
| 项目负责人 | lead@example.com | lead123 |
| 研究员 | researcher@example.com | research123 |

---

## 当前功能完成状态

### ✅ 已完成功能 (v3.0)

#### 用户认证模块
| 功能 | 状态 | 说明 |
|------|------|------|
| 登录/注册/登出 | ✅ | JWT认证 |
| 三级权限系统 | ✅ | ADMIN, PROJECT_LEAD, RESEARCHER |
| 默认管理员账户 | ✅ | admin@example.com |

#### 项目管理模块
| 功能 | 状态 | 说明 |
|------|------|------|
| 创建/编辑/删除项目 | ✅ | |
| 项目成员管理 | ✅ | 多对多关系 |
| 查看关联实验 | ✅ | |

#### 实验记录模块
| 功能 | 状态 | 说明 |
|------|------|------|
| 创建/编辑/删除实验 | ✅ | |
| 富文本编辑器 | ✅ | TipTap |
| 图片上传 | ✅ | 保存到 /upload/images/ |
| 表格编辑 | ✅ | 增删行列、合并拆分 |
| 关联多个项目 | ✅ | 多对多关系 |
| 附件管理 | ✅ | 上传/删除/下载 |
| 文件预览 | ✅ | Word/Excel/PDF/Text |

#### AI智能提取模块
| 功能 | 状态 | 说明 |
|------|------|------|
| 从附件提取信息 | ✅ | z-ai-web-dev-sdk |
| 提取试剂信息 | ✅ | 名称、规格、批号、厂家、用量 |
| 提取仪器信息 | ✅ | 名称、型号、设备编号 |
| 提取实验参数 | ✅ | 名称、数值、单位 |
| 提取实验步骤 | ✅ | 自动整理 |
| 提取安全注意事项 | ✅ | |
| 选择特定附件提取 | ✅ | 可多选 |
| 提取结果编辑 | ✅ | 可手动修改 |
| 应用到摘要/结论 | ✅ | 一键填充 |

#### 完整度评分模块
| 功能 | 状态 | 说明 |
|------|------|------|
| 评分计算 | ✅ | 总分100分 |
| 标题评分 | ✅ | 10分 |
| 摘要评分 | ✅ | 20分（按字符比例） |
| 结论评分 | ✅ | 20分（按字符比例） |
| 关联项目评分 | ✅ | 10分 |
| 附件评分 | ✅ | 15分 |
| AI提取评分 | ✅ | 25分 |
| 颜色指示 | ✅ | 绿/琥珀/橙/红 |
| 评分详情显示 | ✅ | 各维度实际得分 |

#### 审核流程模块
| 功能 | 状态 | 说明 |
|------|------|------|
| 提交审核 | ✅ | 完整度>=60%可提交 |
| 审核状态流转 | ✅ | DRAFT→PENDING→NEEDS_REVISION/LOCKED |
| 审核通过 | ✅ | 锁定实验 |
| 要求修改 | ✅ | 附带修改意见 |
| 审核管理列表 | ✅ | 分类显示 |
| 待审核提醒 | ✅ | 仪表盘显示 |

#### 实验员沟通功能
| 功能 | 状态 | 说明 |
|------|------|------|
| 提交时附加留言 | ✅ | 可选，最多500字符 |
| 留言显示给审核员 | ✅ | 审核页面蓝色卡片 |
| 提交与审批记录 | ✅ | 统一显示历史 |
| 审核意见记录 | ✅ | |

#### 实验模板模块
| 功能 | 状态 | 说明 |
|------|------|------|
| 创建/编辑/删除模板 | ✅ | |
| 从模板创建实验 | ✅ | |
| 富文本编辑器 | ✅ | |
| 标签分类 | ✅ | |

#### 仪表盘
| 功能 | 状态 | 说明 |
|------|------|------|
| 统计概览 | ✅ | 草稿/待审核/已锁定数量 |
| 最近记录快速访问 | ✅ | |
| 待审核提醒 | ✅ | 仅管理员和项目负责人可见 |

---

### 🚧 待开发功能

| 模块 | 功能 | 优先级 | 状态 |
|------|------|--------|------|
| 锁定PDF | 审核通过后生成标准化PDF | 中 | 待开发 |
| AI项目汇总 | 项目内多选PDF进行AI分析 | 低 | 待开发 |

---

## 数据库模型

### 核心枚举

```prisma
enum UserRole {
  ADMIN         // 管理员
  PROJECT_LEAD  // 项目负责人（可审核）
  RESEARCHER    // 研究员
}

enum ReviewStatus {
  DRAFT           // 草稿
  PENDING_REVIEW  // 待审核
  NEEDS_REVISION  // 需要修改
  LOCKED          // 已锁定
}

enum ExtractionStatus {
  PENDING    // 待提取
  PROCESSING // 提取中
  COMPLETED  // 提取完成
  FAILED     // 提取失败
}

enum ReviewAction {
  SUBMIT           // 提交审核
  APPROVE          // 审核通过
  REQUEST_REVISION // 要求修改
}
```

### 主要模型

- **User**: 用户信息、权限
- **Project**: 项目信息、成员关系
- **Experiment**: 实验记录、AI提取信息、审核状态
- **ReviewFeedback**: 提交留言、审核意见
- **Attachment**: 附件文件、预览数据
- **Template**: 实验模板
- **AuditLog**: 审计日志

---

## API路由清单

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/logout` | POST | 用户登出 |
| `/api/auth/me` | GET | 获取当前用户 |
| `/api/projects` | GET/POST | 项目列表/创建 |
| `/api/projects/[id]` | GET/PUT/DELETE | 项目详情/更新/删除 |
| `/api/experiments` | GET/POST | 实验列表/创建 |
| `/api/experiments/[id]` | GET/PUT/DELETE | 实验详情/更新/删除 |
| `/api/experiments/[id]/extract` | POST | AI智能提取 |
| `/api/experiments/[id]/submit` | POST | 提交审核 |
| `/api/experiments/[id]/review` | POST | 审核操作 |
| `/api/attachments` | GET/POST | 附件列表/上传 |
| `/api/attachments/[id]` | DELETE | 删除附件 |
| `/api/attachments/[id]/download` | GET | 下载附件 |
| `/api/templates` | GET/POST | 模板列表/创建 |
| `/api/templates/[id]` | GET/PUT/DELETE | 模板详情/更新/删除 |

---

## 关键文件路径

### 数据库
- Schema: `prisma/schema.prisma`
- 数据库文件: `db/custom.db`
- 环境变量: `.env`

### 前端组件
- 主页面: `src/app/page.tsx`
- 全局状态: `src/contexts/AppContext.tsx`
- 侧边栏: `src/components/layout/Sidebar.tsx`
- 实验编辑器: `src/components/experiments/ExperimentEditor.tsx`
- 实验详情: `src/components/experiments/ExperimentDetail.tsx`
- 实验列表: `src/components/experiments/ExperimentList.tsx`
- 审核列表: `src/components/experiments/ReviewList.tsx`
- 附件管理: `src/components/attachments/AttachmentManager.tsx`
- 文件预览: `src/components/attachments/FilePreviewDialog.tsx`
- AI提取面板: `src/components/experiments/ExtractedInfoPanel.tsx`
- 仪表盘: `src/components/dashboard/Dashboard.tsx`

### API路由
- 实验API: `src/app/api/experiments/route.ts`
- 实验详情API: `src/app/api/experiments/[id]/route.ts`
- AI提取API: `src/app/api/experiments/[id]/extract/route.ts`
- 提交审核API: `src/app/api/experiments/[id]/submit/route.ts`
- 审核API: `src/app/api/experiments/[id]/review/route.ts`
- 附件API: `src/app/api/attachments/route.ts`

---

## 开发任务记录

---

### Task ID: 1 - 一期功能开发 (MVP)

**日期**: 2025-01

**Work Log**:
- 设计并创建数据库模型
- 创建全局布局组件 (Sidebar, Header)
- 配置绿色主题配色系统
- 实现用户认证系统
- 实现项目管理功能
- 实现实验记录CRUD
- 实现实验模板系统
- 实现仪表盘首页

**Stage Summary**:
- 数据库模型设计完成
- 前端布局完成，采用侧边栏+头部导航布局
- 三级权限系统实现
- 界面采用绿色主题

---

### Task ID: 2 - 二期功能开发 - 富文本编辑器

**日期**: 2025-01

**Work Log**:
- 安装 TipTap 编辑器及扩展依赖
- 创建 RichTextEditor 组件
- 实现图片上传 API
- 集成富文本编辑到实验记录和模板
- 修复 SSR hydration 问题
- 添加表格操作功能

**Stage Summary**:
- 富文本编辑器完整功能实现
- 图片上传功能完成
- 编辑器支持 SSR

---

### Task ID: 4 - v3.0 核心重构重建

**日期**: 2025-02-26

**Work Log**:
- 数据库模型重构（ReviewStatus, ExtractionStatus, ReviewAction等）
- 后端API开发（附件、AI提取、审核）
- 前端组件开发（附件管理、预览、AI提取面板）
- AppContext更新

**Stage Summary**:
- 数据库模型更新完成
- 核心API完成
- 核心前端组件完成

---

### Task ID: 5 - v3.0 前端组件完善

**日期**: 2025-02-26

**Work Log**:
- ExperimentEditor.tsx 重构
- ExperimentDetail.tsx 更新
- Sidebar.tsx 新增审核管理入口
- ReviewList.tsx 创建
- ExperimentList.tsx 更新
- Dashboard.tsx 更新

**Stage Summary**:
- 审核流程UI完成
- 所有组件支持v3.0数据结构

---

### Task ID: 6 - v3.0 Bug修复与完整度评分优化

**日期**: 2025-02-27

**Work Log**:
- FilePreviewDialog.tsx 修复（useState导入位置错误）
- ExperimentDetail.tsx 修复
- API TypeScript 类型修复
- ProjectDetail.tsx 修复
- RichTextEditor.tsx 修复
- 完整度评分系统重构（前后端统一）

**Stage Summary**:
- 应用崩溃问题修复
- 完整度评分逻辑统一

---

### Task ID: 7 - 完整度评分模块UI优化

**日期**: 2025-02-27

**Work Log**:
- 颜色逻辑优化（绿/琥珀/橙/红）
- 评分细则显示优化（显示实际得分）
- 进度条颜色统一
- 文件修改：ExperimentEditor, ExperimentDetail, ExperimentList, Dashboard, ReviewList

**Stage Summary**:
- 颜色逻辑统一优化
- 评分细则清晰显示

---

### Task ID: 8 - 实验员与审核员沟通功能

**日期**: 2025-02-27

**Work Log**:
- 数据库模型更新（ReviewAction新增SUBMIT）
- submit API更新（支持submitNote参数）
- AppContext更新
- 前端组件更新（提交对话框、审核页面）
- Bug修复：Turbopack缓存问题导致Prisma枚举不识别

**Stage Summary**:
- 提交审核时可附加留言
- 审核页面显示实验员留言
- "提交与审批记录"统一显示

---

### Task ID: 9 - 文件存储结构优化讨论

**日期**: 2025-02-27

**背景**: 讨论实验记录附件的后台存储管理方案

**讨论内容**:

#### 当前问题
- 附件采用扁平存储（所有文件在同一目录）
- 文件命名：`{时间戳}_{随机字符}.{扩展名}`
- 不便于按项目归档管理

#### 方案对比

| 方案 | 结构 | 优点 | 缺点 |
|------|------|------|------|
| 当前方案 | upload/files/ | 简单、唯一 | 不便管理 |
| 方案A | 按实验ID | 对应数据库 | 不直观 |
| 方案B | 按项目+实验 | 直观、符合业务 | 多项目关联复杂 |

#### 确认方案
采用**方案B：按项目分类 + 实验子文件夹**

```
upload/projects/{项目名}/experiments/{日期_实验名}/
```

#### 新增功能需求
为最高管理权限（ADMIN）开放：
1. 后台文件目录查看（树形结构）
2. 按目录结构整体下载特定文件夹（ZIP打包）

**Stage Summary**:
- 确定文件存储重构方案
- 新增管理员文件管理功能需求
- 已更新到开发计划

---

## 下次开发计划

> 详细开发计划请查看：**[DEVELOPMENT_PLAN_v3.1.md](./DEVELOPMENT_PLAN_v3.1.md)**
> 系统功能规划请查看：**[SYSTEM_FEATURES.md](./SYSTEM_FEATURES.md)**

---

### 📋 v3.1 功能优先级总览（已确认，分阶段发布）

| 阶段 | 功能模块 | 预计工时 | 里程碑 | 状态 |
|------|----------|----------|--------|------|
| 阶段1 | 项目人员角色管理 | 1天 | M1 | 🔵 待启动 |
| 阶段2 | 文件存储结构重构 | 2天 | M2 | 🔵 待启动 |
| 阶段3 | 解锁功能 | 0.5天 | M3 | 🔵 待启动 |
| 阶段4 | 项目文档管理 | 1天 | M4 | 🔵 待启动 |
| 阶段5 | 管理员文件目录管理 | 1.5天 | M5 | 🔵 待启动 |

**总工时：6天**

---

### 🗓️ 版本规划

| 版本 | 功能范围 | 预计工时 | 状态 |
|------|----------|----------|------|
| v3.0 | 核心功能：AI提取 + 审核流程 + 完整度评分 | - | ✅ 已完成 |
| v3.1 | 基础设施升级（5个阶段） | 6天 | 🔵 待启动 |
| v3.2 | 锁定PDF生成 + AI项目汇总 | 2天 | 规划中 |
| v4.0 | 企业级功能 | 待评估 | 规划中 |

---

### 📋 v3.1 已确认事项

| 决策项 | 确认方案 |
|--------|----------|
| 功能合并 | 两组P0功能合并到v3.1 |
| 权限层级 | 全局ADMIN + 项目角色双层体系 |
| 项目角色 | PROJECT_LEAD / MEMBER / VIEWER |
| 解锁权限 | 项目负责人可直接解锁，但必须有历史记录 |
| 项目文档类型 | 四种：立项报告、阶段性总结、结题报告、其他 |
| 文档版本管理 | 暂不需要 |
| 发布策略 | 分阶段发布测试（M1→M2→M3→M4→M5） |

---

### 📁 文件存储新结构设计

```
upload/
└── projects/
    ├── 蛋白检测研究/                    # 项目名称
    │   └── experiments/
    │       ├── 2025-02-27_蛋白检测实验/  # 日期_实验标题
    │       │   ├── report.pdf
    │       │   └── data.xlsx
    │       └── 2025-02-28_验证实验/
    └── 细胞培养优化/
        └── experiments/
            └── 细胞培养基测试/
                └── notes.docx
```

---

### 🔒 锁定PDF结构设计

```
锁定后生成的PDF
├── 封面页（标题、项目、日期、作者、审核人）
├── 元数据页（摘要、结论、标签）
├── AI提取信息页（试剂、仪器、参数、步骤）
├── 正文内容（合并关键文件）
├── 原始文件清单页
└── 审核记录页
```

---

## 已知问题与解决方案

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| Prisma枚举不识别 | Turbopack缓存旧编译结果 | 显式导入枚举，清除缓存并重新生成Prisma客户端 |
| pdf-parse类型问题 | 动态导入类型定义缺失 | 使用 @ts-ignore 注释 |
| SSR hydration不匹配 | TipTap默认立即渲染 | 设置 immediatelyRender: false |

---

### Task ID: 10 - 系统回退防护机制

**日期**: 2025-02-28

**背景**: 针对系统可能回退导致开发计划和代码丢失的问题，建立完整的备份防护机制

**Work Log**:
- 创建 `WORK_PROTOCOL.md` - 工作规范文件
  - 定义会话启动流程
  - 定义功能开发流程
  - 定义备份触发条件
  - 定义功能修改影响评估清单
  - 定义应急恢复流程
- 创建 `RECOVERY_SNAPSHOT.md` - 轻量级快照
  - 当前状态概览
  - 已完成功能清单
  - 关键决策记录
  - 近期变更记录
  - 下一步工作
- 创建 `FULL_BACKUP.md` - 完整备份
  - 完整数据库模型定义
  - 完整API路由清单
  - 关键代码片段（完整度评分、提交审核、审核操作、AI提取）
  - 前端组件结构
  - 文件存储结构
  - 环境配置
  - 恢复指令

**Stage Summary**:
- 建立三层备份机制（工作规范 + 轻量快照 + 完整备份）
- 定义了完整的开发工作规范
- 记录了v3.0所有关键实现细节
- 可用于系统回退后的完整恢复

**新增文件清单**:
| 文件 | 用途 | 更新频率 |
|------|------|----------|
| `WORK_PROTOCOL.md` | 工作规范，AI启动时必读 | 重大变更时 |
| `RECOVERY_SNAPSHOT.md` | 轻量快照，快速恢复 | 每个功能完成后 |
| `FULL_BACKUP.md` | 完整备份，深度恢复 | 每个版本发布后 |

---

### Task ID: 11 - v3.1 功能需求讨论与开发方案制定

**日期**: 2025-02-28

**背景**: 讨论 v3.1 版本的新功能需求并制定开发方案

**讨论内容**:

#### 需求1: 实验记录解锁功能
- 已锁定实验需要支持解锁修改
- 解锁后状态变为"修订中"，修改后需重新审核锁定
- 权限：MEMBER可申请解锁自己的实验，PROJECT_LEAD和ADMIN可直接解锁
- **确认决策**：项目负责人可直接解锁，但必须有历史记录

#### 需求2: 项目人员角色管理
- 当前全局角色不灵活，同一用户在不同项目中角色可能不同
- 需要项目级角色：PROJECT_LEAD、MEMBER、VIEWER
- **确认决策**：采用"全局ADMIN + 项目角色"双层权限体系

#### 需求3: 项目文档管理
- 需要支持项目级别关键文件：立项报告、阶段性总结、结题报告
- **确认决策**：独立管理，四种文档类型，暂不需要版本管理

#### 开发方案确认

| 功能模块 | 优先级 | 工时 | 说明 |
|----------|--------|------|------|
| 项目人员角色管理 | P0 | 1天 | 基础设施，其他功能依赖 |
| 解锁功能 | P0 | 0.5天 | 依赖项目角色 |
| 项目文档管理 | P1 | 1天 | 独立开发 |

**Stage Summary**:
- v3.1 开发方案已制定并确认
- 创建了详细的 DEVELOPMENT_PLAN_v3.1.md
- 更新了 RECOVERY_SNAPSHOT.md 待开发功能列表
- **状态**: 待启动开发

---

### Task ID: 12 - v3.1 功能整合与分阶段发布规划

**日期**: 2025-02-28

**背景**: 将两组P0功能（权限流程增强 + 文件存储增强）整合到v3.1，制定分阶段发布测试计划

**讨论内容**:

#### 功能整合决策

| 功能组 | 原规划 | 整合后 |
|--------|--------|--------|
| 组A | 项目角色+解锁+文档 (2.5天) | 合并到v3.1 |
| 组B | 文件存储+管理 (3.5天) | 合并到v3.1 |
| **总计** | 6天 (分开) | **6天 (整合)** |

#### 开发阶段规划

| 阶段 | 功能 | 工时 | 发布里程碑 |
|------|------|------|------------|
| 阶段1 | 项目人员角色管理 | 1天 | M1 |
| 阶段2 | 文件存储结构重构 | 2天 | M2 |
| 阶段3 | 解锁功能 | 0.5天 | M3 |
| 阶段4 | 项目文档管理 | 1天 | M4 |
| 阶段5 | 管理员文件目录管理 | 1.5天 | M5 |

#### 确认事项

| 决策项 | 确认结果 |
|--------|----------|
| 功能合并 | ✅ 两组P0功能合并到v3.1 |
| 开发顺序 | ✅ 阶段1→2→3→4→5 |
| 发布策略 | ✅ 分阶段发布测试 |

**Work Log**:
- 更新 DEVELOPMENT_PLAN_v3.1.md 为整合版
- 添加分阶段发布测试计划
- 添加各阶段发布检查清单
- 添加回滚方案
- 更新 RECOVERY_SNAPSHOT.md
- 创建 SYSTEM_FEATURES.md 系统功能规划文档

**Stage Summary**:
- v3.1 整合版开发计划完成
- 分阶段发布测试计划制定完成
- 系统功能规划文档创建完成
- **状态**: 待启动开发

---

### Task ID: 13 - v3.1 阶段1: 项目人员角色管理 (M1)

**日期**: 2025-02-28

**背景**: 实现项目级角色管理体系，支持在项目内为成员分配不同角色

**Work Log**:

#### 数据库模型更新
- 新增 `ProjectMemberRole` 枚举：PROJECT_LEAD / MEMBER / VIEWER
- 新增 `ProjectMember` 模型：项目-用户-角色关系表
- 执行 `db:push` 迁移数据库

#### 权限检查函数封装
- 创建 `src/lib/permissions.ts`
- 实现 `hasProjectPermission()` - 检查项目权限
- 实现 `canReviewExperiment()` - 审核权限检查
- 实现 `canUnlockExperiment()` - 解锁权限检查
- 实现 `canManageMembers()` - 成员管理权限
- 实现 `canEditExperiment()` - 编辑权限检查
- 实现 `getUserAccessibleProjects()` - 获取可访问项目

#### 成员管理API开发
- `GET /api/projects/[id]/members` - 获取成员列表
- `POST /api/projects/[id]/members` - 添加成员
- `PUT /api/projects/[id]/members/[userId]` - 修改角色
- `DELETE /api/projects/[id]/members/[userId]` - 移除成员

#### 前端成员管理界面
- 创建 `ProjectMemberManager.tsx` 组件
- 支持查看成员列表和角色
- 支持修改成员角色（下拉选择）
- 支持移除成员
- 支持邀请新成员

#### 项目API更新
- 更新 `GET /api/projects` - 按项目成员过滤
- 更新 `POST /api/projects` - 自动创建者添加为PROJECT_LEAD

#### 数据迁移
- 创建 `scripts/migrate-project-members.ts`
- 将现有项目成员迁移到新表

**Stage Summary**:
- 项目级角色管理功能完成
- 三种角色：PROJECT_LEAD / MEMBER / VIEWER
- 权限检查函数已封装
- 前端界面已实现
- 数据迁移已完成
- **里程碑 M1**: ✅ 完成

---

### Task ID: 14 - 用户管理模块 + 成员数修复 + 角色系统重构 + 审核请求系统

**日期**: 2025-02-28

**背景**: 完善系统管理功能和审核流程

**Work Log**:

#### 1. 用户管理模块 (管理员功能)
- 创建 `/src/app/api/users/manage/route.ts` - 用户列表查询、用户创建API
- 创建 `/src/app/api/users/manage/[id]/route.ts` - 用户更新、禁用API
- 创建 `/src/components/users/UserManagement.tsx` - 用户管理前端组件
- 更新 Sidebar 添加用户管理入口（仅管理员可见）
- 更新 page.tsx 处理 'users' tab

#### 2. 项目成员数修复
- AppContext 添加 `memberCount` 字段到 Project 类型
- 更新 `/api/projects` 返回 memberCount
- 更新 ProjectList 和 ProjectDetail 使用 memberCount
- 更新 ProjectMemberManager 在添加/移除成员后调用 refreshData()

#### 3. 角色系统重构
- **问题**: UserRole 和 ProjectMemberRole 混淆，PROJECT_LEAD 同时出现在两个层级
- **决策**: 简化全局角色，UserRole 只保留 ADMIN + RESEARCHER
- **变更**:
  - 更新 prisma/schema.prisma，移除 UserRole 中的 PROJECT_LEAD
  - 更新所有前端组件（Sidebar、Dashboard、ProjectList、ExperimentDetail等）
  - 创建迁移脚本将现有 PROJECT_LEAD 用户转换为 RESEARCHER
  - 执行 `UPDATE users SET role = 'RESEARCHER' WHERE role = 'PROJECT_LEAD'`

#### 4. 审核请求系统 (指定审核人 + 转交功能)
- **需求**: 提交审核时选择特定审核人（多选），支持转交审核
- **数据库更新**:
  - 添加 `ReviewRequest` 模型
  - 添加 `ReviewRequestStatus` 枚举: PENDING, COMPLETED, TRANSFERRED, CANCELLED
  - 添加 `TRANSFER` 到 `ReviewAction` 枚举
- **API开发**:
  - 更新 `/api/experiments/[id]/submit` - 支持 reviewerIds 数组
  - 创建 `/api/experiments/[id]/transfer` - 转交审核API
  - 创建 `/api/projects/[id]/pending-reviews` - 获取待审核列表
- **前端更新**:
  - ExperimentDetail 添加审核人多选下拉框
  - 重新提交时可重新选择审核人
  - ProjectDetail 添加"待我审核"Tab（PROJECT_LEAD可见）

**Stage Summary**:
- 管理员可管理用户（创建、编辑、禁用）
- 项目概览成员数实时更新
- 角色体系清晰：全局 ADMIN/RESEARCHER + 项目 PROJECT_LEAD/MEMBER/VIEWER
- 审核流程支持指定审核人、多选、转交
- **里程碑**: ✅ 完成

**待处理事项**:
- 权限系统重构：目前所有注册用户可看到所有实验记录和下载附件
- 需要根据项目成员关系控制实验可见性和附件下载权限

---

## 下次开发计划

> **重要**: 权限系统需要重构
> - 实验可见性：只有项目成员可查看项目内的实验
> - 附件下载：只有有权限的用户可下载
> - ADMIN 可查看所有内容
