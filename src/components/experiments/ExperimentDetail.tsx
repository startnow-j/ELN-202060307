'use client'

// v3.3.7 - ReviewHistory bug fix
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  ArrowLeft, 
  Pencil, 
  Trash2,
  Calendar,
  User,
  Tag,
  Paperclip,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Lock,
  FileText,
  Users,
  Loader2
} from 'lucide-react'
import { useApp, Experiment, ReviewStatus, AppUser, authFetch } from '@/contexts/AppContext'
import { AttachmentManager } from '@/components/attachments/AttachmentManager'
import { ExtractedInfoPanel } from '@/components/experiments/ExtractedInfoPanel'
import { ReviewHistory } from '@/components/experiments/ReviewHistory'

interface Reviewer {
  id: string
  name: string
  email: string
  role: string
  avatar: string | null
  reason: string
}

interface ExperimentDetailProps {
  experiment: Experiment
  onEdit: () => void
  onBack: () => void
}

// 审核状态配置
const reviewStatusConfig: Record<ReviewStatus, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { 
    label: '草稿', 
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: <FileText className="w-4 h-4" />
  },
  PENDING_REVIEW: { 
    label: '待审核', 
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: <AlertCircle className="w-4 h-4" />
  },
  NEEDS_REVISION: { 
    label: '需要修改', 
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: <AlertCircle className="w-4 h-4" />
  },
  LOCKED: { 
    label: '已锁定', 
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: <Lock className="w-4 h-4" />
  },
}

