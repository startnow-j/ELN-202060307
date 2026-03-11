'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { authFetch } from '@/contexts/AppContext'

// Types
export interface Template {
  id: string
  name: string
  description: string | null
  content: string
  tags: string | null
  isPublic: boolean
  creatorId: string
  creator: {
    id: string
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

export interface TemplatesFilters {
  search?: string
  isPublic?: boolean
  creatorId?: string
}

// Query Keys
export const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (filters: TemplatesFilters) => [...templateKeys.lists(), filters] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
}

// Fetch functions
async function fetchTemplates(filters?: TemplatesFilters): Promise<Template[]> {
  const params = new URLSearchParams()
  if (filters?.search) params.append('search', filters.search)
  if (filters?.isPublic !== undefined) params.append('isPublic', filters.isPublic.toString())
  if (filters?.creatorId) params.append('creatorId', filters.creatorId)

  const res = await authFetch(`/api/templates?${params.toString()}`)
  if (!res.ok) throw new Error('获取模板列表失败')
  return res.json()
}

async function fetchTemplate(id: string): Promise<Template> {
  const res = await authFetch(`/api/templates/${id}`)
  if (!res.ok) throw new Error('获取模板详情失败')
  return res.json()
}

// Query Hooks
export function useTemplates(filters?: TemplatesFilters) {
  return useQuery({
    queryKey: templateKeys.list(filters || {}),
    queryFn: () => fetchTemplates(filters),
  })
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => fetchTemplate(id),
    enabled: !!id,
  })
}

// Mutation Hooks
export function useCreateTemplate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: Partial<Template>) => {
      const res = await authFetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '创建模板失败')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
      toast({ title: '模板创建成功' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}

export function useUpdateTemplate(id?: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (params: { id?: string; data: Partial<Template> }) => {
      const templateId = params.id || id
      if (!templateId) throw new Error('模板ID不能为空')
      
      const res = await authFetch(`/api/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params.data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '更新模板失败')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      const templateId = variables.id || id
      if (templateId) {
        queryClient.invalidateQueries({ queryKey: templateKeys.detail(templateId) })
      }
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
      toast({ title: '模板更新成功' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/templates/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '删除模板失败')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
      toast({ title: '模板已删除' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}
