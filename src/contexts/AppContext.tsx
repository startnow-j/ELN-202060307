'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// ==================== Token管理 ====================

const TOKEN_KEY = 'auth-token'

// 内存中的 token 存储（最终备选方案）
let memoryToken: string | null = null

// 获取存储的token（优先级：sessionStorage > memory > localStorage）
// sessionStorage 在 sandboxed iframe 中通常可用，且在会话期间持久化
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null

  // 1. 优先使用 sessionStorage（sandboxed iframe 中可用，页面刷新后保持）
  try {
    const sessionToken = sessionStorage.getItem(TOKEN_KEY)
    if (sessionToken) {
      // 同步到内存
      memoryToken = sessionToken
      return sessionToken
    }
  } catch {
    // sessionStorage 不可用，继续尝试其他方式
  }

  // 2. 检查内存存储
  if (memoryToken) return memoryToken

  // 3. 最后尝试 localStorage
  try {
    const localToken = localStorage.getItem(TOKEN_KEY)
    if (localToken) {
      // 同步到 sessionStorage 和内存
      try { sessionStorage.setItem(TOKEN_KEY, localToken) } catch {}
      memoryToken = localToken
      return localToken
    }
  } catch {
    // localStorage 不可用
  }

  return null
}

// 存储token（同时存到所有可用位置）
function setStoredToken(token: string): void {
  // 存到内存
  memoryToken = token

  // 尝试 sessionStorage（优先，因为页面刷新后保持）
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch {}

  // 尝试 localStorage
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {}
}

// 清除token（从所有位置清除）
function clearStoredToken(): void {
  memoryToken = null

  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {}

  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

// 带认证的fetch
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken()
  const headers: HeadersInit = {
    ...options.headers,
  }
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  
  return fetch(url, {
    ...options,
    headers,
    // 包含 credentials 以支持 cookie（作为备选）
    credentials: 'include',
  })
}

// ==================== 类型定义 ====================

// 用户角色类型
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RESEARCHER'

export interface AppUser {
  id: string
  email: string
  name: string
  role: UserRole
  avatar: string | null
  projectRole?: string | null  // 项目角色（优先显示）
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
  primaryLeader: string | null     // 项目主负责人
  ownerId: string
  members: AppUser[]
  memberCount?: number             // 成员数量（API 返回）
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

// 项目成员关系类型（用于实验列表中的项目关联）
export interface ProjectRelationForMember {
  id: string
  name: string
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  ownerId: string
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
  projects: ProjectRelationForMember[]
  attachments: Attachment[]
  reviewFeedbacks?: ReviewFeedback[]
  reviewRequests?: ReviewRequest[]
  unlockRequests?: UnlockRequest[]
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  reviewedAt: string | null
}

// 审核反馈类型
export interface ReviewFeedback {
  id: string
  action: 'SUBMIT' | 'APPROVE' | 'REQUEST_REVISION' | 'TRANSFER' | 'UNLOCK'
  feedback: string | null
  createdAt: string
  experimentId: string
  reviewerId: string
  reviewer: AppUser
  attachments?: ReviewAttachment[]
}

// 审核附件类型
export interface ReviewAttachment {
  id: string
  name: string
  type: string
  size: number
  createdAt: string
}

// 审核请求类型
export interface ReviewRequest {
  id: string
  status: 'PENDING' | 'COMPLETED' | 'TRANSFERRED' | 'CANCELLED'
  note: string | null
  createdAt: string
  updatedAt: string
  reviewerId: string
  reviewer: AppUser
}

// 解锁申请类型
export interface UnlockRequest {
  id: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  response: string | null
  createdAt: string
  processedAt: string | null
  requesterId: string
  requester: AppUser
  processorId: string | null
  processor: AppUser | null
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

/**
 * AppContext 迁移状态说明
 * 
 * ✅ 已迁移到 React Query hooks:
 * - useProjects (src/hooks/api/useProjects.ts)
 * - useExperiments (src/hooks/api/useExperiments.ts)
 * - useTemplates (src/hooks/api/useTemplates.ts)
 * - useUnlockRequests (src/hooks/api/useUnlockRequests.ts)
 * - useAuth (src/hooks/api/useAuth.ts)
 * 
 * 📋 迁移后保留在 AppContext:
 * - currentUser (认证状态)
 * - isLoading (认证加载状态)
 * - login / logout / register (认证操作)
 * - authFetch (带认证的 fetch)
 * 
 * ⚠️ 向后兼容：
 * - projects/experiments/templates 状态仍保留，用于 page.tsx 查找实验详情
 * - CRUD 方法保留，供 ExperimentEditor/ExperimentDetail 使用
 * - 后续版本将逐步移除这些方法
 */

interface AppState {
  currentUser: AppUser | null
  isLoading: boolean
  /** @deprecated 使用 useProjects hook 替代 */
  projects: Project[]
  /** @deprecated 使用 useExperiments hook 替代 */
  experiments: Experiment[]
  /** @deprecated 使用 useTemplates hook 替代 */
  templates: Template[]
  // 视角模式
  viewMode: 'default' | 'global'
}

interface AppContextType extends AppState {
  // 视角切换
  setViewMode: (mode: 'default' | 'global') => void
  
  // 认证方法（保留）
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  register: (name: string, email: string, password: string) => Promise<boolean>
  
  /** @deprecated React Query 自动管理数据刷新 */
  refreshData: () => Promise<void>
  