export function ExperimentDetail({ experiment: initialExperiment, onEdit, onBack }: ExperimentDetailProps) {
  const { deleteExperiment, currentUser, triggerExtraction, updateExtractedInfo, submitForReview } = useApp()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reviewers, setReviewers] = useState<Reviewer[]>([])
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([])
  const [submitNote, setSubmitNote] = useState('')
  const [isLoadingReviewers, setIsLoadingReviewers] = useState(false)
  
  // 使用本地 state 存储最新的 experiment 数据
  const [experiment, setExperiment] = useState<Experiment>(initialExperiment)
  const [isLoading, setIsLoading] = useState(true)

  // 加载最新的实验数据（确保包含 unlockRequests 和 projectRole）
  const loadExperimentData = useCallback(async () => {
    try {
      const res = await authFetch(`/api/experiments/${initialExperiment.id}`)
      if (res.ok) {
        const data = await res.json()
        setExperiment(data)
        console.log('Loaded experiment data:', {
          unlockRequests: data.unlockRequests?.length || 0,
          reviewFeedbacks: data.reviewFeedbacks?.length || 0,
          reviewRequests: data.reviewRequests?.length || 0,
          authorProjectRole: data.author?.projectRole
        })
      }
    } catch (error) {
      console.error('Failed to load experiment:', error)
    } finally {
      setIsLoading(false)
    }
  }, [initialExperiment.id])

  // 组件挂载时加载最新数据
  useEffect(() => {
    loadExperimentData()
  }, [loadExperimentData])

  const canEdit = (currentUser?.id === experiment.authorId || 
                  currentUser?.role === 'ADMIN' || 
                  currentUser?.role === 'PROJECT_LEAD') &&
                  (experiment.reviewStatus === 'DRAFT' || experiment.reviewStatus === 'NEEDS_REVISION')
  
  const canDelete = currentUser?.id === experiment.authorId || 
                   currentUser?.role === 'ADMIN'
  
  const canSubmit = experiment.completenessScore >= 60 && 
                   canEdit && 
                   experiment.reviewStatus === 'DRAFT' &&
                   experiment.projects.length > 0  // 必须关联项目

  const canReview = currentUser?.role === 'PROJECT_LEAD' || 
                   currentUser?.role === 'ADMIN'

  const handleDelete = async () => {
    await deleteExperiment(experiment.id)
    onBack()
  }

  // 打开提交审核对话框时获取审核人列表
  const handleSubmitDialogOpen = async () => {
    setShowSubmitDialog(true)
    setIsLoadingReviewers(true)
    try {
      const res = await authFetch(`/api/experiments/${experiment.id}/reviewers`)
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

  // 切换审核人选择
  const toggleReviewer = (reviewerId: string) => {
    setSelectedReviewers(prev => 
      prev.includes(reviewerId) 
        ? prev.filter(id => id !== reviewerId)
        : [...prev, reviewerId]
    )
  }

  // 提交审核
  const handleSubmitReview = async () => {
    setIsSubmitting(true)
    try {
      const success = await submitForReview(experiment.id, selectedReviewers, submitNote || undefined)
      if (success) {
        setShowSubmitDialog(false)
        setSelectedReviewers([])
        setSubmitNote('')
      } else {
        alert('提交失败')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // AI提取处理 - 支持选择特定附件
  const handleExtract = async (attachmentIds: string[]): Promise<boolean> => {
    if (!attachmentIds || attachmentIds.length === 0) return false
    
    try {
      const res = await authFetch(`/api/experiments/${experiment.id}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentIds })
      })
      
      if (res.ok) {
        return true
      } else {
        const errorData = await res.json().catch(() => ({ error: '提取失败' }))
        throw new Error(errorData.error || 'AI提取失败')
      }
    } catch (error) {
      console.error('Failed to extract:', error)
      throw error
    }
  }

  // 更新提取信息
  const handleUpdateExtractedInfo = async (info: any) => {
    return await updateExtractedInfo(experiment.id, info)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('zh-CN', {
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

  const statusConfig = reviewStatusConfig[experiment.reviewStatus]

  // 加载状态显示
  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b border-border bg-background px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>加载中...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="border-b border-border bg-background px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{experiment.title}</h1>
              <Badge className={statusConfig.color}>
                {statusConfig.icon}
                <span className="ml-1">{statusConfig.label}</span>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              实验记录详情
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* 完整度评分 */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
            <span className="text-sm text-muted-foreground">评分</span>
            <span className={`text-lg font-bold ${getScoreColor(experiment.completenessScore)}`}>
              {experiment.completenessScore}
            </span>
          </div>
          
          {canDelete && experiment.reviewStatus !== 'LOCKED' && (
            <Button variant="outline" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              删除
            </Button>
          )}
          
          {canSubmit && (
            <Button onClick={handleSubmitDialogOpen} disabled={isSubmitting}>
              <Send className="w-4 h-4 mr-2" />
              提交审核
            </Button>
          )}
          
          {canEdit && (
            <Button onClick={onEdit}>
              <Pencil className="w-4 h-4 mr-2" />
              编辑
            </Button>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧 - 主要内容 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 元信息 */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">作者:</span>
                    <span className="font-medium">{experiment.author.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">创建:</span>
                    <span>{formatDate(experiment.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">更新:</span>
                    <span>{formatDate(experiment.updatedAt)}</span>
                  </div>
                  {experiment.submittedAt && (
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">提交:</span>
                      <span>{formatDate(experiment.submittedAt)}</span>
                    </div>
                  )}
                </div>
                
                {experiment.projects.length > 0 && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">关联项目:</span>
                    <div className="flex flex-wrap gap-1">
                      {experiment.projects.map(p => (
                        <Badge key={p.id} variant="outline" className="text-xs">
                          {p.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {experiment.tags && (
                  <div className="flex flex-wrap gap-1 mt-4 pt-4 border-t">
                    {experiment.tags.split(',').map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 实验摘要 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">实验摘要</CardTitle>
              </CardHeader>
              <CardContent>
                {experiment.summary ? (
                  <p className="whitespace-pre-wrap text-muted-foreground">{experiment.summary}</p>
                ) : (
                  <p className="text-muted-foreground italic">暂无摘要</p>
                )}
              </CardContent>
            </Card>

            {/* 结论与分析 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">结论与分析</CardTitle>
              </CardHeader>
              <CardContent>
                {experiment.conclusion ? (
                  <p className="whitespace-pre-wrap text-muted-foreground">{experiment.conclusion}</p>
                ) : (
                  <p className="text-muted-foreground italic">暂无结论</p>
                )}
              </CardContent>
            </Card>

            {/* 附件 */}
            <AttachmentManager
              experimentId={experiment.id}
              attachments={experiment.attachments || []}
              canEdit={canEdit}
              onAttachmentsChange={() => {}}
            />
          </div>

          {/* 右侧 - AI提取面板 */}
          <div className="space-y-6">
            {/* 完整度评分 - 简洁显示 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>评分</span>
                  <span className={`text-2xl font-bold ${getScoreColor(experiment.completenessScore)}`}>
                    {experiment.completenessScore}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={experiment.completenessScore} className="h-2" />
                
                {/* 评分明细 - 紧凑网格 */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">标题</span>
                    <span className="text-green-600">✓ 10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">摘要</span>
                    <span className={experiment.summary ? 'text-green-600' : ''}>
                      {experiment.summary ? (experiment.summary.length >= 20 ? '✓ 15' : '10') : '- 0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">结论</span>
                    <span className={experiment.conclusion ? 'text-green-600' : ''}>
                      {experiment.conclusion ? (experiment.conclusion.length >= 20 ? '✓ 15' : '10') : '- 0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">项目</span>
                    <span className={experiment.projects.length > 0 ? 'text-green-600' : ''}>
                      {experiment.projects.length > 0 ? '✓ 10' : '- 0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">附件</span>
                    <span className={experiment.attachments.length > 0 ? 'text-green-600' : ''}>
                      {experiment.attachments.length > 0 ? 15 + Math.min(15, experiment.attachments.length * 5) : '- 0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AI</span>
                    <span className={experiment.extractedInfo ? 'text-green-600' : ''}>
                      {experiment.extractedInfo ? Math.round(
                        (experiment.extractedInfo.reagents?.length ? 2.5 : 0) +
                        (experiment.extractedInfo.instruments?.length ? 2.5 : 0) +
                        (experiment.extractedInfo.parameters?.length ? 2.5 : 0) +
                        (experiment.extractedInfo.steps?.length ? 2.5 : 0)
                      ) : '- 0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">标签</span>
                    <span className={experiment.tags ? 'text-green-600' : ''}>
                      {experiment.tags ? '✓ 10' : '- 0'}
                    </span>
                  </div>
                </div>
                
                <Separator className="my-2" />
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {experiment.completenessScore >= 60 ? (
                      <span className="text-green-600">符合提交条件</span>
                    ) : (
                      <span className="text-amber-600">需≥60分提交</span>
                    )}
                  </span>
                  <span className="text-muted-foreground">满分100</span>
                </div>
              </CardContent>
            </Card>

            {/* AI提取面板 */}
            <ExtractedInfoPanel
              experiment={experiment}
              attachments={experiment.attachments || []}
              onExtract={handleExtract}
              onUpdate={handleUpdateExtractedInfo}
              onApplyToFields={() => {}}
            />

            {/* 审核历史 */}
            <ReviewHistory
              reviewFeedbacks={experiment.reviewFeedbacks || []}
              reviewRequests={experiment.reviewRequests || []}
              unlockRequests={experiment.unlockRequests || []}
              reviewStatus={experiment.reviewStatus}
              reviewedAt={experiment.reviewedAt}
              attachmentCount={experiment.attachments?.length || 0}
              author={experiment.author}
            />
          </div>
        </div>
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除实验记录「{experiment.title}」吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 提交审核对话框 */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              提交审核
            </DialogTitle>
            <DialogDescription>
              选择审核人并填写提交留言（可选）
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* 审核人选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                选择审核人（可选多个）
              </label>
              {isLoadingReviewers ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : reviewers.length > 0 ? (
                <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
                  {reviewers.map(reviewer => (
                    <label
                      key={reviewer.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedReviewers.includes(reviewer.id)}
                        onCheckedChange={() => toggleReviewer(reviewer.id)}
                      />
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
                  暂无可用审核人，将自动分配给项目负责人或管理员
                </p>
              )}
            </div>

            {/* 提交留言 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">提交留言（可选）</label>
              <Textarea
                placeholder="填写给审核人的留言..."
                value={submitNote}
                onChange={(e) => setSubmitNote(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {submitNote.length}/500
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSubmitReview} disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              确认提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
