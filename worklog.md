# 项目开发记录

> BioLab ELN - 生物实验室电子实验记录管理系统

---

# 项目概述

**项目名称**: BioLab ELN (电子实验记录本)
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

---

## 开发进度

---
Task ID: 1
Agent: Main Agent
Task: 一期功能开发 (MVP)

Work Log:
- 设计并创建数据库模型 (User, Project, Experiment, Template, Attachment, AuditLog)
- 执行数据库迁移，创建所有表结构
- 创建全局布局组件 (Sidebar, Header)
- 配置绿色主题配色系统
- 实现用户认证系统 (登录/注册/登出)
- 实现项目管理功能 (创建/列表/详情/编辑/删除)
- 实现实验记录CRUD (创建/列表/详情/编辑)
- 实现实验模板系统 (创建/列表/编辑/删除)
- 实现仪表盘首页 (统计概览/最近记录)
- 创建所有API路由 (auth, projects, experiments, templates)
- 实现版本历史功能 (自动保存)
- 实现审计日志功能
- 创建默认管理员账户 (admin@example.com / admin123)

Stage Summary:
- 数据库模型设计完成，支持用户权限、项目管理、实验记录、模板、附件、审计日志
- 前端布局完成，采用侧边栏+头部导航布局
- 三级权限系统实现：ADMIN, PROJECT_LEAD, RESEARCHER
- 实验记录支持自由文本编辑和模板创建
- 实验与项目支持多对多关联
- 界面采用绿色主题，清爽大方
- 所有API接口测试通过

---
Task ID: 2
Agent: Main Agent
Task: 二期功能开发 - 富文本编辑器

Work Log:
- 安装 TipTap 编辑器及扩展依赖
- 创建 RichTextEditor 组件，支持富文本编辑
- 实现图片上传 API (/api/upload)
- 更新实验记录编辑器，集成富文本编辑
- 更新模板编辑器，集成富文本编辑
- 修复 SSR hydration 不匹配问题 (immediatelyRender: false)
- 修复编辑实验记录时内容不显示问题 (useEffect 同步外部内容)
- 添加表格操作下拉菜单（增删行列、合并拆分单元格）
- 修复项目详情页点击实验记录无法跳转问题
- 性能优化：useMemo 缓存编辑器扩展配置

Stage Summary:
- 富文本编辑器完整功能实现：
  - 文本格式化：加粗、斜体、下划线、删除线、高亮、代码
  - 标题：H1、H2、H3
  - 对齐：左对齐、居中、右对齐
  - 列表：有序列表、无序列表、引用
  - 表格：插入表格、增删行列、合并拆分单元格、删除表格
  - 图片：上传图片、粘贴图片
  - 代码块：支持语法高亮
  - 其他：分隔线、撤销/重做
- 图片上传功能完成，保存到 /upload/images/ 目录
- 编辑器支持 SSR，解决 Next.js 水合问题
- 实验记录编辑时内容正确加载和保存

---

## 当前功能状态

### ✅ 已完成功能

| 模块 | 功能 | 状态 |
|------|------|------|
| 用户认证 | 登录/注册/登出 | ✅ 完成 |
| 用户认证 | 默认管理员账户 | ✅ 完成 |
| 项目管理 | 创建/编辑/删除项目 | ✅ 完成 |
| 项目管理 | 项目成员管理 | ✅ 完成 |
| 项目管理 | 查看关联实验 | ✅ 完成 |
| 实验记录 | 创建/编辑/删除实验 | ✅ 完成 |
| 实验记录 | 富文本编辑器 | ✅ 完成 |
| 实验记录 | 图片上传 | ✅ 完成 |
| 实验记录 | 表格编辑 | ✅ 完成 |
| 实验记录 | 关联多个项目 | ✅ 完成 |
| 实验模板 | 创建/编辑/删除模板 | ✅ 完成 |
| 实验模板 | 从模板创建实验 | ✅ 完成 |
| 实验模板 | 富文本编辑器 | ✅ 完成 |
| 仪表盘 | 统计概览 | ✅ 完成 |
| 仪表盘 | 最近记录快速访问 | ✅ 完成 |
| 权限系统 | 三级权限 | ✅ 完成 |

