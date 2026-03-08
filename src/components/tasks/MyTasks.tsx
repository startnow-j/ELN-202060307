'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  FlaskConical,
  ChevronRight,
  Clock,
  Filter,
  Lock,
  AlertCircle,
  FileEdit,
  CheckCircle,
  RefreshCw,
  FolderOpen,
  Edit,
  MessageSquare,
  Unlock,
  Send,
  X,
  Eye,
  History,
  Inbox,
  Globe,
  User,
  ChevronDown,
  Users,
  ArrowRightLeft,
  XCircle,
  Download,
  Upload,
  FileText,
  Paperclip,
  Trash2,
  Loader2
} from 'lucide-react'
import { useApp, Experiment, ReviewStatus, ReviewFeedback, AppUser } from '@/contexts/AppContext'
import { useToast } from '@/hooks/use-toast'

interface MyTasksProps {
  onViewExperiment: (id: string) => void
  onEditExperiment: (id: string) => void
}

// 审核人类型
interface Reviewer {
  id: string
  name: string
  email: string
  role: string
  avatar: string | null
  reason: string
}

// 解锁申请类型
interface UnlockRequestItem {
  id: string
  reason: string
  createdAt: string
  experiment: {
    id: string
    title: string
    author: AppUser
  }
  requester: AppUser
}

