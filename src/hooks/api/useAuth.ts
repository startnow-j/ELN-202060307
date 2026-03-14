'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { authFetch } from '@/contexts/AppContext'

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
  currentUser: ['currentUser'] as const,
  allUsers: ['users'] as const,
  user: (id: string) => ['users', id] as const,
}

// Check auth status
export function useAuth() {
  return useQuery({
    queryKey: authKeys.currentUser,
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
    queryKey: authKeys.allUsers,
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
      queryClient.setQueryData(authKeys.currentUser, data.user)
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
      // 清除所有本地存储的token（包括内存、sessionStorage、localStorage）
      if (typeof window !== 'undefined') {
        try { sessionStorage.removeItem('auth-token') } catch {}
        try { localStorage.removeItem('auth-token') } catch {}
      }
      
      // Clear all queries on logout
      queryClient.clear()
      toast({ title: '已退出登录' })
      
      // 刷新页面以重置所有状态（包括内存中的token）
      window.location.href = '/'
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
      queryClient.setQueryData(authKeys.currentUser, data.user)
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
