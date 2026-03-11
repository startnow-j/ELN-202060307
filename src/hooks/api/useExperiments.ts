'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { authFetch } from '@/contexts/AppContext'

// Types
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
  author: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
  projects: Array<{
    id: string
    name: string
    status: string
    ownerId: string
  }>
  attachments: Attachment[]
  reviewFeedbacks?: ReviewFeedback[]
  reviewRequests?: ReviewRequest[]
  unlockRequests?: UnlockRequest[]
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  reviewedAt: string | null
}

export interface Attachment {
  id: string
  name: string
  type: string
  size: number
  path: string
  category: string
  previewData: PreviewData | null
  createdAt: string
}

export type PreviewData = WordPreview | PDFPreview | ExcelPreview | null

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

export interface ExcelPreview {
  type: 'excel'
  sheets: Array<{
    name: string
    rows: number
    cols: number
    headers: string[]
    sampleData: string[][]
  }>
  totalSheets: number
}

export type ReviewStatus = 'DRAFT' | 'PENDING_REVIEW' | 'NEEDS_REVISION' | 'LOCKED'
export type ExtractionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

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

export interface ReviewFeedback {
  id: string
  action: 'SUBMIT' | 'APPROVE' | 'REQUEST_REVISION' | 'TRANSFER' | 'UNLOCK'
  feedback: string | null
  createdAt: string
  experimentId: string
  reviewerId: string
  reviewer: {
    id: string
    name: string
    email: string
  }
  attachments?: Array<{
    id: string
    name: string
    type: string
    size: number
    createdAt: string
  }>
}

export interface ReviewRequest {
  id: string
  status: 'PENDING' | 'COMPLETED' | 'TRANSFERRED' | 'CANCELLED'
  note: string | null
  createdAt: string
  updatedAt: string
  reviewerId: string
  reviewer: {
    id: string
    name: string
    email: string
  }
}

export interface UnlockRequest {
  id: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  response: string | null
  createdAt: string
  processedAt: string | null
  requesterId: string
  requester: {
    id: string
    name: string
    email: string
  }
  processorId: string | null
  processor: {
    id: string
    name: string
    email: string
  } | null
}

export interface ExperimentsFilters {
  projectId?: string
  status?: string
  reviewStatus?: string
  search?: string
  authorId?: string
  viewMode?: string
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
  feedbacks: (id: string) => [...experimentKeys.all, 'feedbacks', id] as const,
}

// Fetch functions
async function fetchExperiments(filters?: ExperimentsFilters): Promise<Experiment[]> {
  const params = new URLSearchParams()
  if (filters?.projectId) params.append('projectId', filters.projectId)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.reviewStatus) params.append('reviewStatus', filters.reviewStatus)
  if (filters?.search) params.append('search', filters.search)
  if (filters?.authorId) params.append('authorId', filters.authorId)
  if (filters?.viewMode) params.append('viewMode', filters.viewMode)
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.limit) params.append('limit', filters.limit.toString())

  const res = await authFetch(`/api/experiments?${params.toString()}`)
  if (!res.ok) throw new Error('获取实验列表失败')
  return res.json()
}

async function fetchExperiment(id: string): Promise<Experiment> {
  const res = await authFetch(`/api/experiments/${id}`)
  if (!res.ok) throw new Error('获取实验详情失败')
  return res.json()
}

async function fetchFeedbacks(id: string): Promise<ReviewFeedback[]> {
  const res = await authFetch(`/api/experiments/${id}/feedbacks`)
  if (!res.ok) throw new Error('获取审核历史失败')
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

export function useFeedbacks(experimentId: string) {
  return useQuery({
    queryKey: experimentKeys.feedbacks(experimentId),
    queryFn: () => fetchFeedbacks(experimentId),
    enabled: !!experimentId,
  })
}

// Mutation Hooks
export function useCreateExperiment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: { title: string; summary?: string; projectIds?: string[] }) => {
      const res = await authFetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '创建实验记录失败')
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
    mutationFn: async (data: Partial<Experiment> & { projectIds?: string[] }) => {
      const res = await authFetch(`/api/experiments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '更新实验记录失败')
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
      const res = await authFetch(`/api/experiments/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '删除实验记录失败')
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
    mutationFn: async (data?: { reviewerIds?: string[]; submitNote?: string }) => {
      const res = await authFetch(`/api/experiments/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '提交审核失败')
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

export function useReviewExperiment(id: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: {
      action: 'APPROVE' | 'REQUEST_REVISION' | 'TRANSFER'
      feedback?: string
      transferToUserId?: string
      attachmentIds?: string[]
    }) => {
      const res = await authFetch(`/api/experiments/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '审核操作失败')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: experimentKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: experimentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: experimentKeys.feedbacks(id) })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}

export function useTriggerExtraction(id: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (attachmentIds?: string[]) => {
      const res = await authFetch(`/api/experiments/${id}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentIds }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'AI提取失败')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: experimentKeys.detail(id) })
      toast({ title: 'AI提取完成' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}

export function useUnlockRequest(id: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (reason: string) => {
      const res = await authFetch(`/api/experiments/${id}/unlock-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '提交解锁申请失败')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: experimentKeys.detail(id) })
      toast({ title: '解锁申请已提交' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}
