'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

// Types
export interface Experiment {
  id: string
  title: string
  content: string | null
  reviewStatus: 'DRAFT' | 'PENDING_REVIEW' | 'NEEDS_REVISION' | 'LOCKED'
  projectId: string | null
  authorId: string
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    email: string
  }
  project?: {
    id: string
    name: string
    status: string
  }
}

export interface ExperimentsFilters {
  projectId?: string
  status?: string
  search?: string
  authorId?: string
  page?: number
  limit?: number
}

// Query Keys
export const experimentKeys = {
  all: ['experiments'] as const,
  lists: () => [...experimentKeys.all, 'list'] as const,
  list: (filters: ExperimentsFilters) => [...experimentKeys.lists(), filters] as const,
  details: () => [...experimentKeys.all, 'detail'] as const,
  detail: (id: string) => [...experimentKeys.details(), id] as const,
}

// Fetch functions
async function fetchExperiments(filters?: ExperimentsFilters): Promise<Experiment[]> {
  const params = new URLSearchParams()
  if (filters?.projectId) params.append('projectId', filters.projectId)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.search) params.append('search', filters.search)
  if (filters?.authorId) params.append('authorId', filters.authorId)
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.limit) params.append('limit', filters.limit.toString())

  const res = await fetch(`/api/experiments?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch experiments')
  return res.json()
}

async function fetchExperiment(id: string): Promise<Experiment> {
  const res = await fetch(`/api/experiments/${id}`)
  if (!res.ok) throw new Error('Failed to fetch experiment')
  return res.json()
}

// Query Hooks
export function useExperiments(filters?: ExperimentsFilters) {
  return useQuery({
    queryKey: experimentKeys.list(filters || {}),
    queryFn: () => fetchExperiments(filters),
  })
}

export function useExperiment(id: string) {
  return useQuery({
    queryKey: experimentKeys.detail(id),
    queryFn: () => fetchExperiment(id),
    enabled: !!id,
  })
}

// Mutation Hooks
export function useCreateExperiment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: { title: string; content?: string; projectId?: string }) => {
      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create experiment')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: experimentKeys.lists() })
      toast({ title: '实验记录创建成功' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}

export function useUpdateExperiment(id: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: Partial<Experiment>) => {
      const res = await fetch(`/api/experiments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update experiment')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: experimentKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: experimentKeys.lists() })
      toast({ title: '保存成功' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}

export function useDeleteExperiment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/experiments/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete experiment')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: experimentKeys.lists() })
      toast({ title: '实验记录已删除' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}

export function useSubmitForReview(id: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/experiments/${id}/submit`, {
        method: 'POST',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to submit for review')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: experimentKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: experimentKeys.lists() })
      toast({ title: '已提交审核' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}