### 🚧 待开发功能

| 模块 | 功能 | 优先级 | 状态 |
|------|------|--------|------|
| 审核列表 | ReviewList组件 | 中 | 待开发 |
| 实验编辑器 | 重构为极简录入模式 | 中 | 待开发 |
| 侧边栏 | 添加审核管理入口 | 中 | 待开发 |
| 锁定PDF | 审核通过后生成PDF | 中 | 待开发 |
| AI项目汇总 | 多选PDF分析 | 低 | 待开发 |

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

## 版本检查点记录

| 检查点 | 日期 | Git提交 | 关键验证项 |
|--------|------|---------|------------|
| v1.0 MVP | 2025-01-XX | 92d6637 | 基础CRUD功能 |
| v2.0 富文本 | 2025-01-XX | - | TipTap编辑器 |
| v3.0 核心重构(进行中) | 2025-02-26 | 36b94fa | AI提取+审核流程 |

---

## Task ID: 4 - v3.0 核心重构重建

**日期**: 2025-02-26

**背景**: 发现版本回退，v3.0代码丢失，根据备份文件重建

### Work Log:

#### 1. 数据库模型重构 (`prisma/schema.prisma`)
- 新增 ReviewStatus 枚举: DRAFT, PENDING_REVIEW, NEEDS_REVISION, LOCKED
- 新增 ExtractionStatus 枚举: PENDING, PROCESSING, COMPLETED, FAILED
- 新增 ReviewAction 枚举: APPROVE, REQUEST_REVISION
- 新增 AttachmentCategory 枚举: DOCUMENT, DATA_FILE, IMAGE, RAW_DATA, LOCKED_PDF, OTHER
- Experiment 模型重构:
  - 移除: objective, content, status (旧字段)
  - 新增: summary, extractedInfo, extractionStatus, extractionError, reviewStatus, completenessScore, submittedAt, reviewedAt
- 新增 ReviewFeedback 模型
- Attachment 模型新增: category, extractedText
- ExperimentVersion 模型调整: 移除content, 新增summary, extractedInfo

#### 2. 后端API开发
| 接口 | 文件 | 功能 |
|------|------|------|
| `/api/attachments` | route.ts | 上传附件+轻量级预览提取 |
| `/api/attachments/[id]` | route.ts | 删除附件 |
| `/api/attachments/[id]/download` | route.ts | 下载附件 |
| `/api/experiments` | route.ts | 更新返回新字段 |
| `/api/experiments/[id]` | route.ts | 更新支持新字段 |
| `/api/experiments/[id]/extract` | route.ts | AI智能提取(调用z-ai-web-dev-sdk) |
| `/api/experiments/[id]/submit` | route.ts | 提交审核 |
| `/api/experiments/[id]/review` | route.ts | 审核操作 |

#### 3. 前端组件开发
| 组件 | 文件 | 功能 |
|------|------|------|
| AttachmentManager | src/components/attachments/AttachmentManager.tsx | 附件管理+上传入口 |
| FilePreviewDialog | src/components/attachments/FilePreviewDialog.tsx | 轻量级预览对话框 |
| ExtractedInfoPanel | src/components/experiments/ExtractedInfoPanel.tsx | AI提取结果展示/编辑 |

#### 4. AppContext更新
- 新增类型: ReviewStatus, ExtractionStatus, ExtractedInfo, PreviewData, Attachment, ReviewFeedback
- 新增方法: triggerExtraction, updateExtractedInfo, submitForReview, reviewExperiment

#### 5. 依赖安装
- mammoth: Word文档解析
- xlsx: Excel文件解析
- pdf-parse: PDF解析

