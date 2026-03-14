'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { authFetch } from '@/contexts/AppContext'
import { experimentKeys } from './useExperiments'

// Types
export interface UnlockRequestItem {
  id: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  response: string | null
  createdAt: string
  processedAt: string | null
  experimentId: string
  experiment: {
    id: string
    title: string
    author: {
      id: string
      name: string
    }
  }
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
  } | null
}

// Query Keys
export const unlockRequestKeys = {
  all: ['unlockRequests'] as const,
  list: () => [...unlockRequestKeys.all, 'list'] as const,
}

// Fetch functions
async function fetchUnlockRequests(): Promise<UnlockRequestItem[]> {
  const res = await authFetch('/api/unlock-requests')
  if (!res.ok) throw new Error('获取解锁申请列表失败')
  const data = await res.json()
  return data.requests || []
}

// Query Hooks
export function useUnlockRequests() {
  return useQuery({
    queryKey: unlockRequestKeys.list(),
    queryFn: fetchUnlockRequests,
  })
}

// Mutation Hook for processing unlock requests
export function useProcessUnlockRequest() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ 
      requestId, 
      action, 
      response 
    }: { 
      requestId: string
      action: 'APPROVE' | 'REJECT'
      response?: string 
    }) => {
      const res = await authFetch(`/api/unlock-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, response }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '处理解锁申请失败')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unlockRequestKeys.list() })
      queryClient.invalidateQueries({ queryKey: experimentKeys.lists() })
      toast({ title: '解锁申请已处理' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: error.message })
    },
  })
}
