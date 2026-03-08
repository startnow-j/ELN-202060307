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

---

## Task ID: 11 - Bug修复：项目基本信息编辑保存失败

**日期**: 2025-02-28

**背景**: 用户反馈项目基本信息编辑后无法保存

### 问题分析

#### 问题1：错误的npm包导入
- `ProjectDetail.tsx` 和 `ProjectList.tsx` 中错误导入了 `date-fiber`
- 正确的包名应该是 `date-fns`
- 该错误导致组件加载时JavaScript运行时错误

#### 问题2：后端API字段处理不当
- `PUT /api/projects/[id]` 在更新时，前端只发送部分字段
- 后端尝试更新所有字段，包括未提供的 `name` 和 `status`
- 当这些字段为 `undefined` 时可能导致问题

### Work Log:

#### 1. 修复npm包导入错误
```typescript
// 修复前（错误）
import { format } from 'date-fiber'

// 修复后（正确）- 但发现未使用，已移除
// import { format } from 'date-fns'
```

#### 2. 修复后端API字段处理
```typescript
// 修复前
data: {
  name,  // undefined 会被传入
  status,
  ...
}

// 修复后 - 使用展开运算符只更新提供的字段
data: {
  ...(name !== undefined && { name }),
  ...(description !== undefined && { description }),
  ...(status !== undefined && { status }),
  ...
}
```

#### 3. 清理未使用的导入
- 移除 `ProjectList.tsx` 中未使用的 `format` 导入
- 移除 `ProjectDetail.tsx` 中未使用的 `format` 导入

### 文件变更:
| 文件 | 变更类型 |
|------|---------|
| src/components/projects/ProjectDetail.tsx | 修复导入错误 |
| src/components/projects/ProjectList.tsx | 修复导入错误 |
| src/app/api/projects/[id]/route.ts | 修复字段更新逻辑 |

### Stage Summary:
- ✅ 导入错误已修复
- ✅ 后端API字段处理已优化
- ✅ Lint检查通过
- ⚠️ 预览界面显示问题已恢复

---

## Task ID: 12 - 项目管理模块优化与Bug修复

**日期**: 2025-02-28

**背景**: 继续完善项目管理模块，修复成员数显示问题，新增项目主负责人字段，简化视角切换功能

### Work Log:

#### 1. 修复项目成员数未更新问题
- **问题**: 项目卡片中成员数始终为0，与项目详情页不一致
- **原因**: 项目列表使用 `project.members?.length`，但成员实际存储在 `projectMembers` 表中
- **解决**:
  - API 返回新增 `memberCount` 字段，计算逻辑：`projectMembers` 表成员 + 创建者
  - 前端组件使用 `memberCount` 显示成员数量

#### 2. 新增项目主负责人字段
- **需求**: 项目允许多个负责人，需要手写填入"项目主负责人"
- **实现**:
  - 数据库新增 `primaryLeader` 字段（String? 类型）
  - 创建项目对话框新增主负责人输入框
  - 项目详情页支持编辑主负责人
  - API 支持 `primaryLeader` 字段的读写

#### 3. 简化视角切换功能
- **需求**: 原有4种视角（普通视角、我创建的、我参与的、全局视角）过于复杂
- **修改**: 简化为2种视角
  - **普通视角**: 显示我创建和参与的项目
  - **全局视角**: 显示所有项目（仅管理员可用）
- **优化**: 管理员默认使用全局视角，普通用户只能使用普通视角

#### 4. 修复项目主负责人保存失败
- **问题**: 编辑主负责人后保存失败，提示"更新项目失败"
- **原因**: Prisma 客户端缓存未更新，不识别新的 `primaryLeader` 字段
- **解决**: 执行 `npx prisma generate` 重新生成 Prisma 客户端

### 文件变更:
| 文件 | 变更类型 | 说明 |
|------|---------|------|
| prisma/schema.prisma | 修改 | 新增 primaryLeader 字段 |
| src/app/api/projects/route.ts | 修改 | 新增 memberCount、primaryLeader 支持 |
| src/app/api/projects/[id]/route.ts | 修改 | 支持 primaryLeader 更新 |
| src/components/projects/ProjectList.tsx | 重构 | 简化视角切换，使用 memberCount |
| src/components/projects/ProjectDetail.tsx | 修改 | 新增主负责人编辑、成员数据立即获取 |
| src/components/projects/CreateProjectDialog.tsx | 修改 | 新增主负责人输入框 |
| src/contexts/AppContext.tsx | 修改 | Project 类型新增 primaryLeader、memberCount |