### Stage Summary:
- ✅ 数据库模型更新完成
- ✅ 附件API完成（上传/删除/下载+轻量级预览）
- ✅ AI提取API完成
- ✅ 审核API完成
- ✅ 核心前端组件完成（附件管理、预览、AI提取面板）
- ⏳ 待完成：审核列表、实验编辑器重构、侧边栏更新

### Git提交记录:
```
36b94fa feat: v3.0核心重构 - 数据库模型+API+前端组件(部分)
```

---

## Task ID: 5 - v3.0 前端组件完善

**日期**: 2025-02-26

**背景**: 继续v3.0恢复工作，更新前端组件以支持新的数据结构

### Work Log:

#### 1. ExperimentEditor.tsx 重构
- 移除旧字段: objective, content, status
- 新增字段: summary, conclusion, reviewStatus
- 集成 AttachmentManager 组件
- 集成 ExtractedInfoPanel 组件
- 新增完整度评分显示和计算
- 新增提交审核功能
- 根据审核状态控制编辑权限

#### 2. ExperimentDetail.tsx 更新
- 更新为v3.0字段结构
- 显示审核状态徽章
- 集成附件管理组件
- 集成AI提取面板
- 新增审核信息展示
- 权限控制（可编辑/可删除/可提交审核）

#### 3. Sidebar.tsx 更新
- 新增"审核管理"菜单项
- 仅管理员和项目负责人可见
- 显示待审核数量徽章

#### 4. ReviewList.tsx 创建
- 待审核实验列表
- 待修改实验列表
- 已锁定实验列表
- 审核对话框（通过/要求修改）
- 审核意见填写

#### 5. page.tsx 更新
- 新增 'review' 标签页处理
- 导入 ReviewList 组件

#### 6. ExperimentList.tsx 更新
- 更新筛选条件使用 reviewStatus
- 显示审核状态徽章
- 显示完整度评分

#### 7. Dashboard.tsx 更新
- 统计卡片更新（草稿/待审核/已锁定）
- 待审核提醒卡片（仅管理员和项目负责人可见）
- 实验列表显示审核状态和完整度

### Stage Summary:
- ✅ ExperimentEditor 完全重构，支持v3.0工作流
- ✅ ExperimentDetail 支持v3.0字段和审核流程
- ✅ Sidebar 新增审核管理入口
- ✅ ReviewList 组件完成
- ✅ ExperimentList 支持 reviewStatus
- ✅ Dashboard 支持 v3.0 统计和提醒
- ✅ 所有组件通过 lint 检查

---

## 当前功能状态

### ✅ v3.0 已完成功能

| 模块 | 功能 | 状态 |
|------|------|------|
| 数据库 | v3.0模型（ReviewStatus, ExtractionStatus等） | ✅ 完成 |
| API | 附件上传/删除/下载 | ✅ 完成 |
| API | 附件轻量级预览提取 | ✅ 完成 |
| API | AI智能提取（调用z-ai-web-dev-sdk） | ✅ 完成 |
| API | 提交审核 | ✅ 完成 |
| API | 审核操作（通过/要求修改） | ✅ 完成 |
| 前端 | 附件管理组件 | ✅ 完成 |
| 前端 | 文件预览对话框 | ✅ 完成 |
| 前端 | AI提取结果面板 | ✅ 完成 |
| 前端 | 审核管理列表 | ✅ 完成 |
| 前端 | 实验编辑器重构 | ✅ 完成 |
| 前端 | 完整度评分计算 | ✅ 完成 |
| 前端 | 审核流程UI | ✅ 完成 |

### 🚧 待开发功能

| 模块 | 功能 | 优先级 | 状态 |
|------|------|--------|------|
| 锁定PDF | 审核通过后生成标准化PDF | 中 | 待开发 |
| AI项目汇总 | 多选PDF分析 | 低 | 待开发 |

---

## 下次开发计划

1. **锁定PDF功能**
   - 审核通过后自动生成PDF
   - PDF包含：封面、元数据、AI提取信息、审核记录

2. **AI项目汇总**
   - 项目内多选锁定PDF
   - AI汇总分析

---

## 更新日志

