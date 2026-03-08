# BioLab ELN 完整代码备份

> 保存日期: 2025-02-26
> 版本: v3.0 核心重构
>
> **此文件包含可运行的代码，可直接复制使用**

---

## 一、数据库模型完整代码 (prisma/schema.prisma)

将以下内容替换整个 schema.prisma 文件：

```prisma
// BioLab ELN - 生物实验室电子实验记录管理系统
// v3.0 核心重构版本 - AI提取 + 审核流程

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ==================== 用户管理 ====================

enum UserRole {
  ADMIN         // 管理员
  PROJECT_LEAD  // 项目负责人（可审核）
  RESEARCHER    // 研究员
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  password      String
  role          UserRole  @default(RESEARCHER)
  avatar        String?
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 关联
  projects      Project[]
  ownedProjects Project[]        @relation("OwnedProjects")
  experiments   Experiment[]
  templates     Template[]
  attachments   Attachment[]
  reviewFeedbacks ReviewFeedback[]
  auditLogs     AuditLog[]

  @@map("users")
}

// ==================== 项目管理 ====================

enum ProjectStatus {
  ACTIVE
  COMPLETED
  ARCHIVED
}

model Project {
  id          String        @id @default(cuid())
  name        String
  description String?
  status      ProjectStatus @default(ACTIVE)
  startDate   DateTime?
  endDate     DateTime?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  ownerId     String
  owner       User          @relation("OwnedProjects", fields: [ownerId], references: [id])
  members     User[]
  experimentProjects ExperimentProject[]

  @@map("projects")
}

// ==================== 实验记录 ====================

enum ReviewStatus {
  DRAFT
  PENDING_REVIEW
  NEEDS_REVISION
  LOCKED
}

enum ExtractionStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

model Experiment {
  id          String          @id @default(cuid())
  title       String

  summary     String?
  conclusion  String?

  extractedInfo   String?
  extractionStatus ExtractionStatus @default(PENDING)
  extractionError String?

  reviewStatus    ReviewStatus @default(DRAFT)
  completenessScore Int       @default(0)

  tags        String?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  submittedAt DateTime?
  reviewedAt  DateTime?

  authorId    String
  author      User            @relation(fields: [authorId], references: [id])
  experimentProjects ExperimentProject[]
  attachments Attachment[]
  reviewFeedbacks ReviewFeedback[]
  versions    ExperimentVersion[]

  @@map("experiments")
}

model ExperimentProject {
  experimentId String
  projectId    String
  createdAt    DateTime @default(now())

  experiment   Experiment @relation(fields: [experimentId], references: [id], onDelete: Cascade)
  project      Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@id([experimentId, projectId])
  @@map("experiment_projects")
}

model ExperimentVersion {
  id           String   @id @default(cuid())
  title        String
  summary      String?
  conclusion   String?
  extractedInfo String?
  versionNote  String?
  createdAt    DateTime @default(now())

  experimentId String
  experiment   Experiment @relation(fields: [experimentId], references: [id], onDelete: Cascade)

  @@map("experiment_versions")
}

// ==================== 审核反馈 ====================

enum ReviewAction {
  APPROVE
  REQUEST_REVISION
}

model ReviewFeedback {
  id          String       @id @default(cuid())
  action      ReviewAction
  feedback    String?
  createdAt   DateTime     @default(now())

  experimentId String
  experiment   Experiment  @relation(fields: [experimentId], references: [id], onDelete: Cascade)
  reviewerId   String
  reviewer     User        @relation(fields: [reviewerId], references: [id])

  @@map("review_feedbacks")
}

// ==================== 实验模板 ====================

model Template {
  id          String   @id @default(cuid())
  name        String
  description String?
  content     String
  tags        String?
  isPublic    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  creatorId   String
  creator     User     @relation(fields: [creatorId], references: [id])

  @@map("templates")
}

// ==================== 文件附件 ====================

enum AttachmentCategory {
  DOCUMENT
  DATA_FILE
  IMAGE
  RAW_DATA
  LOCKED_PDF
  OTHER
}

model Attachment {
  id            String              @id @default(cuid())
  name          String
  type          String
  size          Int
  path          String
  category      AttachmentCategory  @default(DOCUMENT)
  extractedText String?
  createdAt     DateTime            @default(now())

  experimentId  String
  experiment    Experiment @relation(fields: [experimentId], references: [id], onDelete: Cascade)

  uploaderId    String
  uploader      User      @relation(fields: [uploaderId], references: [id])

  @@map("attachments")
}

// ==================== 审计日志 ====================

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  LOGIN
  LOGOUT
  SUBMIT_REVIEW
  APPROVE
  REQUEST_REVISION
}

model AuditLog {
  id          String      @id @default(cuid())
  action      AuditAction
  entityType  String
  entityId    String?
  details     String?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime    @default(now())

  userId      String?
  user        User?       @relation(fields: [userId], references: [id])

  @@map("audit_logs")
}
```