### Stage Summary:
- ✅ 项目成员数显示问题已修复
- ✅ 项目主负责人字段已添加
- ✅ 视角切换功能已简化（2种视角）
- ✅ Prisma 客户端缓存问题已解决
- ✅ Lint 检查通过
- ✅ 功能测试通过

---

## Task ID: 13 - 界面导航功能优化

**日期**: 2025-03-28

**背景**: 用户提出导航功能改进需求 - 当在子页面（实验记录详情或项目详情页）时，可以直接从左侧边栏点击进入其他模块，无需先退出当前页面

### Work Log:

#### 功能改进
- **问题**: 用户在实验详情页或项目详情页时，点击侧边栏其他模块无法跳转，必须先返回列表页
- **解决方案**: 修改导航逻辑，侧边栏点击直接切换模块，当前详情页自动关闭

#### 文档更新
- 更新 `docs/SYSTEM_FEATURES_v3.3.md`
  - 版本状态更新：v3.3 从"规划中"改为"开发中"
  - 新增已完成功能：界面导航 - 全局导航改进（子页面可直接切换模块）
  - 更新记录新增 v2.1 条目

### Stage Summary:
- ✅ 导航功能改进已实现
- ✅ 系统特性文档已更新
- ✅ v3.3 版本开发进行中

---

## Task ID: 14 - AI评分系统调整

**日期**: 2025-03-28

**背景**: 用户提出AI评分系统调整需求，包括评分标准修改、UI简化、关联项目必填

### Work Log:

#### 1. 新评分标准
| 项目 | 分值 | 规则 |
|------|------|------|
| 标题 | 10分 | 填写即得分 |
| 摘要 | 15分 | ≥20字符得满分，否则得10分 |
| 结论 | 15分 | ≥20字符得满分，否则得10分 |
| 关联项目 | 10分 | 关联项目即得分，提交审核必须项 |
| 附件 | 25分 | 基础10分 + 每个附件3分（最多15分额外） |
| AI提取信息 | 10分 | 试剂/仪器/参数/步骤各2.5分 |
| 标签 | 10分 | 填写即得分 |
| **总计** | **100分** | 超过60分允许提交审核 |

#### 2. 后端修改 (`src/app/api/experiments/[id]/submit/route.ts`)
- 重写 `calculateCompletenessScore` 函数
- 新增 `tags` 参数支持
- 修改附件评分逻辑（基础分+增量分）
- 修改AI提取评分逻辑（各2.5分）

#### 3. 前端修改

**ExperimentEditor.tsx:**
- 重写 `calculateCompleteness` 函数
- 新增标签评分计算
- 更新提交审核条件（必须关联项目）
- 简化评分显示UI（紧凑网格布局）

**ExperimentDetail.tsx:**
- 更新评分显示UI
- 更新提交条件检查
- 移除百分比符号（改为整数显示）

**ExperimentList.tsx:**
- 更新评分显示文字（"完整度" → "评分"）
- 移除百分比符号

### 文件变更:
| 文件 | 变更类型 | 说明 |
|------|---------|------|
| src/app/api/experiments/[id]/submit/route.ts | 修改 | 新评分计算函数 |
| src/components/experiments/ExperimentEditor.tsx | 修改 | 评分计算+UI简化 |
| src/components/experiments/ExperimentDetail.tsx | 修改 | 评分显示UI |
| src/components/experiments/ExperimentList.tsx | 修改 | 评分显示文字 |

### Stage Summary:
- ✅ 新评分标准已实现（100分制）
- ✅ 评分UI已简化
- ✅ 关联项目为提交审核必须项
- ✅ Lint检查通过

---

## Task ID: 15 - AI智能提取功能完善

**日期**: 2025-03-28

**背景**: AI智能提取功能存在PDF解析错误，需要修复并完善功能