### 2025-01-XX (二期开发)
- 新增富文本编辑器（TipTap）
- 新增图片上传功能
- 新增表格编辑功能
- 修复 SSR hydration 问题
- 修复编辑时内容丢失问题
- 修复项目详情页点击实验记录无法跳转问题

### 2025-01-XX (一期开发)
- 项目初始化
- 数据库模型设计
- 用户认证系统
- 项目管理模块
- 实验记录模块
- 实验模板模块
- 仪表盘首页

---

## Task ID: 6 - v3.3 我的任务模块开发

**日期**: 2025-02-28

**背景**: 为用户提供统一的任务管理中心，快速处理与自己相关的实验记录任务

### Work Log:

#### 1. 数据库模型更新 (`prisma/schema.prisma`)
- 新增 UnlockRequestStatus 枚举: PENDING, APPROVED, REJECTED, CANCELLED
- 新增 UnlockRequest 模型:
  - reason: 申请原因
  - status: 申请状态
  - response: 审核回复
  - createdAt, updatedAt, processedAt: 时间字段
  - 关联: experiment, requester, processor

#### 2. 后端API开发
| 接口 | 文件 | 功能 |
|------|------|------|
| `/api/experiments/[id]/unlock-request` | route.ts | 提交解锁申请 |
| `/api/experiments/[id]/feedbacks` | route.ts | 获取审核反馈历史 |

#### 3. 前端组件开发
| 组件 | 文件 | 功能 |
|------|------|------|
| MyTasks | src/components/tasks/MyTasks.tsx | 我的任务主组件（4个Tab） |
| TaskListBase | src/components/tasks/TaskListBase.tsx | 基础列表组件（预留复用） |

#### 4. Sidebar.tsx 更新
- 新增"我的任务"菜单入口
- 显示待处理任务总数徽章
- 移除原来的子菜单展开设计，改为单一入口

#### 5. 功能分类实现

**我的草稿 Tab:**
- 显示用户创建的所有草稿实验记录
- "继续编辑"按钮直接进入编辑器

**待我审核 Tab:**
- 显示用户作为项目负责人需要审核的记录
- "查看"按钮查看详情
- "审核"按钮打开审核对话框
- 支持"审核通过"/"要求修改"两种操作

**待我修改 Tab:**
- 显示被退回需要修改的记录
- "查看反馈"按钮查看审核历史
- "去修改"按钮进入编辑器

**我的已锁定记录 Tab:**
- 显示用户所有已锁定的记录
- "查看"按钮查看详情
- "申请解锁"按钮提交解锁申请

#### 6. 文档编写
- 创建 `/docs/MY_TASKS_MODULE.md` 模块文档
- 包含功能说明、API文档、数据模型、用户流程等

### Stage Summary:
- ✅ 数据库模型扩展（UnlockRequest）
- ✅ 解锁申请API完成
- ✅ 反馈历史API完成
- ✅ MyTasks组件完成（4个Tab）
- ✅ Sidebar更新完成
- ✅ 模块文档编写完成
- ⏳ 待完成：解锁审批功能（审核管理模块中处理）

### Git提交记录:
```
feat: 新增"我的任务"模块 - 统一任务管理中心
```

---

## Task ID: 7 - 项目管理模块优化规划

**日期**: 2025-02-28

**背景**: 用户提出项目管理模块优化需求，需要重新设计项目状态流转、日期概念、项目详情页等功能

### Work Log:

#### 需求分析
1. **结束日期概念分离**
   - 新建项目的结束日期 → 预计结束日期
   - 项目状态变为已结束 → 产生真实结束时间

2. **项目状态流转增强**
   - 进行中 → 已结束：项目负责人操作，自动锁定所有实验
   - 已结束 → 进行中：项目负责人解锁
   - 已结束 → 已归档：项目负责人操作
   - 已归档 → 进行中/已结束：仅superadmin可操作

