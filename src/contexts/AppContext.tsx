'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// ==================== 类型定义 ====================

// 用户角色类型
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RESEARCHER'

export interface AppUser {
  id: string
  email: string
  name: string
  role: UserRole
  avatar: string | null
}

// 项目关系类型
export type ProjectRelation = 'CREATED' | 'JOINED' | 'GLOBAL'

export interface Project {
  id: string
  name: string
  description: string | null
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  startDate: string | null
  endDate: string | null           // 兼容字段
  expectedEndDate: string | null   // 预计结束日期
  actualEndDate: string | null     // 真实结束日期
  completedAt: string | null       // 结束时间
  archivedAt: string | null        // 归档时间
  ownerId: string
  members: AppUser[]
  createdAt: string
  _relation?: ProjectRelation      // 项目关系标记
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
    batch?: string
    manufacturer?: string
    amount?: string
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
  conclusion?: string
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
  category: 'DOCUMENT' | 'DATA_FILE' | 'IMAGE' | 'RAW_DATA' | 'LOCKED_PDF' | 'OTHER'
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

// ==================== 应用状态 ====================

interface AppState {
  currentUser: AppUser | null
  isLoading: boolean
  projects: Project[]
  experiments: Experiment[]
  templates: Template[]
}

interface AppContextType extends AppState {
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  register: (name: string, email: string, password: string) => Promise<boolean>
  refreshData: () => Promise<void>
  // 项目操作
  createProject: (data: Partial<Project>) => Promise<Project | null>
  updateProject: (id: string, data: Partial<Project>) => Promise<boolean>
  deleteProject: (id: string) => Promise<boolean>
  // 实验操作
  createExperiment: (data: Partial<Experiment>, projectIds?: string[]) => Promise<Experiment | null>
  updateExperiment: (id: string, data: Partial<Experiment>, projectIds?: string[]) => Promise<boolean>
  deleteExperiment: (id: string) => Promise<boolean>
  // AI提取
  triggerExtraction: (experimentId: string) => Promise<boolean>
  updateExtractedInfo: (experimentId: string, info: ExtractedInfo) => Promise<boolean>
  // 审核
  submitForReview: (experimentId: string) => Promise<boolean>
  reviewExperiment: (experimentId: string, action: 'APPROVE' | 'REQUEST_REVISION', feedback?: string) => Promise<boolean>
  // 模板操作
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
