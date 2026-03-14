/**
 * API Hooks 工具函数
 * 提供认证 fetch、缓存键管理和通用类型定义
 */

// ==================== Token 管理 ====================

const TOKEN_KEY = 'auth-token'

// 内存中的 token 存储
let memoryToken: string | null = null

// 获取存储的token
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null

  // 1. 优先使用 sessionStorage
  try {
    const sessionToken = sessionStorage.getItem(TOKEN_KEY)
    if (sessionToken) {
      memoryToken = sessionToken
      return sessionToken
    }
  } catch {
    // sessionStorage 不可用
  }

  // 2. 检查内存存储
  if (memoryToken) return memoryToken

  // 3. 最后尝试 localStorage
  try {
    const localToken = localStorage.getItem(TOKEN_KEY)
    if (localToken) {
      try { sessionStorage.setItem(TOKEN_KEY, localToken) } catch {}
      memoryToken = localToken
      return localToken
    }
  } catch {
    // localStorage 不可用
  }

  return null
}

// 带认证的 fetch
export async function authFetch<T = unknown>(
  url: string, 
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  const token = getStoredToken()
  const headers: HeadersInit = {
    ...options.headers,
  }
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  
  // 如果没有显式设置 Content-Type 且有 body，设置为 JSON
  if (options.body && !(headers as Record<string, string>)['Content-Type']) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json'
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    })
    
    if (!response.ok) {
      // 尝试解析错误信息
      try {
        const errorData = await response.json()
        return { 
          data: null, 
          error: errorData.error || `请求失败 (${response.status})`, 
          status: response.status 
        }
      } catch {
        return { 
          data: null, 
          error: `请求失败 (${response.status})`, 
          status: response.status 
        }
      }
    }
    
    const data = await response.json()
    return { data, error: null, status: response.status }
  } catch (err) {
    return { 
      data: null, 
      error: err instanceof Error ? err.message : '网络错误', 
      status: 0 
    }
  }
}

// ==================== 缓存键管理 ====================

/**
 * 查询键工厂
 * 统一管理所有 API 的缓存键，确保类型安全和一致性
 */
export const queryKeys = {
  // 项目相关
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (viewMode?: string) => [...queryKeys.projects.lists(), { viewMode }] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
    status: (id: string) => [...queryKeys.projects.all, 'status', id] as const,
    members: (id: string) => [...queryKeys.projects.all, 'members', id] as const,
    documents: (id: string) => [...queryKeys.projects.all, 'documents', id] as const,
    experiments: (id: string) => [...queryKeys.projects.all, 'experiments', id] as const,
  },
  
  // 实验相关
  experiments: {
    all: ['experiments'] as const,
    lists: () => [...queryKeys.experiments.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.experiments.lists(), filters] as const,
    details: () => [...queryKeys.experiments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.experiments.details(), id] as const,
    reviewers: (id: string) => [...queryKeys.experiments.all, 'reviewers', id] as const,
    feedbacks: (id: string) => [...queryKeys.experiments.all, 'feedbacks', id] as const,
  },
  
  // 用户相关
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: () => [...queryKeys.users.lists()] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
  },
  
  // 文档相关
  documents: {
    all: ['documents'] as const,
    projectDocuments: (projectId: string) => [...queryKeys.documents.all, 'project', projectId] as const,
  },
  
  // 模板相关
  templates: {
    all: ['templates'] as const,
    lists: () => [...queryKeys.templates.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.templates.all, 'detail', id] as const,
  },
  
  // 解锁申请相关
  unlockRequests: {
    all: ['unlockRequests'] as const,
    list: () => [...queryKeys.unlockRequests.all, 'list'] as const,
  },
} as const

// ==================== 类型定义 ====================

// 通用 API 响应类型
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: number
}

// 分页参数
export interface PaginationParams {
  page?: number
  limit?: number
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// 用户角色类型
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RESEARCHER'

// 用户基本信息
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar: string | null
  projectRole?: string | null
}

// 项目状态
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'

// 项目关系类型
export type ProjectRelation = 'CREATED' | 'LEADING' | 'JOINED' | 'GLOBAL'

// 项目基本信息
export interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  startDate: string | null
  endDate: string | null
  expectedEndDate: string | null
  actualEndDate: string | null
  completedAt: string | null
  archivedAt: string | null
  primaryLeader: string | null
  ownerId: string
  owner: User
  members: User[]
  memberCount?: number
  createdAt: string
  _relation?: ProjectRelation
}

// 项目成员
export interface ProjectMember {
  id: string
  name: string
  email: string
  role: UserRole
  avatar: string | null
  projectRole: string
  joinedAt: string | null
}

// 项目文档
export interface ProjectDocument {
  id: string
  name: string
  type: 'PROPOSAL' | 'PROGRESS_REPORT' | 'FINAL_REPORT' | 'OTHER'
  description: string | null
  path: string
  size: number
  projectId: string
  uploaderId: string
  uploader: {
    id: string
    name: string
    email: string
  }
  createdAt: string
}

// 审核状态
export type ReviewStatus = 'DRAFT' | 'PENDING_REVIEW' | 'NEEDS_REVISION' | 'LOCKED'

// AI提取状态
export type ExtractionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

// 实验记录
export interface Experiment {
  id: string
  title: string
  summary: string | null
  conclusion: string | null
  reviewStatus: ReviewStatus
  completenessScore: number
  tags: string | null
  authorId: string
  author: User
  projects: Project[]
  storageLocation: string | null
  primaryProjectId: string | null
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  reviewedAt: string | null
}

// 状态变更操作类型
export type StatusAction = 'complete' | 'reactivate' | 'archive' | 'unarchive'

// 状态变更响应
export interface StatusChangeResult {
  success: boolean
  previousStatus: ProjectStatus
  newStatus: ProjectStatus
  lockedExperiments?: number
}
