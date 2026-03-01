'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
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
  Inbox
} from 'lucide-react'
import { useApp, Experiment, ReviewStatus, ReviewFeedback } from '@/contexts/AppContext'
import { useToast } from '@/hooks/use-toast'

interface MyTasksProps {
  onViewExperiment: (id: string) => void
  onEditExperiment: (id: string) => void
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

export function MyTasks({ onViewExperiment, onEditExperiment }: MyTasksProps) {
  const { currentUser, experiments, projects, refreshData, reviewExperiment } = useApp()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('drafts')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 审核对话框状态
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewingExperiment, setReviewingExperiment] = useState<Experiment | null>(null)
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REQUEST_REVISION'>('APPROVE')
  const [reviewFeedback, setReviewFeedback] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  // 解锁申请对话框状态
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false)
  const [unlockingExperiment, setUnlockingExperiment] = useState<Experiment | null>(null)
  const [unlockReason, setUnlockReason] = useState('')
  const [isSubmittingUnlock, setIsSubmittingUnlock] = useState(false)

  // 反馈历史对话框
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [feedbackExperiment, setFeedbackExperiment] = useState<Experiment | null>(null)

  // 计算各类实验数量
  const myDrafts = experiments.filter(
    e => e.reviewStatus === 'DRAFT' && e.authorId === currentUser?.id
  )

  // 作为项目负责人的项目
  const myProjectsAsLead = projects.filter(p => p.ownerId === currentUser?.id)
  const pendingMyReview = experiments.filter(
    e => {
      if (e.reviewStatus !== 'PENDING_REVIEW') return false
      return e.projects.some(p => myProjectsAsLead.some(mp => mp.id === p.id))
    }
  )

  const needsMyRevision = experiments.filter(
    e => e.reviewStatus === 'NEEDS_REVISION' && e.authorId === currentUser?.id
  )

  const myLockedRecords = experiments.filter(
    e => e.reviewStatus === 'LOCKED' && e.authorId === currentUser?.id
  )

  // 刷新数据
  const handleRefresh = async () => {
    setIsLoading(true)
    await refreshData()
    setIsLoading(false)
  }

  // 打开审核对话框
  const openReviewDialog = (experiment: Experiment) => {
    setReviewingExperiment(experiment)
    setReviewAction('APPROVE')
    setReviewFeedback('')
    setReviewDialogOpen(true)
  }

  // 提交审核
  const handleSubmitReview = async () => {
    if (!reviewingExperiment) return
    
    setIsSubmittingReview(true)
    try {
      const success = await reviewExperiment(
        reviewingExperiment.id, 
        reviewAction, 
        reviewFeedback || undefined
      )
      
      if (success) {
        toast({
          title: reviewAction === 'APPROVE' ? '审核通过' : '已要求修改',
          description: reviewAction === 'APPROVE' 
            ? '实验记录已锁定' 
            : '已通知作者进行修改',
        })
        setReviewDialogOpen(false)
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
            管理您的实验记录任务和审核工作
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Tab 分类 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="drafts" className="gap-2">
            <FileEdit className="w-4 h-4" />
            <span className="hidden sm:inline">我的草稿</span>
            <Badge variant="secondary" className="ml-1">
              {myDrafts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending-review" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            <span className="hidden sm:inline">待我审核</span>
            <Badge variant="secondary" className="ml-1">
              {pendingMyReview.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="needs-revision" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">待我修改</span>
            <Badge variant="secondary" className="ml-1">
              {needsMyRevision.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="locked" className="gap-2">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">已锁定</span>
            <Badge variant="secondary" className="ml-1">
              {myLockedRecords.length}
            </Badge>
          </TabsTrigger>
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
                  />
                ))}
            </div>
          ) : (
            <EmptyState 
              icon={<FileEdit className="w-12 h-12 text-muted-foreground" />}
              title="暂无草稿"
              description="您创建的草稿实验记录将显示在这里"
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
              description="被要求修改的实验记录将显示在这里"
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
              description="您已锁定的实验记录将显示在这里"
            />
          )}
        </TabsContent>
      </Tabs>

      {/* 审核对话框 */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>审核实验记录</DialogTitle>
            <DialogDescription>
              审核「{reviewingExperiment?.title}」
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">审核决定</label>
              <Select value={reviewAction} onValueChange={(v) => setReviewAction(v as 'APPROVE' | 'REQUEST_REVISION')}>
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
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                反馈意见
                {reviewAction === 'REQUEST_REVISION' && <span className="text-destructive"> *</span>}
              </label>
              <Textarea
                placeholder={reviewAction === 'APPROVE' 
                  ? '可选：添加审核意见' 
                  : '请说明需要修改的内容...'}
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSubmitReview}
              disabled={isSubmittingReview || (reviewAction === 'REQUEST_REVISION' && !reviewFeedback.trim())}
            >
              {isSubmittingReview ? '提交中...' : '确认提交'}
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
}: {
  experiment: Experiment
  statusConfig: Record<ReviewStatus, { label: string; color: string; icon: React.ReactNode }>
  onAction: () => void
  actionLabel: string
  actionIcon: React.ReactNode
  actionVariant: 'default' | 'outline' | 'destructive'
  formatDate: (date: string) => string
  getScoreColor: (score: number) => string
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
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
