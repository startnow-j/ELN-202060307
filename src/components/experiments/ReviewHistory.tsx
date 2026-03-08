'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Send, 
  CheckCircle, 
  XCircle, 
  ArrowUp, 
  Lock,
  CornerDownRight,
  Unlock,
  Clock
} from 'lucide-react'
import { AppUser } from '@/contexts/AppContext'

// 审核请求类型
interface ReviewRequest {
  id: string
  status: string
  note: string | null
  createdAt: string
  updatedAt: string
  reviewerId: string
  reviewer: AppUser
}

// 批注附件类型
interface ReviewAttachment {
  id: string
  name: string
  size: number
  type: string
  createdAt: string
}

// 审核反馈类型
interface ReviewFeedback {
  id: string
  action: string
  feedback: string | null
  createdAt: string
  reviewerId: string
  reviewer: AppUser
  attachments?: ReviewAttachment[]
}

interface ReviewHistoryProps {
  reviewFeedbacks: ReviewFeedback[]
  reviewRequests: ReviewRequest[]
  reviewStatus: string
  reviewedAt?: string | null
  attachmentCount: number
}

// 角色显示名称映射
const roleLabels: Record<string, string> = {
  SUPER_ADMIN: '超级管理员',
  ADMIN: '管理员',
  RESEARCHER: '研究员',
}

// 时间格式化
const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 获取角色显示名称
const getRoleLabel = (role: string): string => {
  return roleLabels[role] || role
}