### Work Log:

#### 1. 问题诊断
通过dev.log发现错误：
```
PDF extraction error: TypeError: pdfParse is not a function
```

问题原因：pdf-parse模块的动态导入方式不正确

#### 2. 后端修复

**`src/app/api/experiments/[id]/extract/route.ts`:**
- 修复模块导入方式，改为顶层导入 `mammoth` 和 `xlsx`
- 新增 `getPdfParse()` 动态导入函数处理pdf-parse
- 改进 `extractTextFromAttachment` 函数的错误处理

**`src/app/api/attachments/route.ts`:**
- 同样修复PDF解析导入问题
- 改进Word、Excel解析的导入方式

#### 3. 前端错误处理增强

**`src/components/experiments/ExtractedInfoPanel.tsx`:**
- 增加错误捕获和用户提示
- 提取失败时显示具体错误信息

**`src/components/experiments/ExperimentEditor.tsx`:**
- 改进 `handleExtract` 函数
- 解析API返回的错误信息并抛出

**`src/components/experiments/ExperimentDetail.tsx`:**
- 更新 `handleExtract` 函数支持选择附件
- 增加错误处理

#### 4. AI提取功能设计说明

**功能流程：**
1. 用户上传附件（Word、PDF、Excel、Markdown等）
2. 在AI提取面板选择要提取的附件（支持多选）
3. 点击"开始AI提取"按钮
4. 系统从附件中提取文本内容
5. 调用AI进行智能分析，提取：
   - 试剂信息（名称、规格、批号、厂家、用量）
   - 仪器设备（名称、型号、设备编号）
   - 关键参数（名称、值、单位）
   - 实验步骤
   - 安全注意事项
   - 内容摘要（可应用到摘要字段）
   - 实验结论（可应用到结论字段）
6. 用户可编辑提取结果
7. 可将提取的摘要/结论应用到实验记录字段

### 文件变更:
| 文件 | 变更类型 | 说明 |
|------|---------|------|
| src/app/api/experiments/[id]/extract/route.ts | 修改 | 修复导入、增强错误处理 |
| src/app/api/attachments/route.ts | 修改 | 修复PDF解析导入 |
| src/components/experiments/ExtractedInfoPanel.tsx | 修改 | 增强错误反馈 |
| src/components/experiments/ExperimentEditor.tsx | 修改 | 改进提取函数 |
| src/components/experiments/ExperimentDetail.tsx | 修改 | 支持选择附件提取 |

### Stage Summary:
- ✅ PDF解析导入错误已修复
- ✅ 所有文件解析功能正常
- ✅ 前端错误反馈增强
- ✅ 支持选择特定附件进行提取
- ✅ Lint检查通过

---

## Task ID: 16 - 修复 .doc 格式文件解析

**日期**: 2025-03-02

**背景**: AI提取功能无法处理旧版 `.doc` 格式的Word文件，用户上传 `iMSC分化SOP_1.doc` 后AI提取失败

### 问题分析

通过dev.log发现错误：
```
[Word] Extraction failed: Error: Could not find the body element: are you sure this is a docx file?
```

**根本原因**: `mammoth` 库只支持 `.docx` 格式（新版Word），不支持 `.doc` 格式（旧版Word）

### 解决方案

使用系统已安装的 `antiword` 命令行工具解析 `.doc` 文件：
- `.docx` 文件继续使用 `mammoth` 库处理
- `.doc` 文件使用 `antiword` 命令行工具处理

### Work Log:

#### 1. 更新 `src/lib/fileParser.ts`
- 将 `extractWordText` 拆分为两个函数：
  - `extractDocxText(buffer)` - 使用 mammoth 处理 .docx 文件
  - `extractDocText(filePath)` - 使用 antiword 处理 .doc 文件
- 更新 `extractText` 函数，区分两种格式调用不同函数
- 添加 `exec` 和 `promisify` 用于执行命令行工具

#### 2. 更新 `src/app/api/attachments/route.ts`
- 新增 `extractDocSummary(filePath)` 函数处理 .doc 文件预览
- 更新 `extractPreviewData` 函数，支持传入文件路径参数
- 修改上传流程：先保存文件再提取预览数据，确保 .doc 文件可用文件路径