3. **项目详情页重构**
   - 项目信息Tab：基本信息展示
   - 人员管理Tab：成员管理
   - 项目文档Tab：上传/下载文档（立项报告、进展报告、结题报告、其他）
   - 实验记录Tab：搜索、筛选、快速访问

#### 现有实现分析
- CreateProjectDialog: endDate字段需改为预计结束日期
- ProjectList: 状态编辑需增加流转逻辑
- ProjectDetail: 需重构为多Tab布局
- 数据库: 需新增expectedEndDate、actualEndDate、completedAt、archivedAt字段

#### 规划输出
- 创建 `/docs/PROJECT_MODULE_REFACTOR_PLAN.md` 详细规划文档
- 包含：需求分析、数据库改造方案、API设计、前端组件设计、开发任务清单

### Stage Summary:
- ✅ 完成需求分析和整理
- ✅ 完成现有实现分析
- ✅ 完成改造方案设计
- ✅ 完成开发任务拆解
- ⏳ 待开发：数据库改造 → 后端API → 前端组件 → 测试

---

## Task ID: 8 - 项目管理模块优化开发

**日期**: 2025-02-28

**背景**: 根据规划文档实施项目管理模块优化，包括日期概念分离、状态流转增强、项目详情页重构

### Work Log:

#### 1. 数据库模型改造
- Project模型新增字段：
  - `expectedEndDate` - 预计结束日期
  - `actualEndDate` - 真实结束日期
  - `completedAt` - 结束时间戳
  - `archivedAt` - 归档时间戳
- 保留`endDate`字段用于数据兼容
- 执行 `bun run db:push` 同步数据库

#### 2. 后端API开发
- **状态变更API** `/api/projects/[id]/status`
  - GET: 获取可用状态操作
  - PUT: 执行状态变更
  - 支持操作: complete, reactivate, archive, unarchive
  - 项目结束时自动锁定所有关联实验记录

- **项目文档API**
  - GET `/api/projects/[id]/documents` - 获取文档列表
  - POST `/api/projects/[id]/documents` - 上传文档
  - GET `/api/projects/[id]/documents/[docId]` - 下载文档
  - DELETE `/api/projects/[id]/documents/[docId]` - 删除文档

#### 3. 权限函数扩展
- `canCompleteProject` - 可结束项目
- `canUnlockCompletedProject` - 可解锁已结束项目
- `canArchiveProject` - 可归档项目
- `canUnlockArchivedProject` - 可解锁已归档项目（仅超级管理员）
- `getAvailableProjectStatusActions` - 获取可用操作列表
- `canManageProjectDocuments` - 可管理项目文档

#### 4. 文件路径工具更新
- 新增 `getProjectDocumentsDir` - 获取项目文档目录
- 新增 `generateProjectDocumentPath` - 生成项目文档路径

#### 5. 前端组件改造
- **CreateProjectDialog**: "结束日期" → "预计结束日期"，添加提示说明
- **ProjectList**: 添加状态操作下拉菜单
- **ProjectDetail**: 完全重构为四大Tab布局
  - Tab 1: 项目信息 - 基本信息、日期、状态
  - Tab 2: 人员管理 - 成员列表
  - Tab 3: 项目文档 - 文档上传/下载/删除
  - Tab 4: 实验记录 - 关联实验列表

#### 6. AppContext类型更新
- Project接口新增: expectedEndDate, actualEndDate, completedAt, archivedAt

### Stage Summary:
- ✅ 数据库模型改造完成
- ✅ 状态变更API完成（含自动锁定）
- ✅ 项目文档API完成
- ✅ 前端CreateProjectDialog改造完成
- ✅ 前端ProjectDetail重构完成（四大Tab）
- ✅ 权限检查函数完善
- ⏳ 待完善：ProjectList状态变更对话框增强

