import { Experiment, ReviewStatus, ReviewFeedback, ReviewRequest } from '@/hooks/api'
import { FileEdit, AlertCircle, RefreshCw, Lock } from 'lucide-react'
import React from 'react'

// 审核人类型
export interface Reviewer {
  id: string
  name: string
  email: string
  role: string
  avatar: string | null
  reason: string
}

// 项目关系类型
export interface ProjectRelationForMember {
  id: string
  name: string
  status: string
  ownerId: string
}

// 解锁申请类型
export interface UnlockRequestItem {
  id: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  createdAt: string
  experiment: {
    id: string
    title: string
    author: {
      id: string
      name: string
    }
  }
  requester: {
    id: string
    name: string
    email: string
  }
}

// 视角类型
export type ViewMode = 'default' | 'global'

// 审核状态配置
export const reviewStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: {
    label: '草稿',
    color: 'bg-gray-100 text-gray-700',
    icon: <FileEdit className="w-3.5 h-3.5" />
  },
  PENDING_REVIEW: {
    label: '待审核',
    color: 'bg-yellow-100 text-yellow-700',
    icon: <AlertCircle className="w-3.5 h-3.5" />
  },
  NEEDS_REVISION: {
    label: '需要修改',
    color: 'bg-orange-100 text-orange-700',
    icon: <RefreshCw className="w-3.5 h-3.5" />
  },
  LOCKED: {
    label: '已锁定',
    color: 'bg-green-100 text-green-700',
    icon: <Lock className="w-3.5 h-3.5" />
  },
}

// 视角配置
export const viewModeConfig: Record<ViewMode, { label: string; description: string }> = {
  default: { label: '普通视角', description: '显示我的任务' },
  global: { label: '全局视角', description: '显示所有任务（管理员）' },
}

// 工具函数
export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

// 重新导出需要的类型
export type { Experiment, ReviewStatus, ReviewFeedback, ReviewRequest }