### 文件变更:
| 文件 | 变更类型 | 说明 |
|------|---------|------|
| src/lib/fileParser.ts | 重构 | 拆分Word解析函数，支持.doc和.docx |
| src/app/api/attachments/route.ts | 修改 | 支持.doc文件预览提取 |

### 验证测试:
```bash
# 测试 antiword 能正确解析 .doc 文件
antiword "upload/projects/.../iMSC分化SOP_1.doc"
# 输出：iPSC向iMSC分化SOP（包含完整文本内容）
```

### Stage Summary:
- ✅ .doc 格式文件解析问题已修复
- ✅ 使用 antiword 命令行工具处理旧版Word文件
- ✅ .docx 格式继续使用 mammoth 库
- ✅ AI提取功能现已支持 .doc 和 .docx 两种格式
- ✅ Lint检查通过

---

## Task ID: 17 - AI评分系统修复

**日期**: 2025-03-02

**背景**: 用户报告AI评分功能两个问题：
1. 总分不是100分
2. 保存后完整度评分会发生变化

### 问题分析

#### 问题1：满分计算错误
原评分项目总和：
- 标题 10分
- 摘要 15分
- 结论 15分
- 关联项目 10分
- 附件 25分（基础10分 + 每个附件3分，最多15分额外）
- AI提取 10分
- 标签 10分
- **总计：95分（不是100分！）**

#### 问题2：保存后评分变化
后端在计算评分时使用的是旧数据（`experiment.attachments`），如果用户刚上传了附件，这个列表可能不是最新的。

### 解决方案

#### 1. 修正评分标准（满分为100分）
新评分标准：
| 项目 | 分值 | 规则 |
|------|------|------|
| 标题 | 10分 | 填写即得分 |
| 摘要 | 15分 | ≥20字符得满分，否则得10分 |
| 结论 | 15分 | ≥20字符得满分，否则得10分 |
| 关联项目 | 10分 | 关联即得分 |
| 附件 | 30分 | 基础10分 + 每个附件4分（最多20分额外） |
| AI提取 | 10分 | 试剂/仪器/参数/步骤各2.5分 |
| 标签 | 10分 | 填写即得分 |
| **总计** | **100分** | |

#### 2. 修复保存后评分变化
- 后端在计算评分前重新获取最新的附件列表
- 使用 `db.attachment.findMany({ where: { experimentId: id } })` 获取最新数据

### 文件变更:
| 文件 | 变更类型 | 说明 |
|------|---------|------|
| src/lib/completenessScore.ts | 修改 | 更新评分标准，附件30分 |
| src/app/api/experiments/[id]/route.ts | 修改 | 重新获取附件后再计算评分 |
| src/components/experiments/ExperimentEditor.tsx | 修改 | 更新前端评分计算 |
| src/components/experiments/ExperimentDetail.tsx | 修改 | 更新评分显示 |

### Stage Summary:
- ✅ 评分标准已修正为满分100分
- ✅ 附件评分改为：基础10分 + 每个附件4分（最多20分额外）
- ✅ 后端保存时重新获取最新附件数据再计算评分
- ✅ 前后端评分计算逻辑已统一
- ✅ Lint检查通过

---

## Task ID: 18 - v3.3.1 文档审核与更新

**日期**: 2025-03-02

**背景**: 会话恢复后，根据用户要求进行功能模块文档审核，确保文档与实际代码实现一致

### Work Log:

#### 1. 文档审核范围
- `docs/SYSTEM_FEATURES_v3.3.md` - 系统功能规划
- `docs/EXPERIMENT_MODULE.md` - 实验记录模块
- `docs/REVIEW_MODULE.md` - 审核管理模块
- `docs/PROJECT_MODULE.md` - 项目管理模块
- `docs/MY_TASKS_MODULE.md` - 我的任务模块
- `docs/FILE_MANAGEMENT_MODULE.md` - 文件管理模块

#### 2. 文档更新内容

**SYSTEM_FEATURES_v3.3.md:**
- 版本更新为 v2.3
- 新增项目管理模块优化记录（主负责人、全局视角、成员数优化）
- 更新适用版本范围

