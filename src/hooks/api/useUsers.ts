'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'

// Types
export interface User {
  id: string
  name: string
  email: string
  role: string
  avatar: string | null
  createdAt: string
}

// Query Keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
  current: () => [...userKeys.all, 'current'] as const,
}

// Fetch functions
async function fetchUsers(): Promise<User[]> {
  const res = await fetch('/api/users')
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

async function fetchCurrentUser(): Promise<User | null> {
  const res = await fetch('/api/auth/me')
  if (!res.ok) return null
  return res.json()
}

// Query Hooks
export function useUsers() {
  return useQuery({
    queryKey: userKeys.lists(),
    queryFn: fetchUsers,
  })
}

export function useCurrentUser() {
  return useQuery({
    queryKey: userKeys.current(),
    queryFn: fetchCurrentUser,
    retry: false,
  })
}

// Mutation Hooks
export function useUpdateUser(id: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update user')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) })
      toast({ title: '用户信息已更新' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}
