# BioLab ELN 实验记录模块说明文档

> **版本**: v3.3  
> **最后更新**: 2025-03-02  
> **维护者**: 开发团队

---

## 目录

1. [模块概述](#1-模块概述)
2. [数据模型](#2-数据模型)
3. [API端点详解](#3-api端点详解)
4. [业务逻辑](#4-业务逻辑)
5. [权限控制](#5-权限控制)
6. [文件存储](#6-文件存储)
7. [完整度评分](#7-完整度评分)
8. [附件处理](#8-附件处理)
9. [变更记录](#9-变更记录)

---

## 1. 模块概述

### 1.1 功能定位

实验记录模块是ELN系统的核心功能，提供：

- 实验记录的创建、编辑、删除
- 实验内容管理（标题、摘要、结论、标签）
- 文件附件上传和预览
- AI智能信息提取
- 审核流程支持
- 多项目关联

### 1.2 核心概念

| 概念 | 说明 |
|------|------|
| **暂存实验** | 未关联项目的实验，存储在用户暂存区 |
| **项目实验** | 关联到项目的实验，存储在项目目录 |
| **多项目关联** | 一个实验可同时关联多个项目 |
| **审核状态** | 草稿 → 待审核 → 已锁定/需修改 |

---

## 2. 数据模型

### 2.1 Experiment 模型

```prisma
model Experiment {
  id                 String            @id @default(cuid())
  title              String
  summary            String?
  conclusion         String?
  
  // AI提取信息
  extractedInfo      String?           // JSON格式
  extractionStatus   ExtractionStatus  @default(PENDING)
  extractionError    String?
  
  // 审核相关
  reviewStatus       ReviewStatus      @default(DRAFT)
  completenessScore  Int               @default(0)  // 0-100
  
  // 存储位置
  storageLocation    String?           // "draft" | 项目ID
  primaryProjectId   String?           // 主存储项目ID
  
  tags               String?
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt
  submittedAt        DateTime?
  reviewedAt         DateTime?
  
  // 关联
  authorId           String
  author             User              @relation(...)
  experimentProjects ExperimentProject[]
  attachments        Attachment[]
  reviewFeedbacks    ReviewFeedback[]
  reviewRequests     ReviewRequest[]
  versions           ExperimentVersion[]
  
  @@map("experiments")
}
```

### 2.2 Attachment 模型

```prisma
model Attachment {
  id            String              @id @default(cuid())
  name          String              // 原始文件名
  type          String              // MIME类型
  size          Int                 // 文件大小(字节)
  path          String              // 相对存储路径
  category      AttachmentCategory  @default(DOCUMENT)
  extractedText String?             // 预览数据(JSON)
  createdAt     DateTime            @default(now())
  
  experimentId  String
  experiment    Experiment          @relation(...)
  uploaderId    String
  uploader      User                @relation(...)
  
  @@map("attachments")
}
```

### 2.3 枚举定义

#### ReviewStatus（审核状态）

| 值 | 说明 | 可编辑 |
|------|------|:------:|
| `DRAFT` | 草稿 | ✅ |
| `PENDING_REVIEW` | 待审核 | ❌ |
| `NEEDS_REVISION` | 需要修改 | ✅ |
| `LOCKED` | 已锁定 | ❌ |

#### ExtractionStatus（提取状态）

| 值 | 说明 |
|------|------|
| `PENDING` | 待处理 |
| `PROCESSING` | 处理中 |
| `COMPLETED` | 已完成 |
| `FAILED` | 失败 |

#### AttachmentCategory（附件类别）

| 值 | 扩展名 |
|------|--------|
| `DOCUMENT` | .doc, .docx, .pdf, .txt, .md, .tex |
| `DATA_FILE` | .xls, .xlsx, .csv |
| `IMAGE` | .png, .jpg, .jpeg, .gif, .bmp |
| `RAW_DATA` | 原始数据文件 |
| `LOCKED_PDF` | 锁定后的PDF |
| `OTHER` | 其他类型 |

---

## 3. API端点详解

### 3.1 获取实验列表

**端点**: `GET /api/experiments`

**查询参数**:

| 参数 | 类型 | 默认值 | 说明 |
|------|------|-------|------|
| `globalView` | boolean | false | 管理员全局视角 |
| `draftsOnly` | boolean | false | 仅获取暂存实验 |
| `projectRelated` | boolean | false | 仅获取项目实验 |

**权限逻辑**:
- 管理员使用 `globalView=true` 可查看所有实验
- 普通用户：参与项目内的实验 + 自己的暂存实验

**响应示例**:
```json
[{
  "id": "clx123...",
  "title": "细胞培养实验",
  "summary": "实验摘要内容...",
  "reviewStatus": "DRAFT",
  "completenessScore": 65,
  "author": { "id": "...", "name": "张三", "email": "..." },
  "projects": [...],
  "attachments": [...],
  "createdAt": "2025-03-01T10:00:00Z"
}]
```

### 3.2 创建实验

**端点**: `POST /api/experiments`

**请求体**:
```json
{
  "title": "实验标题",          // 必填
  "summary": "实验摘要",
  "conclusion": "实验结论",
  "tags": "标签1,标签2",
  "projectIds": ["proj1", "proj2"]  // 可选
}
```

**业务逻辑**:
- 无 `projectIds` → 创建暂存实验 (`storageLocation: 'draft'`)
- 有 `projectIds` → 创建项目实验，存储位置为主项目ID
- 自动计算完整度评分

### 3.3 获取实验详情

**端点**: `GET /api/experiments/[id]`

**权限**: 需登录，可访问的实验

**响应**: 包含完整的实验信息、项目成员角色等

### 3.4 更新实验

**端点**: `PUT /api/experiments/[id]`

**请求体**:
```json
{
  "title": "新标题",
  "summary": "新摘要",
  "conclusion": "新结论",
  "tags": "新标签",
  "projectIds": ["newProj1"]
}
```

**状态限制**: 只有 `DRAFT` 和 `NEEDS_REVISION` 状态可编辑

**项目关联变更**:
- 暂存实验关联项目 → 文件迁移到项目目录
- 多项目关联 → 创建 `.link` 引用文件

### 3.5 删除实验

**端点**: `DELETE /api/experiments/[id]`

**限制**:
- `LOCKED` 状态不可删除
- 删除时同步删除物理文件和空目录

### 3.6 提交审核

**端点**: `POST /api/experiments/[id]/submit`

**前置条件**:

| 条件 | 要求 |
|------|------|
| 权限 | 仅作者可提交 |
| 状态 | `DRAFT` 或 `NEEDS_REVISION` |
| 存储位置 | 必须关联项目 |
| 完整度 | ≥30分 |

**状态变更**: `DRAFT/NEEDS_REVISION` → `PENDING_REVIEW`

---

## 4. 业务逻辑

### 4.1 状态流转图

```
┌─────────┐     提交审核      ┌────────────────┐
│  DRAFT  │ ────────────────▶ │ PENDING_REVIEW │
└─────────┘                   └────────────────┘
     ▲                              │
     │                              │
     │         ┌────────────────────┴────────────────────┐
     │         │                                         │
     │    解锁(管理员)                              要求修改
     │         │                                         │
     │         ▼                                         ▼
     │  ┌─────────┐                              ┌────────────────┐
     └──│ LOCKED  │◄─────── 审核通过 ────────────│ NEEDS_REVISION │
        └─────────┘                              └────────────────┘
                                                      │
                                                      │ 修改后重新提交
                                                      └──────────▶ ...
```

### 4.2 项目关联规则

| 场景 | 存储位置 | 文件处理 |
|------|---------|---------|
| 无项目关联 | `draft` | 存储在用户暂存区 |
| 单项目关联 | 项目ID | 存储在项目目录 |
| 多项目关联 | 主项目ID | 主项目存储 + 其他项目 `.link` 文件 |

### 4.3 实验迁移逻辑

当暂存实验关联项目时：
1. 验证用户对项目的权限
2. 创建实验目录
3. 移动物理文件到项目目录
4. 更新数据库路径记录
5. 清理空目录

---

## 5. 权限控制

### 5.1 权限矩阵

| 操作 | SUPER_ADMIN | ADMIN | PROJECT_LEAD | MEMBER | VIEWER | 作者 |
|------|:-----------:|:-----:|:------------:|:------:|:------:|:----:|
| 全局视角查看 | ✅ | ✅ | ❌ | ❌ | ❌ | - |
| 创建实验 | ✅ | ✅ | ✅ | ✅ | ❌ | - |
| 查看实验 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 编辑实验 | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| 删除实验 | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| 提交审核 | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| 审核实验 | ✅ | ✅ | ✅(非自己) | ❌ | ❌ | ❌ |
| 解锁实验 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### 5.2 权限检查函数

```typescript
// 检查是否可编辑实验
export async function canEditExperiment(userId: string, experimentId: string): Promise<boolean> {
  const experiment = await db.experiment.findUnique({
    where: { id: experimentId },
    select: { authorId: true, reviewStatus: true }
  })
  
  if (!experiment) return false
  if (experiment.reviewStatus === 'LOCKED') return false
  if (experiment.authorId === userId) return true
  
  const user = await db.user.findUnique({ where: { id: userId } })
  return user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
}

// 检查是否可查看实验
export async function canViewExperiment(userId: string, experimentId: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return true
  
  const experiment = await db.experiment.findUnique({
    where: { id: experimentId },
    select: { authorId: true, experimentProjects: true }
  })
  
  if (experiment?.authorId === userId) return true
  
  // 检查是否为项目成员
  for (const ep of experiment.experimentProjects) {
    const role = await getProjectRole(userId, ep.projectId)
    if (role) return true
  }
  
  return false
}
```

---

## 6. 文件存储

### 6.1 存储路径规则

**暂存区路径**:
```
upload/users/{用户ID}/drafts/{日期}_{实验标题}/{日期}_{原始文件名}.{扩展名}
```

**项目存储路径**:
```
upload/projects/{项目名称}/experiments/{日期}_{实验标题}/{日期}_{原始文件名}.{扩展名}
```

**跨项目链接文件**:
```
upload/projects/{项目名称}/experiments/{实验ID}.link
```

### 6.2 文件命名处理

```typescript
function sanitizeName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')  // 移除不允许的字符
    .replace(/\s+/g, '_')           // 空格替换为下划线
    .slice(0, 100)                  // 限制长度
}
```

### 6.3 冲突处理

```typescript
function getUniqueFilename(dir: string, filename: string): string {
  let finalName = filename
  let counter = 1
  
  while (fs.existsSync(path.join(dir, finalName))) {
    const ext = path.extname(filename)
    const baseName = path.basename(filename, ext)
    finalName = `${baseName}_${counter}${ext}`
    counter++
  }
  
  return finalName
}
```

---

## 7. 完整度评分

### 7.1 评分规则（v3.3 更新）

| 评分项 | 满分 | 条件 |
|--------|------|------|
| 标题 | 10分 | 有标题即得分 |
| 摘要 | 15分 | ≥20字满分，<20字得10分 |
| 结论 | 15分 | ≥20字满分，<20字得10分 |
| 关联项目 | 10分 | 有项目关联即得分，**提交审核必须项** |
| 附件 | 30分 | 基础15分 + 每个附件5分（最多15分额外） |
| AI提取信息 | 10分 | 试剂(2.5) + 仪器(2.5) + 参数(2.5) + 步骤(2.5) |
| 标签 | 10分 | 有标签即得分 |
| **总计** | **100分** | - |

### 7.2 提交要求

- **最低完整度**: 60分
- **必须关联项目**: 无项目关联不能提交审核
- 不满足则无法提交审核

---

## 8. 附件处理

### 8.1 上传限制

| 项目 | 限制 |
|------|------|
| 单文件大小 | 最大 50MB |
| 支持格式 | Word (.doc/.docx), PDF, Excel, 图片, 文本 |

### 8.2 预览数据提取（v3.3 更新）

| 文件类型 | 提取方式 | 提取内容 |
|---------|---------|---------|
| Word (.docx) | mammoth | 文本内容 |
| Word (.doc) | antiword | 文本内容（v3.3新增） |
| PDF | pdf2json | 文本内容 |
| Excel (.xlsx/.xls) | xlsx | 表头和样本数据 |
| Markdown/Text | 直接读取 | 全部内容 |
| 图片 | - | 不提取 |

### 8.3 附件API

**上传附件**: `POST /api/attachments`
- Content-Type: `multipart/form-data`
- 字段: `file`, `experimentId`

**获取附件列表**: `GET /api/attachments?experimentId=xxx`

**删除附件**: `DELETE /api/attachments/[id]`

---

## 9. 变更记录

### v3.3 (2025-03-02)

**功能修复**:
- [x] 修复AI评分满分不是100分的问题
- [x] 修复保存后评分变化的问题
- [x] 支持 .doc 格式文件解析（使用 antiword）

**评分规则调整**:
- 附件评分：基础15分 + 每个附件5分（最多15分额外）
- AI提取评分：试剂/仪器/参数/步骤各2.5分
- 新增标签评分：10分

### v3.3 (2025-03-01)

**新增功能**:
- [x] 暂存实验支持
- [x] 多项目关联
- [x] 文件存储结构重构
- [x] AI信息提取
- [x] 完整度评分系统

**修改文件**:
- `src/app/api/experiments/route.ts`
- `src/app/api/experiments/[id]/route.ts`
- `src/app/api/experiments/[id]/submit/route.ts`
- `src/app/api/attachments/route.ts`
- `src/lib/file-path.ts`
- `src/lib/experiment-migration.ts`

**依赖新增**:
- `mammoth` - Word文档解析
- `pdf-parse` - PDF解析
- `xlsx` - Excel解析

---

## 附录

### A. 相关文件清单

```
src/
├── app/api/
│   ├── experiments/
│   │   ├── route.ts                 # 实验列表/创建
│   │   └── [id]/
│   │       ├── route.ts             # 详情/更新/删除
│   │       ├── submit/route.ts      # 提交审核
│   │       └── review/route.ts      # 审核操作
│   └── attachments/
│       └── route.ts                 # 附件管理
│
├── lib/
│   ├── file-path.ts                 # 文件路径工具
│   ├── experiment-migration.ts      # 实验迁移服务
│   └── permissions.ts               # 权限检查
│
└── components/
    └── experiments/
        └── ExperimentForm.tsx       # 实验表单组件

prisma/
└── schema.prisma                    # 数据模型定义
```

### B. 错误码说明

| HTTP状态码 | 错误信息 | 原因 |
|-----------|---------|------|
| 400 | 标题不能为空 | 创建实验未提供标题 |
| 400 | 完整度不足 | 完整度评分低于30分 |
| 401 | 未登录 | Token无效或过期 |
| 403 | 无权限编辑此实验 | 非作者且非管理员 |
| 403 | 实验已锁定，无法编辑 | LOCKED状态 |
| 403 | 实验必须关联项目才能提交审核 | 暂存实验 |
| 404 | 实验不存在 | ID无效 |

---

> **注意**: 本文档应随模块变更及时更新。如发现文档与实际实现不符，请以代码为准并更新文档。