export function ReviewHistory({ 
  reviewFeedbacks, 
  reviewRequests, 
  reviewStatus, 
  reviewedAt,
  attachmentCount 
}: ReviewHistoryProps) {
  // 构建审核历史事件列表
  const events: Array<{
    id: string  // 唯一标识符
    type: string
    timestamp: string
    user?: AppUser
    target?: AppUser
    feedback?: string | null
    note?: string | null
    status?: string
    attachments?: ReviewAttachment[]
  }> = []

  // 添加审核请求事件（提交审核）
  reviewRequests.forEach(request => {
    if (request.status === 'PENDING' || request.status === 'COMPLETED') {
      events.push({
        id: `request-${request.id}`,
        type: 'SUBMIT',
        timestamp: request.createdAt,
        target: request.reviewer,
        note: request.note,
      })
    }
    if (request.status === 'TRANSFERRED') {
      events.push({
        id: `transfer-${request.id}`,
        type: 'TRANSFER',
        timestamp: request.updatedAt,
        target: request.reviewer,
        note: request.note,
      })
    }
  })

  // 添加审核反馈事件
  reviewFeedbacks.forEach(feedback => {
    let eventType = feedback.action
    
    // 检查是否是解锁相关操作
    if (feedback.action === 'UNLOCK') {
      // 根据 feedback 内容判断解锁操作类型
      const fb = feedback.feedback?.toLowerCase() || ''
      if (fb.includes('批准') || fb.includes('同意')) {
        eventType = 'UNLOCK_APPROVED'
      } else if (fb.includes('拒绝') || fb.includes('驳回')) {
        eventType = 'UNLOCK_REJECTED'
      } else if (fb.includes('申请')) {
        eventType = 'UNLOCK_REQUEST'
      }
    }
    
    events.push({
      id: `feedback-${feedback.id}`,
      type: eventType,
      timestamp: feedback.createdAt,
      user: feedback.reviewer,
      feedback: feedback.feedback,
      attachments: feedback.attachments,
    })
  })

  // 按时间倒序排序（最新的在上面）
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // 如果没有审核历史，且是锁定状态，显示锁定信息
  if (events.length === 0 && reviewStatus === 'LOCKED') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">审核历史</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg border border-green-200 bg-green-50">
            <Lock className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="font-medium text-green-800">记录已锁定</p>
              <p className="text-sm text-green-600">
                锁定时间：{reviewedAt ? formatDateTime(reviewedAt) : '-'}
              </p>
              <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                <span>📎 附件：{attachmentCount} 个</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 如果没有审核历史，不显示
  if (events.length === 0) {
    return null
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // 渲染单个事件卡片
  const renderEventCard = (event: typeof events[0], index: number) => {
    const isLast = index === events.length - 1
    
    let icon: React.ReactNode
    let title: string
    let bgColor: string
    let borderColor: string
    
    switch (event.type) {
      case 'SUBMIT':
        icon = <Send className="w-5 h-5 text-blue-600" />
        title = '提交审核'
        bgColor = 'bg-blue-50'
        borderColor = 'border-blue-200'
        break
      case 'TRANSFER':
        icon = <CornerDownRight className="w-5 h-5 text-purple-600" />
        title = '转交审核'
        bgColor = 'bg-purple-50'
        borderColor = 'border-purple-200'
        break
      case 'APPROVE':
        icon = <CheckCircle className="w-5 h-5 text-green-600" />
        title = '审核通过'
        bgColor = 'bg-green-50'
        borderColor = 'border-green-200'
        break
      case 'REQUEST_REVISION':
        icon = <XCircle className="w-5 h-5 text-orange-600" />
        title = '要求修改'
        bgColor = 'bg-orange-50'
        borderColor = 'border-orange-200'
        break
      case 'UNLOCK_REQUEST':
        icon = <Unlock className="w-5 h-5 text-amber-600" />
        title = '申请解锁'
        bgColor = 'bg-amber-50'
        borderColor = 'border-amber-200'
        break
      case 'UNLOCK_APPROVED':
        icon = <CheckCircle className="w-5 h-5 text-green-600" />
        title = '批准解锁'
        bgColor = 'bg-green-50'
        borderColor = 'border-green-200'
        break
      case 'UNLOCK_REJECTED':
        icon = <XCircle className="w-5 h-5 text-red-600" />
        title = '拒绝解锁'
        bgColor = 'bg-red-50'
        borderColor = 'border-red-200'
        break
      default:
        icon = <Clock className="w-5 h-5 text-gray-600" />
        title = event.type
        bgColor = 'bg-gray-50'
        borderColor = 'border-gray-200'
    }

    return (
      <div key={event.id}>
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${borderColor} ${bgColor}`}>
          {icon}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{title}</p>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDateTime(event.timestamp)}
              </span>
            </div>
            
            {/* 操作人信息 */}
            {event.user && (
              <p className="text-sm text-muted-foreground mt-1">
                {event.user.name}（{getRoleLabel(event.user.role)}）
              </p>
            )}
            
            {/* 目标对象 - 提交给/转交给 */}
            {event.target && (event.type === 'SUBMIT' || event.type === 'TRANSFER') && (
              <p className="text-sm text-muted-foreground mt-1">
                {event.type === 'SUBMIT' ? '提交给' : '转交给'}：{event.target.name}（{getRoleLabel(event.target.role)}）
              </p>
            )}
            
            {/* 留言/反馈 */}
            {(event.note || event.feedback) && (
              <p className="text-sm text-muted-foreground mt-2 bg-white/50 p-2 rounded">
                💬 {event.note || event.feedback}
              </p>
            )}
            
            {/* 批注附件 - 只显示名称，不提供下载 */}
            {event.attachments && event.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground">📎 批注附件：</p>
                <div className="flex flex-wrap gap-2">
                  {event.attachments.map((att) => (
                    <span
                      key={att.id}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/50 rounded border border-gray-200"
                      title={att.name}
                    >
                      <span className="truncate max-w-[150px]">{att.name}</span>
                      <span className="text-muted-foreground">({formatFileSize(att.size)})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 向上箭头指示时间顺序 */}
        {!isLast && (
          <div className="flex justify-center py-1">
            <ArrowUp className="w-4 h-4 text-muted-foreground/50" />
          </div>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">审核历史</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {events.map((event, index) => renderEventCard(event, index))}
        
        {/* 如果是锁定状态，显示锁定信息和附件数量 */}
        {reviewStatus === 'LOCKED' && (
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span>记录已锁定，附件：{attachmentCount} 个</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