**PROJECT_MODULE.md:**
- 版本更新为 v3.3.1
- 新增功能定位：全局视角切换、项目主负责人、日期概念分离
- 新增核心概念：项目主负责人、全局视角、普通视角
- 更新 Project 模型数据结构（primaryLeader、expectedEndDate、actualEndDate、completedAt、archivedAt）
- 新增 v3.3.1 变更记录

**MY_TASKS_MODULE.md:**
- 版本更新为 v3.3.1
- 完善版本历史记录
- 添加具体日期

#### 3. 已确认无需更新的文档
- `EXPERIMENT_MODULE.md` - 已包含最新评分规则和.doc支持
- `REVIEW_MODULE.md` - 已包含60分提交要求
- `FILE_MANAGEMENT_MODULE.md` - 已包含.doc文件支持

### Stage Summary:
- ✅ 所有模块文档已审核完成
- ✅ 3个文档已更新
- ✅ 文档版本号已统一更新为 v3.3.1
- ✅ 变更记录已完善

---

## Task ID: 19 - v3.3.5 视角切换功能修复

**日期**: 2025-03-05

**背景**: 用户反馈项目管理和实验记录模块的普通/全局视角切换功能存在逻辑问题，实际没有区分开

### 问题分析

#### 问题1：ExperimentList.tsx 视角切换无效
- **位置**: `src/components/experiments/ExperimentList.tsx` 第122-132行
- **问题**: 全局视角和普通视角的过滤逻辑完全相同，视角切换没有任何效果
- **原因**: 组件使用 AppContext 的 experiments 数据，而非独立的本地状态

#### 问题2：ExperimentList 数据源依赖 AppContext
- **问题**: AppContext 的 refreshData 函数调用 API 时不传递任何视角参数
- **结果**: 管理员始终获取全局视角数据，切换到普通视角时数据没有变化

#### 问题3：API 参数设计不一致
- projects API 使用 `viewMode=default|global` 参数
- experiments API 使用 `globalView=true|false` 参数
- 两套不同的参数命名和默认行为逻辑

#### 问题4：ProjectList.tsx 初始化双重请求
- 初始值 viewMode='default'
- useEffect 中检查管理员后切换到 'global'
- 导致产生两次 API 请求

#### 问题5：MyTasks.tsx 同样存在双重请求问题
- 与 ProjectList 相同的模式

### Work Log:

#### 1. 修复 ExperimentList.tsx
- 移除对 AppContext.experiments 的依赖
- 添加本地 experiments 状态
- 新增 loadExperiments 函数，根据视角调用 API
- 统一使用 viewMode 参数

#### 2. 修复 experiments API
- 统一使用 `viewMode` 参数
- 兼容旧的 `globalView` 参数
- 管理员无参数时默认使用全局视角

#### 3. 修复 ProjectList.tsx
- 使用函数形式的初始值，直接在初始化时判断管理员角色
- 避免双重请求问题

#### 4. 修复 MyTasks.tsx
- 移除对 AppContext 的 experiments 和 projects 依赖
- 添加本地状态管理
- 添加 loadData 函数并行获取实验和项目数据
- 使用函数形式的初始值避免双重请求

### 文件变更:
| 文件 | 变更类型 | 说明 |
|------|---------|------|
| src/components/experiments/ExperimentList.tsx | 重构 | 独立数据获取，视角切换逻辑修复 |
| src/app/api/experiments/route.ts | 修改 | 统一viewMode参数，兼容旧参数 |
| src/components/projects/ProjectList.tsx | 修改 | 修复初始化双重请求问题 |
| src/components/tasks/MyTasks.tsx | 重构 | 独立数据获取，视角切换逻辑修复 |

### Stage Summary:
- ✅ ExperimentList 视角切换功能修复
- ✅ experiments API 参数统一
- ✅ ProjectList 初始化优化
- ✅ MyTasks 视角切换功能完善
- ✅ Lint 检查通过
- ✅ 应用运行正常

---

## Task ID: 20 - v3.3.6 审核历史功能恢复

**日期**: 2025-03-05

**背景**: 会话恢复后发现版本回退，ReviewHistory.tsx 组件不存在，需要恢复审核历史功能

### 问题分析

