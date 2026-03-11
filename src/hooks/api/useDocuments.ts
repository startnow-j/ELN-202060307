/**
 * 文档相关 React Query Hooks
 * 提供项目文档列表、上传、下载、删除等功能
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authFetch, queryKeys, type ProjectDocument } from './utils'

// ==================== 项目文档列表 ====================

/**
 * 获取项目文档列表
 */
export function useProjectDocuments(projectId: string, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options
  
  return useQuery({
    queryKey: queryKeys.documents.projectDocuments(projectId),
    queryFn: async () => {
      const { data, error } = await authFetch<ProjectDocument[]>(`/api/projects/${projectId}/documents`)
      if (error) throw new Error(error)
      return data
    },
    enabled: enabled && !!projectId,
  })
}

// ==================== 上传文档 ====================

export interface UploadDocumentData {
  file: File
  type?: 'PROPOSAL' | 'PROGRESS_REPORT' | 'FINAL_REPORT' | 'OTHER'
  description?: string
}

/**
 * 上传项目文档
 */
export function useUploadDocument(projectId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: UploadDocumentData) => {
      const formData = new FormData()
      formData.append('file', data.file)
      if (data.type) formData.append('type', data.type)
      if (data.description) formData.append('description', data.description)
      
      const token = getStoredToken()
      const headers: HeadersInit = {}
      if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `上传失败 (${response.status})`)
      }
      
      return response.json()
    },
    onSuccess: () => {
      // 使文档列表缓存失效
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.projectDocuments(projectId) })
    },
  })
}

// Token 获取辅助函数
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    const sessionToken = sessionStorage.getItem('auth-token')
    if (sessionToken) return sessionToken
  } catch {}
  
  try {
    const localToken = localStorage.getItem('auth-token')
    if (localToken) return localToken
  } catch {}
  
  return null
}

// ==================== 下载文档 ====================

/**
 * 下载项目文档
 */
export function useDownloadDocument(projectId: string) {
  return useMutation({
    mutationFn: async (docId: string) => {
      const token = getStoredToken()
      const response = await fetch(`/api/projects/${projectId}/documents/${docId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `下载失败 (${response.status})`)
      }
      
      // 获取文件名
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'document'
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*=UTF-8''(.+)/)
        if (match) {
          filename = decodeURIComponent(match[1])
        }
      }
      
      // 创建 Blob 并下载
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      return true
    },
  })
}

// ==================== 删除文档 ====================

/**
 * 删除项目文档
 */
export function useDeleteDocument(projectId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await authFetch(`/api/projects/${projectId}/documents/${docId}`, {
        method: 'DELETE',
      })
      if (error) throw new Error(error)
      return true
    },
    onSuccess: () => {
      // 使文档列表缓存失效
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.projectDocuments(projectId) })
    },
  })
}

// ==================== 导出所有 ====================

export const documentHooks = {
  useProjectDocuments,
  useUploadDocument,
  useDownloadDocument,
  useDeleteDocument,
}