### 文件变更:
| 文件 | 变更类型 |
|------|---------|
| prisma/schema.prisma | 修改 |
| src/lib/permissions.ts | 新增函数 |
| src/lib/file-path.ts | 新增函数 |
| src/app/api/projects/route.ts | 修改 |
| src/app/api/projects/[id]/status/route.ts | 新建 |
| src/app/api/projects/[id]/documents/route.ts | 新建 |
| src/app/api/projects/[id]/documents/[docId]/route.ts | 新建 |
| src/components/projects/CreateProjectDialog.tsx | 修改 |
| src/components/projects/ProjectDetail.tsx | 重构 |
| src/contexts/AppContext.tsx | 修改 |

---

## Task ID: 9 - 项目成员管理功能修复

**日期**: 2025-02-28

**背景**: 发现项目详情页中"添加成员"按钮无效

### 问题分析
- 添加成员按钮未绑定onClick事件
- 缺少成员管理API
- 缺少添加成员对话框

### Work Log:

#### 1. 新增成员管理API
- `GET /api/projects/[id]/members` - 获取项目成员列表
- `POST /api/projects/[id]/members` - 添加成员到项目
- `PUT /api/projects/[id]/members/[userId]` - 更新成员角色
- `DELETE /api/projects/[id]/members/[userId]` - 移除成员

#### 2. 新增用户列表API
- `GET /api/users` - 获取所有激活用户（用于添加成员选择）

#### 3. 更新ProjectDetail组件
- 新增添加成员对话框
- 实现成员列表展示（含项目角色）
- 实现成员角色修改功能
- 实现成员移除功能
- 支持多选用户批量添加
- 支持用户搜索筛选

### Stage Summary:
- ✅ 成员管理API完成
- ✅ 添加成员功能修复
- ✅ 成员角色管理功能完成
- ✅ 移除成员功能完成

---

## Task ID: 10 - 项目管理全局视角与基本信息编辑

**日期**: 2025-02-28

**背景**: 用户提出两个功能需求：
1. 全局视角功能 - 项目模块级别的视角切换，区分"我创建的"、"我参与的"和"所有项目"
2. 项目基本信息编辑 - 支持编辑开始日期、预计结束日期、项目描述

### 需求讨论
- 管理员和超级管理员默认具有所有项目的权限
- 成员列表只显示实际参与的用户（ProjectMember表记录）
- 全局视角下管理员可查看和操作所有项目

### Work Log:

#### 1. 后端API改造
- `GET /api/projects` 支持viewMode参数
  - viewMode: 'default' | 'my_created' | 'my_joined' | 'global'
  - 返回项目关系标记 `_relation`: 'CREATED' | 'JOINED' | 'GLOBAL'
- `PUT /api/projects/[id]` 支持更新startDate、expectedEndDate、description字段

#### 2. 前端ProjectList组件改造
- 新增视角切换下拉菜单（仅管理员可见）
- 按视角分类显示项目列表
- 全局视角下显示项目关系标记（我创建/我参与/其他）

#### 3. 前端ProjectDetail组件改造
- 项目信息Tab新增编辑按钮
- 实现编辑模式切换
- 添加日期选择器（开始日期、预计结束日期）
- 添加描述编辑框
- 项目描述始终显示（即使为空显示"暂无描述"）

#### 4. AppContext类型更新
- 新增 `ProjectRelation` 类型
- Project接口新增 `_relation` 可选字段

#### 5. 规划文档
- 创建 `/docs/PROJECT_GLOBAL_VIEW_PLAN.md` 详细规划文档

### 文件变更:
| 文件 | 变更类型 |
|------|---------|
| docs/PROJECT_GLOBAL_VIEW_PLAN.md | 新建 |
| src/app/api/projects/route.ts | 修改 |
| src/app/api/projects/[id]/route.ts | 修改 |
| src/components/projects/ProjectList.tsx | 重构 |
| src/components/projects/ProjectDetail.tsx | 重构 |
| src/contexts/AppContext.tsx | 修改 |

### Stage Summary:
- ✅ 全局视角功能完成（视角切换、项目分类显示）
- ✅ 项目描述显示修复
- ✅ 项目基本信息编辑功能完成（日期、描述）
- ✅ 规划文档编写完成
- ✅ Lint检查通过