// 审核状态配置
const reviewStatusConfig: Record<ReviewStatus, { label: string; color: string; icon: React.ReactNode }> = {
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

// 视角类型
type ViewMode = 'default' | 'global'

// 视角配置
const viewModeConfig: Record<ViewMode, { label: string; description: string; icon: React.ReactNode }> = {
  default: { label: '普通视角', description: '显示我的任务', icon: <User className="w-4 h-4" /> },
  global: { label: '全局视角', description: '显示所有任务（管理员）', icon: <Globe className="w-4 h-4" /> },
}

export function MyTasks({ onViewExperiment, onEditExperiment }: MyTasksProps) {
  const { currentUser, reviewExperiment } = useApp()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('drafts')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [projects, setProjects] = useState<{ id: string; ownerId: string }[]>([])
  
  // 是否是管理员
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN'
  
  // 视角状态 - 所有用户默认普通视角
  const [viewMode, setViewMode] = useState<ViewMode>('default')

  // 审核对话框状态
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewingExperiment, setReviewingExperiment] = useState<Experiment | null>(null)
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REQUEST_REVISION' | 'TRANSFER'>('APPROVE')
  const [reviewFeedback, setReviewFeedback] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewers, setReviewers] = useState<Reviewer[]>([])
  const [selectedTransferUser, setSelectedTransferUser] = useState<string>('')
  const [isLoadingReviewers, setIsLoadingReviewers] = useState(false)
  const [reviewAttachments, setReviewAttachments] = useState<File[]>([])
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [uploadedReviewAttachments, setUploadedReviewAttachments] = useState<Array<{id: string; name: string; path: string}>>([])

  // 解锁申请对话框状态
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false)
  const [unlockingExperiment, setUnlockingExperiment] = useState<Experiment | null>(null)
  const [unlockReason, setUnlockReason] = useState('')
  const [isSubmittingUnlock, setIsSubmittingUnlock] = useState(false)

  // 处理解锁申请对话框状态
  const [processUnlockDialogOpen, setProcessUnlockDialogOpen] = useState(false)
  const [processingUnlockRequest, setProcessingUnlockRequest] = useState<UnlockRequestItem | null>(null)
  const [processUnlockAction, setProcessUnlockAction] = useState<'APPROVE' | 'REJECT'>('APPROVE')
  const [processUnlockResponse, setProcessUnlockResponse] = useState('')
  const [isProcessingUnlock, setIsProcessingUnlock] = useState(false)

  // 解锁申请Tab状态
  const [unlockRequests, setUnlockRequests] = useState<UnlockRequestItem[]>([])
  const [isLoadingUnlockRequests, setIsLoadingUnlockRequests] = useState(false)
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null)

  // 反馈历史对话框
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [feedbackExperiment, setFeedbackExperiment] = useState<Experiment | null>(null)

  // 根据视角计算各类实验数量
  const useGlobalView = viewMode === 'global' && isAdmin
  
  // 加载数据
  const loadData = useCallback(async (mode: ViewMode) => {
    setIsLoading(true)
    try {
      // 并行获取实验和项目数据
      const [experimentsRes, projectsRes] = await Promise.all([
        fetch(`/api/experiments?viewMode=${mode}`),
        fetch(`/api/projects?viewMode=${mode}`)
      ])
      
      if (experimentsRes.ok) {
        const data = await experimentsRes.json()
        setExperiments(data)
      }
      if (projectsRes.ok) {
        const data = await projectsRes.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Load data error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 加载解锁申请列表
  const loadUnlockRequests = useCallback(async () => {
    // 只有管理员或项目负责人可以处理解锁申请
    if (!currentUser) return
    // 使用当前 projects 状态值
    const currentProjects = projects
    const projectsAsLead = currentProjects.filter(p => p.ownerId === currentUser.id)
    if (!isAdmin && projectsAsLead.length === 0) return
    setIsLoadingUnlockRequests(true)
    try {
      const res = await fetch('/api/unlock-requests')
      if (res.ok) {
        const data = await res.json()
        setUnlockRequests(data.requests || [])
      }
    } catch (error) {
      console.error('Load unlock requests error:', error)
    } finally {
      setIsLoadingUnlockRequests(false)
    }
  }, [isAdmin, currentUser?.id])
  
  // 初始加载和视角切换时重新加载
  useEffect(() => {
    if (currentUser) {
      loadData(viewMode)
    }
  }, [viewMode, currentUser, loadData])
  
  // 当 projects 加载完成后再加载解锁申请
  useEffect(() => {
    if (currentUser && projects.length > 0) {
      loadUnlockRequests()
    }
  }, [currentUser?.id, projects.length])

  // 作为项目负责人的项目
  const myProjectsAsLead = projects.filter(p => p.ownerId === currentUser?.id)
  
  // 我的草稿
  const myDrafts = useGlobalView
    ? experiments.filter(e => e.reviewStatus === 'DRAFT')
    : experiments.filter(e => e.reviewStatus === 'DRAFT' && e.authorId === currentUser?.id)

  // 待我审核 - 普通视角下显示：
  // 1. 被选择为审核人的实验（有 ReviewRequest 且状态为 PENDING）
  // 2. 如果没有选择审核人，则项目 owner 可以审核
  const pendingMyReview = useGlobalView
    ? experiments.filter(e => e.reviewStatus === 'PENDING_REVIEW')
    : experiments.filter(e => {
        if (e.reviewStatus !== 'PENDING_REVIEW') return false
        
        // 检查是否有被选择的审核人
        const pendingReviewRequests = e.reviewRequests?.filter(rr => rr.status === 'PENDING') || []
        
        if (pendingReviewRequests.length > 0) {
          // 有被选择的审核人，只有被选择的审核人能看到
          return pendingReviewRequests.some(rr => rr.reviewerId === currentUser?.id)
        } else {
          // 没有被选择的审核人，项目 owner 可以审核
          // 检查用户是否是实验关联项目的 owner
          return e.projects?.some(p => p.ownerId === currentUser?.id)
        }
      })

  // 待我修改
  const needsMyRevision = useGlobalView
    ? experiments.filter(e => e.reviewStatus === 'NEEDS_REVISION')
    : experiments.filter(e => e.reviewStatus === 'NEEDS_REVISION' && e.authorId === currentUser?.id)

  // 已锁定
  const myLockedRecords = useGlobalView
    ? experiments.filter(e => e.reviewStatus === 'LOCKED')
    : experiments.filter(e => e.reviewStatus === 'LOCKED' && e.authorId === currentUser?.id)

  // 刷新数据
  const handleRefresh = async () => {
    await loadData(viewMode)
  }

  // 打开审核对话框
  const openReviewDialog = async (experiment: Experiment) => {
    setReviewingExperiment(experiment)
    setReviewAction('APPROVE')
    setReviewFeedback('')
    setSelectedTransferUser('')
    setReviewers([])
    setReviewAttachments([])
    setUploadedReviewAttachments([])
    setReviewDialogOpen(true)

    // 获取可转交的审核人列表
    setIsLoadingReviewers(true)
    try {
      const res = await fetch(`/api/experiments/${experiment.id}/reviewers`)
      if (res.ok) {
        const data = await res.json()
        setReviewers(data.reviewers || [])
      }
    } catch (error) {
      console.error('Failed to load reviewers:', error)
    } finally {
      setIsLoadingReviewers(false)
    }
  }

  // 处理文件选择
  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setReviewAttachments(prev => [...prev, ...Array.from(files)])
    }
  }

  // 移除选中的附件
  const removeAttachment = (index: number) => {
    setReviewAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // 下载附件
  const handleDownloadAttachment = async (attachmentId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/attachments/${attachmentId}/download`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        toast({
          variant: 'destructive',
          title: '下载失败',
          description: '请稍后重试',
        })
      }
    } catch (error) {
      console.error('Download error:', error)
      toast({
        variant: 'destructive',
        title: '下载失败',
        description: '请稍后重试',
      })
    }
  }

  // 提交审核
  const handleSubmitReview = async () => {
    if (!reviewingExperiment) return
    
    // 转交审核必须选择转交目标
    if (reviewAction === 'TRANSFER' && !selectedTransferUser) {
      toast({
        variant: 'destructive',
        title: '请选择转交目标',
      })
      return
    }
    
    setIsSubmittingReview(true)
    try {
      // 1. 先上传批注附件
      let uploadedAttachmentIds: string[] = []
      if (reviewAttachments.length > 0) {
        setIsUploadingAttachment(true)
        try {
          for (const file of reviewAttachments) {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('experimentId', reviewingExperiment.id)
            
            const uploadRes = await fetch('/api/attachments', {
              method: 'POST',
              body: formData
            })
            
            if (uploadRes.ok) {
              const attachmentData = await uploadRes.json()
              uploadedAttachmentIds.push(attachmentData.id)
            } else {
              console.error('Failed to upload attachment:', file.name)
            }
          }
        } finally {
          setIsUploadingAttachment(false)
        }
      }
      
      // 2. 提交审核（包含附件 ID）
      const success = await reviewExperiment(
        reviewingExperiment.id, 
        reviewAction, 
        reviewFeedback || undefined,
        reviewAction === 'TRANSFER' ? selectedTransferUser : undefined,
        uploadedAttachmentIds.length > 0 ? uploadedAttachmentIds : undefined
      )
      
      if (success) {
        const messages: Record<string, { title: string; description: string }> = {
          APPROVE: { title: '审核通过', description: '实验记录已锁定' },
          REQUEST_REVISION: { title: '已要求修改', description: '已通知作者进行修改' },
          TRANSFER: { title: '已转交审核', description: '已转交给其他审核人' },
        }
        toast({
          title: messages[reviewAction]?.title,
          description: messages[reviewAction]?.description,
        })
        setReviewDialogOpen(false)
        // 刷新数据
        await loadData(viewMode)
      } else {
        toast({
          variant: 'destructive',
          title: '操作失败',
          description: '请稍后重试',
        })
      }
    } finally {
      setIsSubmittingReview(false)
    }
  }

  // 打开解锁申请对话框
  const openUnlockDialog = (experiment: Experiment) => {
    setUnlockingExperiment(experiment)
    setUnlockReason('')
    setUnlockDialogOpen(true)
  }

  // 提交解锁申请
  const handleSubmitUnlock = async () => {
    if (!unlockingExperiment || !unlockReason.trim()) {
      toast({
        variant: 'destructive',
        title: '请填写解锁原因',
      })
      return
    }
    
    setIsSubmittingUnlock(true)
    try {
      // TODO: 实现解锁申请API
      const res = await fetch(`/api/experiments/${unlockingExperiment.id}/unlock-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: unlockReason }),
      })
      
      if (res.ok) {
        toast({
          title: '解锁申请已提交',
          description: '请等待审核人处理',
        })
        setUnlockDialogOpen(false)
      } else {
        toast({
          variant: 'destructive',
          title: '提交失败',
          description: '请稍后重试',
        })
      }
    } finally {
      setIsSubmittingUnlock(false)
    }
  }

  // 处理解锁申请（批准/拒绝）
  const openProcessUnlockDialog = (request: UnlockRequestItem, action: 'APPROVE' | 'REJECT') => {
    setProcessingUnlockRequest(request)
    setProcessUnlockAction(action)
    setProcessUnlockResponse('')
    setProcessUnlockDialogOpen(true)
  }

  // 提交处理解锁申请
  const handleSubmitProcessUnlock = async () => {
    if (!processingUnlockRequest || !processUnlockResponse.trim()) {
      toast({
        variant: 'destructive',
        title: '请填写处理理由',
      })
      return
    }

    setIsProcessingUnlock(true)
    try {
      const res = await fetch(`/api/experiments/${processingUnlockRequest.experiment.id}/unlock-request`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: processingUnlockRequest.id,
          action: processUnlockAction,
          response: processUnlockResponse.trim()
        }),
      })
      
      if (res.ok) {
        toast({
          title: processUnlockAction === 'APPROVE' ? '已批准解锁' : '已拒绝解锁',
          description: processUnlockAction === 'APPROVE' 
            ? '实验记录已解锁，作者可以继续编辑' 
            : '解锁申请已被拒绝',
        })
        setProcessUnlockDialogOpen(false)
        // 刷新解锁申请列表
        await loadUnlockRequests()
      } else {
        const data = await res.json()
        toast({
          variant: 'destructive',
          title: '处理失败',
          description: data.error || '请稍后重试',
        })
      }
    } finally {
      setIsProcessingUnlock(false)
    }
  }

  // 打开反馈历史对话框
  const openFeedbackDialog = (experiment: Experiment) => {
    setFeedbackExperiment(experiment)
    setFeedbackDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">我的任务</h1>
          <p className="text-muted-foreground mt-1">
            {useGlobalView ? '管理所有用户的任务（全局视角）' : '管理您的实验记录任务和审核工作'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 视角切换（仅管理员可见） */}
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  {viewModeConfig[viewMode].icon}
                  {viewModeConfig[viewMode].label}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>切换视角</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(viewModeConfig).map(([mode, config]) => (
                  <DropdownMenuItem
                    key={mode}
                    onClick={() => setViewMode(mode as ViewMode)}
                    className={viewMode === mode ? 'bg-muted' : ''}
                  >
                    <div className="flex items-center gap-2">
                      {config.icon}
                      <div>
                        <p className="font-medium">{config.label}</p>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="outline" size="icon" onClick={() => loadData(viewMode)} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Tab 分类 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="drafts" className="gap-2">
            <FileEdit className="w-4 h-4" />
            <span className="hidden sm:inline">{useGlobalView ? '所有草稿' : '我的草稿'}</span>
            <Badge variant="secondary" className="ml-1">
              {myDrafts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending-review" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{useGlobalView ? '待审核' : '待我审核'}</span>
            <Badge variant="secondary" className="ml-1">
              {pendingMyReview.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="needs-revision" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">{useGlobalView ? '待修改' : '待我修改'}</span>
            <Badge variant="secondary" className="ml-1">
              {needsMyRevision.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="locked" className="gap-2">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">{useGlobalView ? '已锁定' : '已锁定'}</span>
            <Badge variant="secondary" className="ml-1">
              {myLockedRecords.length}
            </Badge>
          </TabsTrigger>
          {/* 解锁申请Tab - 只有管理员或项目负责人可见 */}
          {(isAdmin || myProjectsAsLead.length > 0) && (
            <TabsTrigger value="unlock-requests" className="gap-2">
              <Unlock className="w-4 h-4" />
              <span className="hidden sm:inline">解锁申请</span>
              <Badge variant="secondary" className="ml-1">
                {unlockRequests.length}
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {/* 搜索框 */}
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索实验记录..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 我的草稿 */}
        <TabsContent value="drafts">
          {myDrafts.length > 0 ? (
            <div className="space-y-4">
              {myDrafts
                .filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((experiment) => (
                  <ExperimentCard
                    key={experiment.id}
                    experiment={experiment}
                    statusConfig={reviewStatusConfig}
                    onAction={() => onEditExperiment(experiment.id)}
                    actionLabel="继续编辑"
                    actionIcon={<Edit className="w-4 h-4" />}
                    actionVariant="default"
                    formatDate={formatDate}
                    getScoreColor={getScoreColor}
                    showAuthor={useGlobalView}
                  />
                ))}
            </div>
          ) : (
            <EmptyState 
              icon={<FileEdit className="w-12 h-12 text-muted-foreground" />}
              title="暂无草稿"
              description={useGlobalView ? "系统中没有草稿实验记录" : "您创建的草稿实验记录将显示在这里"}
            />
          )}
        </TabsContent>

        {/* 待我审核 */}
        <TabsContent value="pending-review">
          {pendingMyReview.length > 0 ? (
            <div className="space-y-4">
              {pendingMyReview
                .filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((experiment) => (
                  <Card key={experiment.id} className="hover:border-primary/40 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <FlaskConical className="w-5 h-5 text-primary flex-shrink-0" />
                            <h3 className="font-semibold text-lg truncate">{experiment.title}</h3>
                            <Badge className={reviewStatusConfig[experiment.reviewStatus].color}>
                              {reviewStatusConfig[experiment.reviewStatus].label}
                            </Badge>
                          </div>
                          
                          <p className="text-muted-foreground line-clamp-2 mb-3">
                            {experiment.summary || '暂无摘要'}
                          </p>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span>作者: {experiment.author.name}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              提交于 {formatDate(experiment.submittedAt || experiment.updatedAt)}
                            </span>
                            {experiment.projects.length > 0 && (
                              <span className="flex items-center gap-1">
                                <FolderOpen className="w-4 h-4" />
                                {experiment.projects.map(p => p.name).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 ml-4">
                          {/* 完整度评分 */}
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-muted-foreground">完整度</span>
                            <span className={`text-lg font-bold ${getScoreColor(experiment.completenessScore)}`}>
                              {experiment.completenessScore}%
                            </span>
                            <Progress value={experiment.completenessScore} className="w-16 h-1.5" />
                          </div>
                          
                          {/* 操作按钮 */}
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onViewExperiment(experiment.id)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              查看
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openReviewDialog(experiment)}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              审核
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <EmptyState 
              icon={<CheckCircle className="w-12 h-12 text-muted-foreground" />}
              title="暂无待审核记录"
              description="需要您审核的实验记录将显示在这里"
            />
          )}
        </TabsContent>

        {/* 待我修改 */}
        <TabsContent value="needs-revision">
          {needsMyRevision.length > 0 ? (
            <div className="space-y-4">
              {needsMyRevision
                .filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((experiment) => (
                  <Card key={experiment.id} className="hover:border-primary/40 transition-colors border-orange-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <FlaskConical className="w-5 h-5 text-primary flex-shrink-0" />
                            <h3 className="font-semibold text-lg truncate">{experiment.title}</h3>
                            <Badge className={reviewStatusConfig[experiment.reviewStatus].color}>
                              {reviewStatusConfig[experiment.reviewStatus].label}
                            </Badge>
                          </div>
                          
                          <p className="text-muted-foreground line-clamp-2 mb-3">
                            {experiment.summary || '暂无摘要'}
                          </p>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            {useGlobalView && (
                              <span>作者: {experiment.author.name}</span>
                            )}
                            <span>审核人: {experiment.projects[0]?.ownerId ? '项目负责人' : '管理员'}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              要求修改于 {formatDate(experiment.reviewedAt || experiment.updatedAt)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 ml-4">
                          {/* 完整度评分 */}
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-muted-foreground">完整度</span>
                            <span className={`text-lg font-bold ${getScoreColor(experiment.completenessScore)}`}>
                              {experiment.completenessScore}%
                            </span>
                            <Progress value={experiment.completenessScore} className="w-16 h-1.5" />
                          </div>
                          
                          {/* 操作按钮 */}
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openFeedbackDialog(experiment)}
                            >
                              <History className="w-4 h-4 mr-1" />
                              查看反馈
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => onEditExperiment(experiment.id)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              去修改
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <EmptyState 
              icon={<RefreshCw className="w-12 h-12 text-muted-foreground" />}
              title="暂无待修改记录"
              description={useGlobalView ? "系统中没有被要求修改的实验记录" : "被要求修改的实验记录将显示在这里"}
            />
          )}
        </TabsContent>

        {/* 我的已锁定记录 */}
        <TabsContent value="locked">
          {myLockedRecords.length > 0 ? (
            <div className="space-y-4">
              {myLockedRecords
                .filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((experiment) => (
                  <Card key={experiment.id} className="hover:border-primary/40 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <FlaskConical className="w-5 h-5 text-primary flex-shrink-0" />
                            <h3 className="font-semibold text-lg truncate">{experiment.title}</h3>
                            <Badge className={reviewStatusConfig[experiment.reviewStatus].color}>
                              {reviewStatusConfig[experiment.reviewStatus].icon}
                              <span className="ml-1">{reviewStatusConfig[experiment.reviewStatus].label}</span>
                            </Badge>
                          </div>
                          
                          <p className="text-muted-foreground line-clamp-2 mb-3">
                            {experiment.summary || '暂无摘要'}
                          </p>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            {useGlobalView && (
                              <span>作者: {experiment.author.name}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              锁定于 {formatDate(experiment.reviewedAt || experiment.updatedAt)}
                            </span>
                            {experiment.projects.length > 0 && (
                              <span className="flex items-center gap-1">
                                <FolderOpen className="w-4 h-4" />
                                {experiment.projects.map(p => p.name).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 ml-4">
                          {/* 完整度评分 */}
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-muted-foreground">完整度</span>
                            <span className={`text-lg font-bold ${getScoreColor(experiment.completenessScore)}`}>
                              {experiment.completenessScore}%
                            </span>
                            <Progress value={experiment.completenessScore} className="w-16 h-1.5" />
                          </div>
                          
                          {/* 操作按钮 */}
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onViewExperiment(experiment.id)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              查看
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openUnlockDialog(experiment)}
                            >
                              <Unlock className="w-4 h-4 mr-1" />
                              申请解锁
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <EmptyState 
              icon={<Lock className="w-12 h-12 text-muted-foreground" />}
              title="暂无已锁定记录"
              description={useGlobalView ? "系统中没有已锁定的实验记录" : "您已锁定的实验记录将显示在这里"}
            />
          )}
        </TabsContent>

        {/* 解锁申请处理Tab */}
        <TabsContent value="unlock-requests">
          {isLoadingUnlockRequests ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : unlockRequests.length > 0 ? (
            <div className="space-y-4">
              {unlockRequests.map((request) => (
                <Card key={request.id} className="border-amber-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <Unlock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                          <h3 className="font-semibold text-lg truncate">{request.experiment.title}</h3>
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                            待处理
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                          <span>申请人: {request.requester.name}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            申请于 {formatDate(request.createdAt)}
                          </span>
                        </div>
                        
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-amber-800 mb-1">解锁原因：</p>
                          <p className="text-sm text-amber-700">{request.reason}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewExperiment(request.experiment.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          查看
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openProcessUnlockDialog(request, 'APPROVE')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          批准
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openProcessUnlockDialog(request, 'REJECT')}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          拒绝
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState 
              icon={<Unlock className="w-12 h-12 text-muted-foreground" />}
              title="暂无解锁申请"
              description="待处理的解锁申请将显示在这里"
            />
          )}
        </TabsContent>
      </Tabs>

      {/* 审核对话框 */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>审核实验记录</DialogTitle>
            <DialogDescription>
              审核「{reviewingExperiment?.title}」
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 实验附件列表 */}
            {reviewingExperiment?.attachments && reviewingExperiment.attachments.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  实验附件
                </label>
                <div className="border rounded-lg divide-y">
                  {reviewingExperiment.attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between p-2 hover:bg-muted/50">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate text-sm">{att.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(att.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadAttachment(att.id, att.name)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">审核决定</label>
              <Select value={reviewAction} onValueChange={(v) => setReviewAction(v as 'APPROVE' | 'REQUEST_REVISION' | 'TRANSFER')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVE">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      审核通过
                    </div>
                  </SelectItem>
                  <SelectItem value="REQUEST_REVISION">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-orange-600" />
                      要求修改
                    </div>
                  </SelectItem>
                  <SelectItem value="TRANSFER">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-purple-600" />
                      转交审核
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 转交审核人选择 */}
            {reviewAction === 'TRANSFER' && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  选择转交目标 <span className="text-destructive">*</span>
                </label>
                {isLoadingReviewers ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reviewers.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                    {reviewers.map(reviewer => (
                      <label
                        key={reviewer.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedTransferUser === reviewer.id ? 'bg-primary/10 border border-primary' : 'hover:bg-muted'
                        }`}
                        onClick={() => setSelectedTransferUser(reviewer.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{reviewer.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {reviewer.email}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {reviewer.reason}
                        </Badge>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    暂无可转交的审核人
                  </p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                反馈意见
                {reviewAction === 'REQUEST_REVISION' && <span className="text-destructive"> *</span>}
              </label>
              <Textarea
                placeholder={reviewAction === 'APPROVE' 
                  ? '可选：添加审核意见' 
                  : reviewAction === 'TRANSFER'
                  ? '可选：添加转交说明'
                  : '请说明需要修改的内容...'}
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                rows={4}
              />
            </div>

            {/* 批注附件上传 - 仅在要求修改时显示 */}
            {reviewAction === 'REQUEST_REVISION' && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  批注附件（可选）
                </label>
                <div className="border-2 border-dashed rounded-lg p-4">
                  <input
                    type="file"
                    id="review-attachment"
                    multiple
                    className="hidden"
                    onChange={handleAttachmentSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
                  />
                  <label
                    htmlFor="review-attachment"
                    className="flex flex-col items-center gap-2 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      点击上传批注文件
                    </div>
                    <div className="text-xs text-muted-foreground">
                      支持 PDF、Word、Excel、图片等格式
                    </div>
                  </label>
                </div>
                
                {/* 已选择的附件列表 */}
                {reviewAttachments.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {reviewAttachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate text-sm">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSubmitReview}
              disabled={isSubmittingReview || 
                (reviewAction === 'REQUEST_REVISION' && !reviewFeedback.trim()) ||
                (reviewAction === 'TRANSFER' && !selectedTransferUser)}
            >
              {isSubmittingReview ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  提交中...
                </>
              ) : '确认提交'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 解锁申请对话框 */}
      <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>申请解锁实验记录</DialogTitle>
            <DialogDescription>
              申请解锁「{unlockingExperiment?.title}」
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                解锁原因 <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="请说明需要解锁此记录的原因..."
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSubmitUnlock}
              disabled={isSubmittingUnlock || !unlockReason.trim()}
            >
              {isSubmittingUnlock ? '提交中...' : '提交申请'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 处理解锁申请对话框 */}
      <Dialog open={processUnlockDialogOpen} onOpenChange={setProcessUnlockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{processUnlockAction === 'APPROVE' ? '批准解锁' : '拒绝解锁'}</DialogTitle>
            <DialogDescription>
              处理「{processingUnlockRequest?.experiment.title}」的解锁申请
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {processingUnlockRequest && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-800 mb-1">申请人：{processingUnlockRequest.requester.name}</p>
                <p className="text-sm font-medium text-amber-800 mb-1">解锁原因：</p>
                <p className="text-sm text-amber-700">{processingUnlockRequest.reason}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                处理理由 <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder={processUnlockAction === 'APPROVE' 
                  ? '请说明批准解锁的理由...' 
                  : '请说明拒绝解锁的理由...'}
                value={processUnlockResponse}
                onChange={(e) => setProcessUnlockResponse(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessUnlockDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSubmitProcessUnlock}
              disabled={isProcessingUnlock || !processUnlockResponse.trim()}
              variant={processUnlockAction === 'REJECT' ? 'destructive' : 'default'}
            >
              {isProcessingUnlock ? '处理中...' : (processUnlockAction === 'APPROVE' ? '确认批准' : '确认拒绝')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 反馈历史对话框 */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>审核反馈</DialogTitle>
            <DialogDescription>
              「{feedbackExperiment?.title}」的审核反馈历史
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            {feedbackExperiment && (
              <ExperimentFeedbackHistory experimentId={feedbackExperiment.id} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
              关闭
            </Button>
            <Button onClick={() => {
              setFeedbackDialogOpen(false)
              if (feedbackExperiment) {
                onEditExperiment(feedbackExperiment.id)
              }
            }}>
              去修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 实验卡片组件
function ExperimentCard({
  experiment,
  statusConfig,
  onAction,
  actionLabel,
  actionIcon,
  actionVariant,
  formatDate,
  getScoreColor,
  showAuthor,
}: {
  experiment: Experiment
  statusConfig: Record<ReviewStatus, { label: string; color: string; icon: React.ReactNode }>
  onAction: () => void
  actionLabel: string
  actionIcon: React.ReactNode
  actionVariant: 'default' | 'outline' | 'destructive'
  formatDate: (date: string) => string
  getScoreColor: (score: number) => string
  showAuthor?: boolean
}) {
  return (
    <Card className="hover:border-primary/40 cursor-pointer transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <FlaskConical className="w-5 h-5 text-primary flex-shrink-0" />
              <h3 className="font-semibold text-lg truncate">{experiment.title}</h3>
              <Badge className={statusConfig[experiment.reviewStatus].color}>
                {statusConfig[experiment.reviewStatus].icon}
                <span className="ml-1">{statusConfig[experiment.reviewStatus].label}</span>
              </Badge>
            </div>
            
            <p className="text-muted-foreground line-clamp-2 mb-3">
              {experiment.summary || '暂无摘要'}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {showAuthor && (
                <span>作者: {experiment.author.name}</span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                更新于 {formatDate(experiment.updatedAt)}
              </span>
              {experiment.projects.length > 0 && (
                <span className="flex items-center gap-1">
                  <FolderOpen className="w-4 h-4" />
                  {experiment.projects.map(p => p.name).join(', ')}
                </span>
              )}
            </div>

            {experiment.tags && (
              <div className="flex flex-wrap gap-1 mt-3">
                {experiment.tags.split(',').map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 ml-4">
            {/* 完整度评分 */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">完整度</span>
              <span className={`text-lg font-bold ${getScoreColor(experiment.completenessScore)}`}>
                {experiment.completenessScore}%
              </span>
              <Progress value={experiment.completenessScore} className="w-16 h-1.5" />
            </div>
            
            {/* 操作按钮 */}
            <Button
              size="sm"
              variant={actionVariant}
              onClick={(e) => {
                e.stopPropagation()
                onAction()
              }}
            >
              {actionIcon}
              <span className="ml-1">{actionLabel}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 空状态组件
function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center">
          {icon}
          <h3 className="text-lg font-medium mt-4 mb-2">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// 反馈历史组件
function ExperimentFeedbackHistory({ experimentId }: { experimentId: string }) {
  const [feedbacks, setFeedbacks] = useState<ReviewFeedback[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const res = await fetch(`/api/experiments/${experimentId}/feedbacks`)
        if (res.ok) {
          const data = await res.json()
          setFeedbacks(data)
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchFeedbacks()
  }, [experimentId])

  // 下载附件
  const handleDownloadAttachment = async (attachmentId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/attachments/${attachmentId}/download`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">加载中...</div>
  }

  if (feedbacks.length === 0) {
    return <div className="text-center py-4 text-muted-foreground">暂无反馈记录</div>
  }

  return (
    <div className="space-y-4">
      {feedbacks.map((feedback) => (
        <Card key={feedback.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                {feedback.action === 'APPROVE' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-orange-600" />
                )}
                {feedback.action === 'APPROVE' ? '审核通过' : '要求修改'}
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {new Date(feedback.createdAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="font-medium">审核人：</span>
              {feedback.reviewer.name}
            </p>
            {feedback.feedback && (
              <p className="text-sm mt-2">
                <span className="font-medium">反馈意见：</span>
                {feedback.feedback}
              </p>
            )}
            {/* 批注附件 */}
            {feedback.attachments && feedback.attachments.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" />
                  批注附件
                </p>
                <div className="space-y-1">
                  {feedback.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-md hover:bg-muted/70 cursor-pointer"
                      onClick={() => handleDownloadAttachment(att.id, att.name)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate text-sm">{att.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(att.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