  // 项目操作（向后兼容，建议使用 useProjects hooks）
  /** @deprecated 使用 useCreateProject hook 替代 */
  createProject: (data: Partial<Project>) => Promise<Project | null>
  /** @deprecated 使用 useUpdateProject hook 替代 */
  updateProject: (id: string, data: Partial<Project>) => Promise<boolean>
  /** @deprecated 使用 useDeleteProject hook 替代 */
  deleteProject: (id: string) => Promise<boolean>
  
  // 实验操作（向后兼容，建议使用 useExperiments hooks）
  /** @deprecated 使用 useCreateExperiment hook 替代 */
  createExperiment: (data: Partial<Experiment>, projectIds?: string[]) => Promise<Experiment | null>
  /** @deprecated 使用 useUpdateExperiment hook 替代 */
  updateExperiment: (id: string, data: Partial<Experiment>, projectIds?: string[]) => Promise<boolean>
  /** @deprecated 使用 useDeleteExperiment hook 替代 */
  deleteExperiment: (id: string) => Promise<boolean>
  
  // AI提取（向后兼容）
  /** @deprecated 使用 useTriggerExtraction hook 替代 */
  triggerExtraction: (experimentId: string) => Promise<boolean>
  /** @deprecated 使用 useUpdateExperiment hook 替代 */
  updateExtractedInfo: (experimentId: string, info: ExtractedInfo) => Promise<boolean>
  
  // 审核（向后兼容，建议使用 useExperiments hooks）
  /** @deprecated 使用 useSubmitForReview hook 替代 */
  submitForReview: (experimentId: string, reviewerIds?: string[], submitNote?: string) => Promise<boolean>
  /** @deprecated 使用 useReviewExperiment hook 替代 */
  reviewExperiment: (experimentId: string, action: 'APPROVE' | 'REQUEST_REVISION' | 'TRANSFER', feedback?: string, transferToUserId?: string, attachmentIds?: string[]) => Promise<boolean>
  
  // 模板操作（向后兼容，建议使用 useTemplates hooks）
  /** @deprecated 使用 useCreateTemplate hook 替代 */
  createTemplate: (data: Partial<Template>) => Promise<Template | null>
  /** @deprecated 使用 useUpdateTemplate hook 替代 */
  updateTemplate: (id: string, data: Partial<Template>) => Promise<boolean>
  /** @deprecated 使用 useDeleteTemplate hook 替代 */
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
    viewMode: 'default',
  })

  // 设置视角模式
  const setViewMode = (mode: 'default' | 'global') => {
    setState(prev => ({ ...prev, viewMode: mode }))
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await authFetch('/api/auth/me')
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
        authFetch('/api/projects'),
        authFetch('/api/experiments'),
        authFetch('/api/templates'),
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
      console.log('[login] Starting login for:', email)
      
      // 使用 credentials: 'include' 让浏览器自动处理 cookie
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // 重要：让浏览器自动设置和发送 cookie
      })

      console.log('[login] Response status:', res.status)
      
      if (res.ok) {
        const data = await res.json()
        console.log('[login] Got user:', data.user?.email)
        
        // 尝试存储 token 到 localStorage（如果可用）
        // 主要认证方式是内存存储，localStorage 只是备份
        if (data.token) {
          setStoredToken(data.token)
        }
        
        setState(prev => ({ ...prev, currentUser: data.user }))
        await refreshData()
        return true
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.log('[login] Login failed:', errorData)
      }
      return false
    } catch (err) {
      console.error('[login] Error:', err)
      return false
    }
  }

  const logout = async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' })
    } finally {
      clearStoredToken()
      setState(prev => ({ ...prev, currentUser: null, projects: [], experiments: [], templates: [] }))
    }
  }

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const res = await authFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      if (res.ok) {
        const data = await res.json()
        // 存储token到localStorage（跨域兼容）
        if (data.token) {
          setStoredToken(data.token)
        }
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
      const res = await authFetch('/api/projects', {
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
      const res = await authFetch(`/api/projects/${id}`, {
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
      const res = await authFetch(`/api/projects/${id}`, { method: 'DELETE', credentials: 'include' })
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
      const res = await authFetch('/api/experiments', {
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
      const res = await authFetch(`/api/experiments/${id}`, {
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
      const res = await authFetch(`/api/experiments/${id}`, { method: 'DELETE', credentials: 'include' })
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
      const res = await authFetch(`/api/experiments/${experimentId}/extract`, {
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
      const res = await authFetch(`/api/experiments/${experimentId}`, {
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
  const submitForReview = async (experimentId: string, reviewerIds?: string[], submitNote?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 获取当前的 viewMode
      const currentViewMode = state.viewMode
      const res = await authFetch(`/api/experiments/${experimentId}/submit?viewMode=${currentViewMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerIds, submitNote }),
      })
      if (res.ok) {
        const updated = await res.json()
        setState(prev => ({
          ...prev,
          experiments: prev.experiments.map(e => e.id === experimentId ? updated : e)
        }))
        return { success: true }
      }
      // 解析错误信息
      const errorData = await res.json().catch(() => ({ error: '提交失败' }))
      return { success: false, error: errorData.error || '提交失败' }
    } catch (error) {
      return { success: false, error: '网络错误，请重试' }
    }
  }

  const reviewExperiment = async (experimentId: string, action: 'APPROVE' | 'REQUEST_REVISION' | 'TRANSFER', feedback?: string, transferToUserId?: string, attachmentIds?: string[]): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/experiments/${experimentId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, feedback, transferToUserId, attachmentIds }),
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
      const res = await authFetch('/api/templates', {
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
      const res = await authFetch(`/api/templates/${id}`, {
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
      const res = await authFetch(`/api/templates/${id}`, { method: 'DELETE', credentials: 'include' })
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
      setViewMode,
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
