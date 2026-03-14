'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { projectsApi, ApiError } from '@/lib/api-client'

// Types
export interface ProjectMember {
  id: string
  name: string
  email: string
  role: string
  avatar: string | null
  projectRole: string
  joinedAt: string | null
}

export interface Project {
  id: string
  name: string
  description: string | null
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  ownerId: string
  startDate: string | null
  endDate: string | null
  expectedEndDate: string | null
  actualEndDate: string | null
  completedAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  primaryLeader?: string
  owner?: {
    id: string
    name: string
    email: string
  }
  members?: ProjectMember[]
  _count?: {
    experiments: number
    members: number
  }
}

export interface ProjectsFilters {
  status?: string
  search?: string
  page?: number
  limit?: number
  viewMode?: 'default' | 'global'
}

// Query Keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: ProjectsFilters) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  members: (id: string) => [...projectKeys.all, 'members', id] as const,
  documents: (id: string) => [...projectKeys.all, 'documents', id] as const,
  statusActions: (id: string) => [...projectKeys.all, 'statusActions', id] as const,
}

// Fetch functions using API client
async function fetchProjects(filters?: ProjectsFilters): Promise<Project[]> {
  return projectsApi.get<Project[]>('', { params: filters as Record<string, string | number | undefined> })
}

async function fetchProject(id: string): Promise<Project> {
  return projectsApi.get<Project>(`/${id}`)
}

async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  return projectsApi.get<ProjectMember[]>(`/${projectId}/members`)
}

async function fetchProjectDocuments(projectId: string) {
  return projectsApi.get(`/${projectId}/documents`)
}

async function fetchStatusActions(projectId: string) {
  return projectsApi.get(`/${projectId}/status`)
}

// Query Hooks
export function useProjects(filters?: ProjectsFilters) {
  return useQuery({
    queryKey: projectKeys.list(filters || {}),
    queryFn: () => fetchProjects(filters),
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => fetchProject(id),
    enabled: !!id,
  })
}

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: projectKeys.members(projectId),
    queryFn: () => fetchProjectMembers(projectId),
    enabled: !!projectId,
  })
}

export function useProjectDocuments(projectId: string) {
  return useQuery({
    queryKey: projectKeys.documents(projectId),
    queryFn: () => fetchProjectDocuments(projectId),
    enabled: !!projectId,
  })
}

export function useStatusActions(projectId: string) {
  return useQuery({
    queryKey: projectKeys.statusActions(projectId),
    queryFn: () => fetchStatusActions(projectId),
    enabled: !!projectId,
  })
}

// Mutation Hooks
export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: Partial<Project>) => {
      return projectsApi.put(`/${projectId}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      toast({ title: '保存成功' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}

export function useChangeProjectStatus(projectId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (action: 'complete' | 'reactivate' | 'archive' | 'unarchive') => {
      return projectsApi.put(`/${projectId}/status`, { action })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      queryClient.invalidateQueries({ queryKey: projectKeys.statusActions(projectId) })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}

export function useAddProjectMember(projectId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ userIds, role }: { userIds: string[]; role: string }) => {
      return projectsApi.post(`/${projectId}/members`, { userIds, role })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) })
      toast({ title: '成员添加成功' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}

export function useRemoveProjectMember(projectId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (userId: string) => {
      return projectsApi.delete(`/${projectId}/members/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) })
      toast({ title: '成员已移除' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}

export function useUpdateMemberRole(projectId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return projectsApi.put(`/${projectId}/members/${userId}`, { role })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) })
      toast({ title: '角色已更新' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}

export function useUploadDocument(projectId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ file, type, description }: { file: File; type: string; description: string }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      formData.append('description', description)
      return projectsApi.upload(`/${projectId}/documents`, formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.documents(projectId) })
      toast({ title: '文档上传成功' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}

export function useDeleteDocument(projectId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (docId: string) => {
      return projectsApi.delete(`/${projectId}/documents/${docId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.documents(projectId) })
      toast({ title: '文档已删除' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}

// Delete project hook
export function useDeleteProject() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (projectId: string) => {
      return projectsApi.delete(`/${projectId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      toast({ title: '项目已删除' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}

// Create project hook
export function useCreateProject() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: Partial<Project>) => {
      return projectsApi.post('', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      toast({ title: '项目创建成功' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}
