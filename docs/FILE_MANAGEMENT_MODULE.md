# BioLab ELN 文件管理模块说明文档

> **版本**: v3.3  
> **最后更新**: 2025-03-02  
> **维护者**: 开发团队

---

## 目录

1. [模块概述](#1-模块概述)
2. [功能列表](#2-功能列表)
3. [存储结构](#3-存储结构)
4. [权限控制](#4-权限控制)
5. [API端点详解](#5-api端点详解)
6. [前端组件](#6-前端组件)
7. [孤立文件处理](#7-孤立文件处理)
8. [下载规则](#8-下载规则)
9. [核心工具函数](#9-核心工具函数)
10. [变更记录](#10-变更记录)

---

## 1. 模块概述

### 1.1 设计目标

文件管理模块旨在为超级管理员和管理员提供一个**只读监控**视角的文件管理界面，核心功能包括：

- **存储情况预览**：查看系统整体存储占用情况
- **目录浏览**：按项目/用户浏览文件目录结构
- **快速查找**：搜索项目或实验记录
- **选择下载**：支持勾选文件/文件夹进行打包下载
- **孤立文件处理**：检测和清理残留文件

### 1.2 设计原则

| 原则 | 说明 |
|------|------|
| **只读为主** | 文件管理模块主要用于查看，不提供直接编辑/删除功能 |
| **数据一致性优先** | 避免后台直接操作文件导致数据库记录不一致 |
| **灵活下载** | 支持勾选任意文件/文件夹进行打包下载 |
| **孤立文件安全处理** | 仅超级管理员可查看和清理孤立文件 |

### 1.3 技术栈

- **后端**: Next.js API Routes + Prisma ORM
- **前端**: React + shadcn/ui + Tailwind CSS
- **文件操作**: Node.js fs 模块
- **打包下载**: archiver 库

---

## 2. 功能列表

### 2.1 功能矩阵

| 功能 | SUPER_ADMIN | ADMIN | 说明 |
|------|:-----------:|:-----:|------|
| 查看全局存储统计 | ✅ | ✅ | 总存储空间、项目数、附件数等 |
| 浏览项目文件目录 | ✅ | ✅ | 按项目查看文件树 |
| 浏览用户暂存区 | ✅ | ✅ | 按用户查看暂存文件 |
| 快速查找项目/实验 | ✅ | ✅ | 搜索并跳转 |
| 勾选文件/文件夹 | ✅ | ❌ | 支持多选和半选状态 |
| 打包下载选中文件 | ✅ | ❌ | 打包下载勾选的文件 |
| 查看孤立文件 | ✅ | ❌ | 扫描残留文件 |
| 清理孤立文件 | ✅ | ❌ | 安全删除残留文件 |

### 2.2 界面结构

```
┌─────────────────────────────────────────────────────────┐
│ 文件管理                                                 │
├─────────────────────────────────────────────────────────┤
│ 全局存储统计                                              │
│ [总存储空间] [项目数量] [附件数量] [暂存实验]              │
├─────────────────────────────────────────────────────────┤
│ 快速查找                                                 │
│ [搜索项目或实验记录...]                                   │
├─────────────────────────────────────────────────────────┤
│ Tab: [项目文件] [用户暂存区] [孤立文件]                   │
│                                                         │
│ 选择操作栏（仅超级管理员可见）:                            │
│ [全选] [清除选择] | 已选择 X 个文件 (Y MB) [打包下载]      │
│                                                         │
│ 各Tab内容（带复选框）:                                    │
│ ☐ 📁 项目目录                                            │
│   ☑ 📄 文件1.pdf (1.2 MB)                               │
│   ☐ 📄 文件2.xlsx (500 KB)                              │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 存储结构

### 3.1 目录层级设计

```
upload/
├── projects/                          # 项目存储区
│   └── {项目名称}/                     # 按项目名组织
│       └── experiments/               # 实验记录目录
│           └── {日期}_{实验标题}/      # 按实验组织
│               └── {日期}_{原始文件名}.{扩展名}
│
├── users/                             # 用户暂存区
│   └── {用户ID}/                      # 按用户组织
│       └── drafts/                    # 暂存实验目录
│           └── {日期}_{实验标题}/      # 按实验组织
│               └── {日期}_{原始文件名}.{扩展名}
│
├── files/                             # 统一存储区（新）
│   └── {时间戳}_{随机ID}.{扩展名}
│
└── images/                            # 图片存储区（新）
    └── {时间戳}_{随机ID}.{扩展名}
```

### 3.2 文件命名规则

| 组成部分 | 格式 | 示例 |
|---------|------|------|
| 日期前缀 | YYYYMMDD | 20250301 |
| 实验标题 | 清理后的原始标题 | 蛋白质纯化实验 |
| 原始文件名 | 保留原始名称 | 实验数据.xlsx |
| **完整示例** | - | `20250301_蛋白质纯化实验/20250301_实验数据.xlsx` |

### 3.3 文件名清理规则

```typescript
// src/lib/file-path.ts
function sanitizeName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')  // 移除不允许的字符
    .replace(/\s+/g, '_')           // 空格替换为下划线
    .slice(0, 100)                  // 限制长度100字符
}
```

### 3.4 路径生成函数

| 函数名 | 用途 | 返回值 |
|--------|------|--------|
| `generateDraftFilePath()` | 生成暂存区文件路径 | `{ fullPath, relativePath, directory }` |
| `generateProjectFilePath()` | 生成项目文件路径 | `{ fullPath, relativePath, directory }` |
| `getUserDraftsDir()` | 获取用户暂存区根目录 | 完整路径 |
| `getProjectDir()` | 获取项目根目录 | 完整路径 |

---

## 4. 权限控制

### 4.1 访问权限

| 端点 | 权限要求 |
|------|---------|
| `/api/admin/files/stats` | `SUPER_ADMIN` 或 `ADMIN` |
| `/api/admin/files/tree` | `SUPER_ADMIN` 或 `ADMIN` |
| `/api/admin/files/download` | **仅 `SUPER_ADMIN`** |
| `/api/admin/files/batch-download` | **仅 `SUPER_ADMIN`** |
| `/api/admin/files/search` | `SUPER_ADMIN` 或 `ADMIN` |
| `/api/admin/files/orphaned` (GET) | **仅 `SUPER_ADMIN`** |
| `/api/admin/files/orphaned` (DELETE) | **仅 `SUPER_ADMIN`** |

### 4.2 功能权限矩阵

| 功能 | SUPER_ADMIN | ADMIN |
|------|:-----------:|:-----:|
| 查看存储统计 | ✅ | ✅ |
| 浏览目录树 | ✅ | ✅ |
| 快速查找项目/实验 | ✅ | ✅ |
| 勾选文件/文件夹 | ✅ | ❌ |
| 打包下载选中文件 | ✅ | ❌ |
| 查看孤立文件 | ✅ | ❌ |
| 清理孤立文件 | ✅ | ❌ |

> **安全说明**：为保护实验数据安全，文件下载和勾选功能仅对超级管理员开放。ADMIN可查看存储统计和目录结构，但不能下载文件。

### 4.3 权限检查代码

```typescript
// 查看权限检查（SUPER_ADMIN 或 ADMIN）
const user = await db.user.findUnique({
  where: { id: userId },
  select: { role: true }
})

if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
  return NextResponse.json({ error: '无权限访问' }, { status: 403 })
}

// 下载权限检查（仅 SUPER_ADMIN）
if (!user || user.role !== 'SUPER_ADMIN') {
  return NextResponse.json({ error: '无权限访问，仅超级管理员可下载文件' }, { status: 403 })
}
```

---

## 5. API端点详解

### 5.1 存储统计 API

**端点**: `GET /api/admin/files/stats`

**权限**: `SUPER_ADMIN`, `ADMIN`

**返回数据结构**:

```typescript
interface FileStatsResponse {
  // 项目统计列表
  projects: {
    id: string
    name: string
    status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
    size: number
    sizeFormatted: string
    fileCount: number
    experimentCount: number
  }[]
  
  // 用户暂存区统计列表
  userDrafts: {
    userId: string
    userName: string
    userEmail: string
    size: number
    sizeFormatted: string
    fileCount: number
    draftCount: number
  }[]
  
  // 暂存区汇总
  drafts: {
    size: number
    sizeFormatted: string
    fileCount: number
    userCount: number
    totalDrafts: number
  }
  
  // 总体汇总
  summary: {
    totalSize: number
    totalSizeFormatted: string
    totalFiles: number
    projectCount: number
  }
  
  // 数据库统计
  database: {
    totalAttachments: number
    totalExperiments: number
    totalProjects: number
    draftExperiments: number
  }
  
  // 当前用户角色（用于前端权限判断）
  currentUserRole: 'SUPER_ADMIN' | 'ADMIN' | 'RESEARCHER'
}
```

### 5.2 目录树 API

**端点**: `GET /api/admin/files/tree`

**权限**: `SUPER_ADMIN`, `ADMIN`

**查询参数**:

| 参数 | 类型 | 默认值 | 说明 |
|------|------|-------|------|
| `type` | string | `all` | `all` / `projects` / `drafts` |
| `projectId` | string | - | 指定项目ID |
| `depth` | number | `4` | 目录树深度 |

**返回数据结构**:

```typescript
interface FileTreeResponse {
  type: string
  data: {
    type: 'project' | 'draft'
    name: string
    path: string        // 相对路径，如 "upload/users/xxx"
    tree: FileNode[]
  }[]
}

interface FileNode {
  name: string
  type: 'file' | 'directory'
  size?: number
  sizeFormatted?: string
  modifiedAt?: string
  path: string          // 相对路径
  children?: FileNode[]
}
```

### 5.3 批量下载 API（新增）

**端点**: `POST /api/admin/files/batch-download`

**权限**: **仅 `SUPER_ADMIN`**

**请求体**:

```typescript
interface BatchDownloadRequest {
  paths: {
    path: string           // 文件/文件夹路径（相对或绝对路径）
    type: 'file' | 'directory'
  }[]
  downloadName: string     // 下载文件名（不含扩展名）
}
```

**路径格式支持**:

| 格式 | 示例 | 处理方式 |
|------|------|---------|
| 相对路径（推荐） | `upload/users/xxx/file.pdf` | 自动转换为绝对路径 |
| 绝对路径 | `/home/z/my-project/upload/users/xxx/file.pdf` | 直接使用 |

**返回**: ZIP 文件流

**响应头**:
```
Content-Type: application/zip
Content-Disposition: attachment; filename="selected_files_2025-03-01.zip"
```

**限制**:
- 单次下载总大小上限：2GB
- 仅允许下载 `upload/` 目录下的文件
- 自动跳过不存在或无权限的路径

**示例请求**:

```typescript
// 勾选了两个文件和一个文件夹
const response = await fetch('/api/admin/files/batch-download', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paths: [
      { path: 'upload/users/user123/drafts/exp1/file1.pdf', type: 'file' },
      { path: 'upload/users/user123/drafts/exp2', type: 'directory' },
      { path: 'upload/projects/项目A/experiments/exp3', type: 'directory' }
    ],
    downloadName: 'selected_files_2025-03-01'
  })
})
```

### 5.4 搜索 API

**端点**: `GET /api/admin/files/search`

**权限**: `SUPER_ADMIN`, `ADMIN`

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string | 搜索关键词 |
| `type` | string | `all` / `projects` / `experiments` |

**返回数据结构**:

```typescript
interface SearchResponse {
  query: string
  totalResults: number
  results: {
    type: 'project' | 'experiment'
    id: string
    title: string
    projectId?: string
    projectName?: string
    storageLocation?: string
    userId?: string
    userName?: string
    attachmentCount: number
    createdAt: string
    updatedAt: string
  }[]
}
```

### 5.5 孤立文件 API

**端点**: `GET /api/admin/files/orphaned`

**权限**: **仅 `SUPER_ADMIN`**

**检测范围**:

| 目录 | 检测内容 |
|------|---------|
| `upload/users/` | 用户目录存在但用户已删除；文件存在但无附件记录 |
| `upload/projects/` | 项目目录存在但项目已删除；文件存在但无附件记录 |
| `upload/files/` | 文件存在但无附件记录 |
| `upload/images/` | 图片存在但无附件记录 |

**返回数据结构**:

```typescript
interface OrphanedResponse {
  summary: {
    totalOrphanedFiles: number
    totalSize: number
    totalSizeFormatted: string
    byType: {
      userDeleted: { count: number; fileCount: number; size: number }
      projectOrphan: { count: number; fileCount: number; size: number }
      attachmentOrphan: { count: number; size: number }
    }
  }
  orphanedFiles: OrphanedFile[]
  orphanedDirectories: OrphanedDirectory[]
  hasMore: boolean
}
```

**端点**: `DELETE /api/admin/files/orphaned`

**权限**: 仅 `SUPER_ADMIN`

**请求体**:

```typescript
{
  paths: string[]        // 可选，指定路径
  type: 'all' | 'user_deleted' | 'project_orphan' | 'attachment_orphan'
}
```

---

## 6. 前端组件

### 6.1 组件位置

```
src/components/admin/FileManager.tsx
src/components/ui/checkbox.tsx        # 支持indeterminate状态
```

### 6.2 组件结构

```typescript
export function FileManager() {
  // 数据状态
  const [stats, setStats] = useState<FileStats | null>(null)
  const [treeData, setTreeData] = useState<FileTreeData[]>([])
  const [orphanedData, setOrphanedData] = useState<OrphanedData | null>(null)
  
  // 用户角色状态（用于权限判断）
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN'
  
  // 文件选择状态（新增）
  const [selectedPaths, setSelectedPaths] = useState<Map<string, SelectedPath>>(new Map())
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  
  // 弹窗状态
  const [showCleanupDialog, setShowCleanupDialog] = useState(false)
  
  // 选中文件统计
  const selectedStats = useMemo(() => {
    // 计算选中文件数量和总大小
  }, [selectedPaths, treeData])
}
```

### 6.3 子组件

| 组件名 | 用途 |
|--------|------|
| `SelectableFileTreeNode` | 可选择的文件树节点，支持复选框 |
| `SearchResultItem` | 渲染搜索结果项 |

### 6.4 选择功能

**复选框状态**:

| 状态 | 显示 | 说明 |
|------|------|------|
| `unchecked` | ☐ 空白 | 未选中 |
| `checked` | ☑ 勾号 | 全部选中 |
| `indeterminate` | ➖ 减号 | 部分子项选中 |

**选择逻辑**:

```typescript
// 点击文件夹：选中/取消选中所有子文件
const handleToggleSelect = (node: FileNode, checked: boolean) => {
  if (node.type === 'file') {
    // 文件：直接切换状态
  } else {
    // 目录：递归操作所有子文件
    const allPaths = getAllNodePaths(node)
    for (const p of allPaths) {
      if (p.type === 'file') {
        // 添加或删除
      }
    }
  }
}
```

### 6.5 事件处理

| 事件 | 处理函数 | 说明 |
|------|---------|------|
| 刷新数据 | `handleRefresh()` | 重新加载所有数据 |
| 切换选择 | `handleToggleSelect()` | 切换文件/文件夹选中状态 |
| 全选 | `handleSelectAll()` | 选中当前Tab所有文件 |
| 清除选择 | `handleClearSelection()` | 清除所有选中 |
| 打包下载 | `handleBatchDownload()` | 下载选中的文件 |
| 搜索 | `handleSearch()` | 防抖搜索 |
| 清理孤立文件 | `handleCleanupOrphaned()` | 调用DELETE API |

### 6.6 Checkbox 组件增强

```typescript
// src/components/ui/checkbox.tsx
interface CheckboxProps extends React.ComponentProps<typeof CheckboxPrimitive.Root> {
  indeterminate?: boolean  // 新增：半选状态
}

function Checkbox({ indeterminate, checked, ...props }: CheckboxProps) {
  const isChecked = indeterminate ? false : checked
  
  return (
    <CheckboxPrimitive.Root checked={isChecked} {...props}>
      <CheckboxPrimitive.Indicator>
        {indeterminate ? <MinusIcon /> : <CheckIcon />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
```

---

## 7. 孤立文件处理

### 7.1 孤立文件定义

| 类型 | 定义 | 判断逻辑 | 建议操作 |
|------|------|---------|---------|
| **用户已删除** | 物理目录存在，但用户表无记录 | 遍历 `upload/users/` 目录，检查用户ID是否存在 | 安全删除 |
| **项目孤立** | 物理目录存在，但项目表无记录 | 遍历 `upload/projects/` 目录，检查项目名是否存在 | 审核后删除 |
| **附件孤立** | 文件存在，但附件表无记录 | 遍历所有文件，检查 `attachments.path` 是否存在 | 审核后处理 |
| **统一存储孤立** | `files/` 或 `images/` 中的文件无记录 | 遍历并检查数据库 | 审核后处理 |

### 7.2 检测流程

```
开始扫描
    │
    ├── 扫描 upload/users/ 目录
    │   ├── 遍历每个用户目录
    │   │   ├── 用户存在？ ──是──→ 检查文件是否有对应附件记录
    │   │   └── 用户不存在 ──→ 标记为"用户已删除"类型孤立目录
    │   │
    │   └── 收集孤立文件/目录
    │
    ├── 扫描 upload/projects/ 目录
    │   ├── 遍历每个项目目录
    │   │   ├── 项目存在？ ──是──→ 检查文件是否有对应附件记录
    │   │   └── 项目不存在 ──→ 标记为"项目孤立"类型孤立目录
    │   │
    │   └── 收集孤立文件/目录
    │
    ├── 扫描 upload/files/ 目录（新增）
    │   └── 检查每个文件是否有附件记录
    │
    ├── 扫描 upload/images/ 目录（新增）
    │   └── 检查每个图片是否有附件记录
    │
    └── 返回汇总结果
```

### 7.3 清理策略

```typescript
// 清理已删除用户的目录
if (type === 'all' || type === 'user_deleted') {
  const userDirs = fs.readdirSync(usersRoot)
  for (const userDir of userDirs) {
    const userExists = await db.user.findUnique({ where: { id: userDir } })
    if (!userExists) {
      fs.rmSync(userPath, { recursive: true, force: true })
    }
  }
}

// 清理孤立项目目录
if (type === 'all' || type === 'project_orphan') {
  const projectDirs = fs.readdirSync(projectsRoot)
  for (const projectDir of projectDirs) {
    const project = await db.project.findFirst({ where: { name: projectDir } })
    if (!project) {
      fs.rmSync(projectPath, { recursive: true, force: true })
    }
  }
}

// 清理统一存储中的孤立文件（新增）
if (type === 'all' || type === 'attachment_orphan') {
  // 检查 files/ 目录
  const filesRoot = path.join(uploadRoot, 'files')
  for (const file of getAllFiles(filesRoot)) {
    const attachment = await db.attachment.findFirst({ where: { path: file.relativePath } })
    if (!attachment) {
      fs.unlinkSync(file.path)
    }
  }
  
  // 检查 images/ 目录
  // ...
}
```

---

## 8. 下载规则

### 8.1 下载权限矩阵

> **重要**：所有下载功能仅对 `SUPER_ADMIN` 开放，`ADMIN` 无法下载任何文件。

| 功能 | SUPER_ADMIN | ADMIN |
|------|:-----------:|:-----:|
| 勾选文件/文件夹 | ✅ | ❌ |
| 打包下载选中文件 | ✅ | ❌ |
| 全选/清除选择 | ✅ | ❌ |

### 8.2 下载流程

```
用户勾选文件/文件夹
    │
    ├── 点击"打包下载"
    │
    ├── 前端收集选中路径
    │   ├── 过滤顶层目录（避免重复）
    │   └── 构建请求体
    │
    ├── 调用 POST /api/admin/files/batch-download
    │
    ├── 后端处理
    │   ├── 路径格式转换（相对→绝对）
    │   ├── 安全检查（确保在upload目录内）
    │   ├── 递归获取所有文件
    │   ├── 检查总大小（≤2GB）
    │   ├── 创建ZIP流
    │   └── 记录审计日志
    │
    └── 返回ZIP文件
```

### 8.3 选择操作

| 操作 | 快捷方式 | 说明 |
|------|---------|------|
| 单选文件 | 点击文件复选框 | 选中/取消单个文件 |
| 单选文件夹 | 点击文件夹复选框 | 选中/取消文件夹下所有文件 |
| 全选 | 点击"全选"按钮 | 选中当前Tab所有文件 |
| 清除选择 | 点击"清除选择"按钮 | 清除所有选中状态 |
| 查看统计 | 选中后自动显示 | 显示选中文件数和总大小 |

### 8.4 ZIP文件命名

| 场景 | 命名格式 |
|------|---------|
| 手动选择下载 | `selected_files_YYYY-MM-DD.zip` |
| 默认命名 | `download.zip` |

---

## 9. 核心工具函数

### 9.1 文件路径工具

**文件位置**: `src/lib/file-path.ts`

| 函数 | 用途 | 参数 | 返回值 |
|------|------|------|--------|
| `sanitizeName()` | 清理文件名 | `name: string` | 清理后的字符串 |
| `getDatePrefix()` | 获取日期前缀 | 无 | `YYYYMMDD` 格式 |
| `getUniqueFilename()` | 获取唯一文件名 | `dir, filename` | 不冲突的文件名 |
| `generateDraftFilePath()` | 生成暂存区文件路径 | `userId, experimentTitle, originalFilename` | `FilePathResult` |
| `generateProjectFilePath()` | 生成项目文件路径 | `projectName, experimentTitle, originalFilename` | `FilePathResult` |
| `parseStorageLocation()` | 解析存储位置 | `relativePath` | `{ location, userId?, projectName? }` |
| `cleanupEmptyDirectories()` | 清理空目录 | `dirPath` | 无 |

### 9.2 类型定义

```typescript
export type StorageLocation = 'draft' | 'project'

export interface FilePathResult {
  fullPath: string      // 文件系统完整路径
  relativePath: string  // 数据库存储的相对路径
  directory: string     // 文件所在目录
}

// 选择路径（新增）
interface SelectedPath {
  path: string
  type: 'file' | 'directory'
}
```

### 9.3 选择相关工具函数（新增）

```typescript
// 获取节点下所有文件的数量和大小
function getNodeStats(node: FileNode): { fileCount: number; totalSize: number }

// 递归获取节点下所有文件路径
function getAllNodePaths(node: FileNode): SelectedPath[]

// 格式化文件大小
function formatBytes(bytes: number): string
// 示例: formatBytes(1536) → "1.5 KB"
```

---

## 10. 变更记录

### v3.3 (2025-03-02)

**功能修复**:
- [x] 支持 .doc 格式文件预览提取（使用 antiword 命令行工具）
- [x] 新增 `src/lib/fileParser.ts` 统一文件解析库

**修改文件**:
- `src/lib/fileParser.ts` - 新建，统一文件解析库
- `src/app/api/attachments/route.ts` - 支持 .doc 文件预览

### v3.3 (2025-03-01)

**新增功能**:
- [x] 文件管理模块整体架构
- [x] 存储统计 API (`/api/admin/files/stats`)
- [x] 目录树 API (`/api/admin/files/tree`)
- [x] 打包下载 API (`/api/admin/files/download`)
- [x] **批量下载 API** (`/api/admin/files/batch-download`) - 支持按文件路径列表下载
- [x] 搜索 API (`/api/admin/files/search`)
- [x] 孤立文件检测 API (`/api/admin/files/orphaned`)
- [x] 前端 FileManager 组件
- [x] **文件勾选功能** - 支持勾选文件/文件夹进行打包下载
- [x] **Checkbox indeterminate 状态** - 支持半选状态显示
- [x] 项目归档自动锁定关联实验

**权限调整** (2025-03-01):
- [x] 下载功能权限收紧：仅 `SUPER_ADMIN` 可下载文件
- [x] `ADMIN` 角色限制：仅可查看统计和目录，不可下载、不可勾选
- [x] 孤立文件Tab仅 `SUPER_ADMIN` 可见
- [x] 复选框仅 `SUPER_ADMIN` 可见

**审计日志新增**:
- [x] `AuditAction.DOWNLOAD` 枚举值 - 记录文件下载操作

**新增文件**:
- `src/app/api/admin/files/stats/route.ts`
- `src/app/api/admin/files/tree/route.ts`
- `src/app/api/admin/files/download/route.ts`
- `src/app/api/admin/files/batch-download/route.ts` - **新增**
- `src/app/api/admin/files/search/route.ts`
- `src/app/api/admin/files/orphaned/route.ts`
- `src/components/admin/FileManager.tsx`
- `src/lib/file-path.ts`

**修改文件**:
- `src/components/layout/Sidebar.tsx` - 添加文件管理菜单入口
- `src/app/api/projects/[id]/route.ts` - 添加归档锁定逻辑
- `src/components/ui/checkbox.tsx` - 支持 indeterminate 状态
- `prisma/schema.prisma` - 添加 DOWNLOAD 审计动作

**依赖新增**:
- `archiver` - ZIP 打包库

---

## 附录

### A. 相关文件清单

```
src/
├── app/api/admin/files/
│   ├── stats/route.ts           # 存储统计
│   ├── tree/route.ts            # 目录树
│   ├── download/route.ts        # 打包下载
│   ├── batch-download/route.ts  # 批量下载（新增）
│   ├── search/route.ts          # 搜索
│   └── orphaned/route.ts        # 孤立文件
│
├── components/admin/
│   └── FileManager.tsx          # 文件管理组件
│
├── components/ui/
│   └── checkbox.tsx             # 复选框（支持indeterminate）
│
├── lib/
│   └── file-path.ts             # 文件路径工具
│
└── components/layout/
    └── Sidebar.tsx              # 侧边栏（包含入口）

upload/                          # 文件存储根目录
├── projects/                    # 项目存储区
├── users/                       # 用户暂存区
├── files/                       # 统一存储区
└── images/                      # 图片存储区
```

### B. 错误码说明

| HTTP状态码 | 错误信息 | 原因 |
|-----------|---------|------|
| 401 | 未登录 | Token 无效或过期 |
| 403 | 无权限访问 | 非管理员角色 |
| 403 | 无权限访问，仅超级管理员可下载文件 | ADMIN尝试下载 |
| 403 | 无权限访问，仅超级管理员可清理孤立文件 | 非超级管理员尝试清理 |
| 404 | 项目不存在 | 项目ID 无效 |
| 404 | 文件目录不存在 | 物理目录缺失 |
| 400 | 未选择任何文件 | 批量下载时paths为空 |
| 400 | 没有找到可下载的文件 | 所有路径都不存在或无权限 |
| 400 | 下载文件总大小超过限制 | 总大小超过2GB |
| 500 | 获取存储统计失败 | 服务端错误 |
| 500 | 打包下载失败 | ZIP 生成失败 |

### C. 性能注意事项

1. **目录树深度**: 默认限制为4层，避免过深递归
2. **孤立文件扫描**: 大量文件时可能较慢，建议后台定时扫描
3. **ZIP打包**: 大文件打包可能占用内存，限制单次下载2GB
4. **搜索结果**: 限制返回50条，避免前端渲染压力
5. **选择状态**: 使用 Map 存储选中路径，O(1) 查找效率

---

> **注意**: 本文档应随模块变更及时更新。如发现文档与实际实现不符，请以代码为准并更新文档。