- **问题**: `ReviewHistory.tsx` 组件文件不存在
- **影响**: 实验详情页无法显示审核历史记录
- **原因**: 版本回退导致代码丢失

### Work Log:

#### 1. 更新 experiments API (`src/app/api/experiments/route.ts`)
- 添加 `reviewRequests` 数据查询（三个位置）
- 在数据转换中添加 `reviewRequests` 字段返回

#### 2. 创建 ReviewHistory.tsx 组件 (`src/components/experiments/ReviewHistory.tsx`)
- 简化的审核历史展示
- 每个动作独立卡片（带背景色边框）
- 向上箭头（↑）指示时间顺序
- 锁定状态显示附件数量
- 区分解锁操作类型（申请解锁/批准解锁/拒绝解锁）
- 提交审核显示"提交给：XXX（角色）"
- 转交审核显示"转交给：XXX（角色）"

#### 3. 更新 ExperimentDetail.tsx
- 导入 ReviewHistory 组件
- 替换原有审核信息区域为 ReviewHistory 组件
- 传递必要参数：reviewFeedbacks、reviewRequests、reviewStatus、reviewedAt、attachmentCount

#### 4. 更新 AppContext.tsx 类型定义
- 新增 `ReviewRequest` 接口
- 更新 `ReviewFeedback.action` 支持更多操作类型
- Experiment 接口新增 `reviewFeedbacks` 和 `reviewRequests` 可选字段

### 文件变更:
| 文件 | 变更类型 | 说明 |
|------|---------|------|
| src/app/api/experiments/route.ts | 修改 | 添加 reviewRequests 查询和返回 |
| src/components/experiments/ReviewHistory.tsx | 新建 | 审核历史展示组件 |
| src/components/experiments/ExperimentDetail.tsx | 修改 | 集成审核历史组件 |
| src/contexts/AppContext.tsx | 修改 | 新增 ReviewRequest 类型 |

### Stage Summary:
- ✅ API 返回 reviewRequests 数据
- ✅ ReviewHistory 组件创建完成
- ✅ ExperimentDetail 集成审核历史
- ✅ AppContext 类型定义更新
- ✅ Lint 检查通过
- ✅ 应用运行正常

---
Task ID: 1
Agent: Main Agent
Task: 修复实验记录保存时的导出错误

Work Log:
- 分析错误日志：发现 `experiment-migration.ts` 导入的函数在 `file-path.ts` 中不存在
- 缺失的函数：`ensureDirectoryExists`, `generateLinkFilePath`, `getProjectExperimentsDir`
- 在 `file-path.ts` 中添加了缺失的导出函数
- 修复了 Turbopack 缓存问题（删除 .next 目录后服务器崩溃）
- 重启开发服务器验证修复

Stage Summary:
- 问题原因：`experiment-migration.ts` 导入了 `file-path.ts` 中不存在的函数
- 解决方案：
  1. 导出 `ensureDirectoryExists` 函数
  2. 添加 `getProjectExperimentsDir` 函数
  3. 添加 `generateLinkFilePath` 函数
- 服务器已恢复运行，API 正常响应

---
Task ID: 2
Agent: Main Agent
Task: 修复提交审核时显示"暂无可用的审核人"的问题

Work Log:
- 分析问题：用户报告提交审核时显示"暂无可用的审核人"，但项目中设置了多个项目负责人
- 检查数据库结构：发现 `Project` 有两个相关字段
  - `members: User[]` - 多对多关系，直接关联用户
  - `projectMembers: ProjectMember[]` - 一对多关系，包含 `role` 字段
- 发现 bug：API 代码使用 `project.members` 查询 `role: 'PROJECT_LEAD'`，但 `members` 是 `User[]`，没有 `role` 字段
- 修复：将 `members` 改为 `projectMembers`
- 验证：测试脚本确认现在可以正确获取项目负责人作为审核人

Stage Summary:
- 问题原因：API 使用错误的字段名 `members` 而不是 `projectMembers`
- 解决方案：修改 `/api/experiments/[id]/reviewers/route.ts` 中的查询
  - `members` → `projectMembers`
- 验证结果：审核人列表现在可以正确显示 PI、研究员等项目负责人