执行命令：
```bash
bun run db:push
```

---

## 二、AppContext完整代码 (src/contexts/AppContext.tsx)

```typescript
'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// 用户角色类型
type UserRole = 'ADMIN' | 'PROJECT_LEAD' | 'RESEARCHER'

export interface AppUser {
  id: string
  email: string
  name: string
  role: UserRole
  avatar: string | null
}

export interface Project {
  id: string
  name: string
  description: string | null
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  startDate: string | null
  endDate: string | null
  ownerId: string
  members: AppUser[]
  createdAt: string
}

// 审核状态
export type ReviewStatus = 'DRAFT' | 'PENDING_REVIEW' | 'NEEDS_REVISION' | 'LOCKED'

// AI提取状态
export type ExtractionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

// AI提取的信息结构
export interface ExtractedInfo {
  reagents?: Array<{
    name: string
    specification?: string
    amount?: string
    manufacturer?: string
  }>
  instruments?: Array<{
    name: string
    model?: string
    equipmentId?: string
  }>
  parameters?: Array<{
    name: string
    value: string
    unit?: string
  }>
  steps?: string[]
  safetyNotes?: string[]
  rawSummary?: string
}

// 附件预览数据类型
export interface WordPreview {
  type: 'word'
  pages: number
  paragraphs: number
  chars: number
  summary: string
}

export interface PDFPreview {
  type: 'pdf'
  pages: number
  chars: number
  summary: string
}

export interface ExcelSheetPreview {
  name: string
  rows: number
  cols: number
  headers: string[]
  sampleData: string[][]
}

export interface ExcelPreview {
  type: 'excel'
  sheets: ExcelSheetPreview[]
  totalSheets: number
}

export type PreviewData = WordPreview | PDFPreview | ExcelPreview | null

// 附件类型
export interface Attachment {
  id: string
  name: string
  type: string
  size: number
  path: string
  category: 'DOCUMENT' | 'DATA_FILE' | 'IMAGE' | 'OTHER'
  previewData: PreviewData
  createdAt: string
}

// 实验记录类型（v3.0 新版）
export interface Experiment {
  id: string
  title: string
  summary: string | null
  conclusion: string | null
  extractedInfo: ExtractedInfo | null
  extractionStatus: ExtractionStatus
  extractionError: string | null
  reviewStatus: ReviewStatus
  completenessScore: number
  tags: string | null
  authorId: string
  author: AppUser
  projects: Project[]
  attachments: Attachment[]
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  reviewedAt: string | null
}

// 审核反馈类型
export interface ReviewFeedback {
  id: string
  action: 'APPROVE' | 'REQUEST_REVISION'
  feedback: string | null
  createdAt: string
  experimentId: string
  reviewerId: string
  reviewer: AppUser
}

// 模板类型
export interface Template {
  id: string
  name: string
  description: string | null
  content: string
  tags: string | null
  isPublic: boolean
  creatorId: string
  creator: AppUser
  createdAt: string
}

// 应用状态
interface AppState {
  currentUser: AppUser | null
  isLoading: boolean
  projects: Project[]
  experiments: Experiment[]
  templates: Template[]
}

// 应用上下文
interface AppContextType extends AppState {
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  register: (name: string, email: string, password: string) => Promise<boolean>
  refreshData: () => Promise<void>
  createProject: (data: Partial<Project>) => Promise<Project | null>
  updateProject: (id: string, data: Partial<Project>) => Promise<boolean>
  deleteProject: (id: string) => Promise<boolean>
  createExperiment: (data: Partial<Experiment>, projectIds?: string[]) => Promise<Experiment | null>
  updateExperiment: (id: string, data: Partial<Experiment>, projectIds?: string[]) => Promise<boolean>
  deleteExperiment: (id: string) => Promise<boolean>
  triggerExtraction: (experimentId: string) => Promise<boolean>
  updateExtractedInfo: (experimentId: string, info: ExtractedInfo) => Promise<boolean>
  submitForReview: (experimentId: string) => Promise<boolean>
  reviewExperiment: (experimentId: string, action: 'APPROVE' | 'REQUEST_REVISION', feedback?: string) => Promise<boolean>
  createTemplate: (data: Partial<Template>) => Promise<Template | null>
  updateTemplate: (id: string, data: Partial<Template>) => Promise<boolean>
  deleteTemplate: (id: string) => Promise<boolean>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    isLoading: true,
    projects: [],
    experiments: [],
    templates: [],
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setState(prev => ({ ...prev, currentUser: data.user, isLoading: false }))
        await refreshData()
      } else {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    } catch {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }

  const refreshData = async () => {
    try {
      const [projectsRes, experimentsRes, templatesRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/experiments'),
        fetch('/api/templates'),
      ])

      const projects = projectsRes.ok ? await projectsRes.json() : []
      const experiments = experimentsRes.ok ? await experimentsRes.json() : []
      const templates = templatesRes.ok ? await templatesRes.json() : []

      setState(prev => ({ ...prev, projects, experiments, templates }))
    } catch (error) {
      console.error('Failed to refresh data:', error)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        const data = await res.json()
        setState(prev => ({ ...prev, currentUser: data.user }))
        await refreshData()
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      setState(prev => ({ ...prev, currentUser: null, projects: [], experiments: [], templates: [] }))
    }
  }

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      if (res.ok) {
        const data = await res.json()
        setState(prev => ({ ...prev, currentUser: data.user }))
        return true
      }
      return false
    } catch {
      return false
    }
  }

  // 项目操作
  const createProject = async (data: Partial<Project>): Promise<Project | null> => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const project = await res.json()
        setState(prev => ({ ...prev, projects: [...prev.projects, project] }))
        return project
      }
      return null
    } catch {
      return null
    }
  }

  const updateProject = async (id: string, data: Partial<Project>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const updated = await res.json()
        setState(prev => ({
          ...prev,
          projects: prev.projects.map(p => p.id === id ? updated : p)
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const deleteProject = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setState(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }))
        return true
      }
      return false
    } catch {
      return false
    }
  }

  // 实验操作
  const createExperiment = async (data: Partial<Experiment>, projectIds?: string[]): Promise<Experiment | null> => {
    try {
      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, projectIds }),
      })
      if (res.ok) {
        const experiment = await res.json()
        setState(prev => ({ ...prev, experiments: [...prev.experiments, experiment] }))
        return experiment
      }
      return null
    } catch {
      return null
    }
  }

  const updateExperiment = async (id: string, data: Partial<Experiment>, projectIds?: string[]): Promise<boolean> => {
    try {
      const res = await fetch(`/api/experiments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, projectIds }),
      })
      if (res.ok) {
        const updated = await res.json()
        setState(prev => ({
          ...prev,
          experiments: prev.experiments.map(e => e.id === id ? updated : e)
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const deleteExperiment = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/experiments/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setState(prev => ({ ...prev, experiments: prev.experiments.filter(e => e.id !== id) }))
        return true
      }
      return false
    } catch {
      return false
    }
  }

  // AI提取
  const triggerExtraction = async (experimentId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/experiments/${experimentId}/extract`, {
        method: 'POST',
      })
      if (res.ok) {
        const updated = await res.json()
        setState(prev => ({
          ...prev,
          experiments: prev.experiments.map(e => e.id === experimentId ? updated : e)
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const updateExtractedInfo = async (experimentId: string, info: ExtractedInfo): Promise<boolean> => {
    try {
      const res = await fetch(`/api/experiments/${experimentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedInfo: info }),
      })
      if (res.ok) {
        const updated = await res.json()
        setState(prev => ({
          ...prev,
          experiments: prev.experiments.map(e => e.id === experimentId ? updated : e)
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  }

  // 审核
  const submitForReview = async (experimentId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/experiments/${experimentId}/submit`, {
        method: 'POST',
      })
      if (res.ok) {
        const updated = await res.json()
        setState(prev => ({
          ...prev,
          experiments: prev.experiments.map(e => e.id === experimentId ? updated : e)
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const reviewExperiment = async (experimentId: string, action: 'APPROVE' | 'REQUEST_REVISION', feedback?: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/experiments/${experimentId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, feedback }),
      })
      if (res.ok) {
        const updated = await res.json()
        setState(prev => ({
          ...prev,
          experiments: prev.experiments.map(e => e.id === experimentId ? updated : e)
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  }

  // 模板操作
  const createTemplate = async (data: Partial<Template>): Promise<Template | null> => {
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const template = await res.json()
        setState(prev => ({ ...prev, templates: [...prev.templates, template] }))
        return template
      }
      return null
    } catch {
      return null
    }
  }

  const updateTemplate = async (id: string, data: Partial<Template>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const updated = await res.json()
        setState(prev => ({
          ...prev,
          templates: prev.templates.map(t => t.id === id ? updated : t)
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setState(prev => ({ ...prev, templates: prev.templates.filter(t => t.id !== id) }))
        return true
      }
      return false
    } catch {
      return false
    }
  }

  return (
    <AppContext.Provider value={{
      ...state,
      login,
      logout,
      register,
      refreshData,
      createProject,
      updateProject,
      deleteProject,
      createExperiment,
      updateExperiment,
      deleteExperiment,
      triggerExtraction,
      updateExtractedInfo,
      submitForReview,
      reviewExperiment,
      createTemplate,
      updateTemplate,
      deleteTemplate,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
```

---

## 三、依赖安装命令

```bash
bun add mammoth xlsx pdf-parse
```

---

## 四、核心工作流程

```
实验记录录入 → 附件上传 → AI智能提取(可选) → 用户确认 → 提交审核 → 锁定PDF → AI项目汇总
```

---

## 五、API路由列表（需创建）

| 路由 | 文件路径 |
|------|----------|
| 附件上传 | src/app/api/attachments/route.ts |
| 附件删除 | src/app/api/attachments/[id]/route.ts |
| 附件下载 | src/app/api/attachments/[id]/download/route.ts |
| AI提取 | src/app/api/experiments/[id]/extract/route.ts |
| 提交审核 | src/app/api/experiments/[id]/submit/route.ts |
| 审核操作 | src/app/api/experiments/[id]/review/route.ts |

---

## 六、前端组件列表（需创建）

| 组件 | 文件路径 |
|------|----------|
| 附件管理 | src/components/attachments/AttachmentManager.tsx |
| 预览对话框 | src/components/attachments/FilePreviewDialog.tsx |
| AI提取面板 | src/components/experiments/ExtractedInfoPanel.tsx |
| 审核列表 | src/components/experiments/ReviewList.tsx |

---

## 七、完整度评分规则

| 评分项 | 分值 |
|--------|------|
| 标题 | 10分 |
| 实验日期 | 10分 |
| 实验类型 | 10分 |
| 关联项目 | 10分 |
| 摘要 | 15分 |
| 结论 | 15分 |
| AI提取信息 | 20分 |
| 附件 | 10分 |

---

## 八、恢复步骤

1. 复制上述 schema.prisma 内容到 `prisma/schema.prisma`
2. 执行 `bun run db:push`
3. 复制上述 AppContext.tsx 内容到 `src/contexts/AppContext.tsx`
4. 执行 `bun add mammoth xlsx pdf-parse`
5. 告诉AI继续创建API路由和前端组件

---

*备份版本: v3.0-2025-02-26*
