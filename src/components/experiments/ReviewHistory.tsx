'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUp, Lock } from 'lucide-react'
import { AppUser, ReviewFeedback, ReviewRequest, UnlockRequest } from '@/contexts/AppContext'

// 角色显示名称映射
const roleLabels: Record<string, string> = {
  // 系统角色
  SUPER_ADMIN: '超级管理员',
  ADMIN: '管理员',
  RESEARCHER: '研究员',
  // 项目角色
  PROJECT_LEAD: '项目负责人',
  MEMBER: '参与人',
  VIEWER: '观察员',
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

// 获取角色显示名称（优先项目角色）
const getRoleLabel = (user: AppUser | null | undefined): string => {
  if (!user) return ''
  // 优先显示项目角色（如果存在）
  if (user.projectRole) {
    return roleLabels[user.projectRole] || user.projectRole
  }
  // 回退到系统角色
  return roleLabels[user.role] || user.role
}

// 获取用户显示文本
const getUserDisplay = (user: AppUser | null | undefined): string => {
  if (!user) return '未知'
  const roleLabel = getRoleLabel(user)
  return `${user.name}（${roleLabel}）`
}

// 事件类型定义
type EventType = 
  | 'SUBMIT'           // 提交审核
  | 'TRANSFER'         // 转交审核
  | 'APPROVE'          // 审核通过
  | 'REQUEST_REVISION' // 要求修改
  | 'LOCK'             // 记录锁定
  | 'UNLOCK_REQUEST'   // 申请解锁
  | 'UNLOCK_APPROVED'  // 批准解锁
  | 'UNLOCK_REJECTED'  // 拒绝解锁

// 历史事件接口
interface HistoryEvent {
  id: string
  stepNumber: number
  type: EventType
  timestamp: string
  actor?: AppUser | null           // 操作人
  targets?: AppUser[]              // 目标人列表（支持多个）
  message?: string | null          // 留言/原因/意见
  attachments?: string[]           // 附件文件名列表
}

interface ReviewHistoryProps {
  reviewFeedbacks: ReviewFeedback[]
  reviewRequests: ReviewRequest[]
  unlockRequests: UnlockRequest[]
  reviewStatus: string
  reviewedAt?: string | null
  attachmentCount: number
  author: AppUser
}

export function ReviewHistory({ 
  reviewFeedbacks, 
  reviewRequests, 
  unlockRequests,
  reviewStatus, 
  reviewedAt,
  attachmentCount,
  author
}: ReviewHistoryProps) {
  // 构建审核历史事件列表
  const events: HistoryEvent[] = []

  // 调试：打印解锁请求数据
  console.log('ReviewHistory - unlockRequests:', unlockRequests)
  console.log('ReviewHistory - reviewFeedbacks:', reviewFeedbacks)
  console.log('ReviewHistory - reviewRequests:', reviewRequests)

  // 1. 处理 ReviewFeedback（按时间顺序）
  const sortedFeedbacks = [...reviewFeedbacks].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  
  // 2. 处理 ReviewRequest（用于获取提交审核的目标审核人）
  const sortedRequests = [...reviewRequests].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  // 3. 处理 UnlockRequest
  const sortedUnlockRequests = [...unlockRequests].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  // 查找提交审核的目标审核人（可能多个）
  // 注意：ReviewRequest 的状态可能在审核完成后改变，所以不依赖状态来判断
  const findSubmitTargets = (submitTimestamp: string): AppUser[] => {
    const submitTime = new Date(submitTimestamp).getTime()
    const targets: AppUser[] = []
    const addedIds = new Set<string>()
    
    // 找到在这个 SUBMIT 时间点（±3秒）创建的所有 ReviewRequest
    // 这表示这些审核人是本次提交的目标
    for (const rr of sortedRequests) {
      const rrTime = new Date(rr.createdAt).getTime()
      // 时间差在3秒内，不检查状态（因为状态可能已经改变）
      if (Math.abs(rrTime - submitTime) <= 3000) {
        if (!addedIds.has(rr.reviewer.id)) {
          targets.push(rr.reviewer)
          addedIds.add(rr.reviewer.id)
        }
      }
    }
    return targets
  }

  // 查找 TRANSFER 目标
  const findTransferTarget = (transferTimestamp: string): AppUser | null => {
    const transferTime = new Date(transferTimestamp).getTime()
    
    for (const rr of sortedRequests) {
      const rrTime = new Date(rr.createdAt).getTime()
      if (rrTime > transferTime && rrTime < transferTime + 10000 && rr.status === 'PENDING') {
        return rr.reviewer
      }
    }
    return null
  }

  // 处理每个 ReviewFeedback
  sortedFeedbacks.forEach(feedback => {
    switch (feedback.action) {
      case 'SUBMIT': {
        // 提交审核：操作人是作者，目标是审核人（可能多个）
        const targetReviewers = findSubmitTargets(feedback.createdAt)
        
        events.push({
          id: `submit-${feedback.id}`,
          stepNumber: 0,
          type: 'SUBMIT',
          timestamp: feedback.createdAt,
          actor: author,
          targets: targetReviewers.length > 0 ? targetReviewers : undefined,
          message: feedback.feedback,
        })
        break
      }
      
      case 'TRANSFER': {
        const targetUser = findTransferTarget(feedback.createdAt)
        events.push({
          id: `transfer-${feedback.id}`,
          stepNumber: 0,
          type: 'TRANSFER',
          timestamp: feedback.createdAt,
          actor: feedback.reviewer,
          targets: targetUser ? [targetUser] : undefined,
          message: feedback.feedback,
        })
        break
      }
      
      case 'APPROVE': {
        events.push({
          id: `approve-${feedback.id}`,
          stepNumber: 0,
          type: 'APPROVE',
          timestamp: feedback.createdAt,
          actor: feedback.reviewer,
          message: feedback.feedback,
        })
        
        // 审核通过后添加锁定事件
        events.push({
          id: `lock-${feedback.id}`,
          stepNumber: 0,
          type: 'LOCK',
          timestamp: feedback.createdAt,
          message: `共 ${attachmentCount} 个附件`,
        })
        break
      }
      
      case 'REQUEST_REVISION': {
        events.push({
          id: `revision-${feedback.id}`,
          stepNumber: 0,
          type: 'REQUEST_REVISION',
          timestamp: feedback.createdAt,
          actor: feedback.reviewer,
          message: feedback.feedback,
          attachments: feedback.attachments?.map(a => a.name),
        })
        break
      }
      
      case 'UNLOCK': {
        // 解锁相关操作由 unlockRequests 处理，这里跳过
        break
      }
    }
  })

  // 处理解锁申请
  sortedUnlockRequests.forEach(ur => {
    console.log('Processing unlock request:', ur.id, ur.status, ur.requester?.name)
    
    // 申请解锁
    events.push({
      id: `unlock-request-${ur.id}`,
      stepNumber: 0,
      type: 'UNLOCK_REQUEST',
      timestamp: ur.createdAt,
      actor: ur.requester,
      message: ur.reason,
    })
    
    // 处理结果
    if (ur.status === 'APPROVED' && ur.processor) {
      events.push({
        id: `unlock-approved-${ur.id}`,
        stepNumber: 0,
        type: 'UNLOCK_APPROVED',
        timestamp: ur.processedAt || ur.createdAt,
        actor: ur.processor,
        message: ur.response,
      })
    } else if (ur.status === 'REJECTED' && ur.processor) {
      events.push({
        id: `unlock-rejected-${ur.id}`,
        stepNumber: 0,
        type: 'UNLOCK_REJECTED',
        timestamp: ur.processedAt || ur.createdAt,
        actor: ur.processor,
        message: ur.response,
      })
    }
  })

  // 按时间排序（正序，最早的在前）
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  
  // 分配步骤编号
  events.forEach((event, index) => {
    event.stepNumber = index + 1
  })

  // 如果没有审核历史，且是锁定状态，显示锁定信息
  if (events.length === 0 && reviewStatus === 'LOCKED') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">审核历史</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50">
            <Lock className="w-5 h-5 text-gray-600" />
            <div className="flex-1">
              <p className="font-medium text-gray-800">记录已锁定</p>
              <p className="text-sm text-gray-600">
                锁定时间：{reviewedAt ? formatDateTime(reviewedAt) : '-'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                附件：{attachmentCount} 个
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

  // 获取事件描述文本
  const getEventDescription = (event: HistoryEvent): string => {
    const actor = getUserDisplay(event.actor)
    
    // 格式化多个目标人
    const formatTargets = (targets: AppUser[] | undefined): string => {
      if (!targets || targets.length === 0) return ''
      if (targets.length === 1) {
        return getUserDisplay(targets[0])
      }
      // 多个目标人：显示所有名字，用顿号分隔
      const names = targets.map(t => t.name).join('、')
      return names
    }
    
    const targetStr = formatTargets(event.targets)
    
    switch (event.type) {
      case 'SUBMIT':
        return targetStr ? `${actor}向${targetStr}提交审核` : `${actor}提交审核`
      case 'TRANSFER':
        return targetStr ? `${actor}向${targetStr}转交审核` : `${actor}转交审核`
      case 'APPROVE':
        return `${actor}通过审批`
      case 'REQUEST_REVISION':
        return `${actor}要求修改`
      case 'LOCK':
        return `记录锁定`
      case 'UNLOCK_REQUEST':
        return `${actor}申请解锁`
      case 'UNLOCK_APPROVED':
        return `${actor}批准解锁`
      case 'UNLOCK_REJECTED':
        return `${actor}拒绝解锁`
      default:
        return '未知操作'
    }
  }

  // 渲染单个事件卡片
  const renderEventCard = (event: HistoryEvent, index: number, totalEvents: number) => {
    const isLast = index === totalEvents - 1
    
    // 颜色方案
    let borderColor: string
    let bgColor: string
    
    switch (event.type) {
      case 'SUBMIT':
      case 'TRANSFER':
      case 'LOCK':
        borderColor = 'border-gray-300'
        bgColor = 'bg-gray-50'
        break
      case 'APPROVE':
      case 'UNLOCK_APPROVED':
        borderColor = 'border-green-300'
        bgColor = 'bg-green-50'
        break
      case 'REQUEST_REVISION':
      case 'UNLOCK_REQUEST':
      case 'UNLOCK_REJECTED':
        borderColor = 'border-red-300'
        bgColor = 'bg-red-50'
        break
      default:
        borderColor = 'border-gray-300'
        bgColor = 'bg-gray-50'
    }

    return (
      <div key={event.id}>
        <div className={`p-4 rounded-lg border ${borderColor} ${bgColor}`}>
          {/* 步骤编号和描述 */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm">
              <span className="font-medium">第{event.stepNumber}步：</span>
              <span className="text-gray-700">{getEventDescription(event)}</span>
            </p>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDateTime(event.timestamp)}
            </span>
          </div>
          
          {/* 留言/原因/意见 */}
          {event.message && event.type !== 'LOCK' && (
            <p className="text-sm text-muted-foreground mt-2 bg-white/50 p-2 rounded">
              {event.type === 'SUBMIT' ? '留言' : 
               event.type === 'TRANSFER' ? '原因' :
               event.type === 'UNLOCK_REQUEST' ? '原因' :
               event.type === 'UNLOCK_APPROVED' || event.type === 'UNLOCK_REJECTED' ? '原因' :
               event.type === 'REQUEST_REVISION' ? '原因' :
               '意见'}：{event.message}
            </p>
          )}
          
          {/* 锁定状态显示附件数量 */}
          {event.type === 'LOCK' && event.message && (
            <p className="text-sm text-muted-foreground mt-2">
              状态：{event.message}
            </p>
          )}
          
          {/* 批注附件 - 只显示文件名 */}
          {event.attachments && event.attachments.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">附件：{event.attachments.join('、')}</p>
            </div>
          )}
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
        {/* 反转数组，使最新的在上面 */}
        {[...events].reverse().map((event, index) => 
          renderEventCard(event, index, events.length)
        )}
      </CardContent>
    </Card>
  )
}
