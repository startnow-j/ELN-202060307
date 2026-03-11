'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { authFetch, getStoredToken } from '@/contexts/AppContext'

// Types
export interface User {
  id: string
  email: string
  name: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'RESEARCHER'
  avatar: string | null
  projectRole?: string | null
}

// Query Keys
export const authKeys = {
  user: ['currentUser'] as const,
  users: ['users'] as const,
  user: (id: string) => ['users', id] as const,
}

// Check auth status
export function useAuth() {
  return useQuery({
    queryKey: authKeys.user,
    queryFn: async (): Promise<User | null> => {
      const res = await authFetch('/api/auth/me')
      if (!res.ok) return null
      const data = await res.json()
      return data.user
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get all users (for admin operations)
export function useUsers(enabled = false) {
  return useQuery({
    queryKey: authKeys.users,
    queryFn: async (): Promise<User[]> => {
      const res = await authFetch('/api/users')
      if (!res.ok) throw new Error('获取用户列表失败')
      return res.json()
    },
    enabled,
  })
}

// Login mutation
export function useLogin() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '登录失败')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.user, data.user)
      // Refresh all data after login
      queryClient.invalidateQueries()
      toast({ title: '登录成功' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}

// Logout mutation
export function useLogout() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async () => {
      await authFetch('/api/auth/logout', { method: 'POST' })
    },
    onSettled: () => {
      // Clear all queries on logout
      queryClient.clear()
      toast({ title: '已退出登录' })
    },
  })
}

// Register mutation
export function useRegister() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ name, email, password }: { name: string; email: string; password: string }) => {
      const res = await authFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '注册失败')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.user, data.user)
      toast({ title: '注册成功' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}

// Helper hook to check if user is logged in
export function useIsLoggedIn() {
  const { data: user, isLoading } = useAuth()
  return {
    isLoggedIn: !!user,
    isLoading,
    user,
  }
}

// Helper hook to check user role
export function useUserRole() {
  const { data: user } = useAuth()
  return {
    role: user?.role,
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
    isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
    isResearcher: user?.role === 'RESEARCHER',
  }
}
