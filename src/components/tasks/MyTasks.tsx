'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Clock,
  Lock,
  AlertCircle,
  FileEdit,
  CheckCircle,
  RefreshCw,
  FolderOpen,
  Edit,
  MessageSquare,
  Unlock,
  Eye,
  History,
  Globe,
  User,
  ChevronDown,
} from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { useToast } from '@/hooks/use-toast'

// 导入拆分后的子组件
import { 
  ExperimentCard, 
  EmptyState, 
  ReviewDialog, 
  UnlockDialog, 
  ProcessUnlockDialog,
  FeedbackHistoryDialog,
  UnlockRequestList,
  formatDate,
  getScoreColor,
  reviewStatusConfig,
  viewModeConfig,
  ViewMode,
  UnlockRequestItem
} from './'

interface MyTasksProps {
  onViewExperiment: (id: string) => void
  onEditExperiment: (id: string) => void
}

export function MyTasks({ onViewExperiment, onEditExperiment }: MyTasksProps) {
  const { currentUser, reviewExperiment } = useApp()
  const { toast } = useToast()
  
  // 核心状态管理
  const [activeTab, setActiveTab] = useState('drafts')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [experiments, setExperiments] = useState<any[]>([])
  const [projects, setProjects] = useState<{ id: string; ownerId: string }[]>([])
  
  // 视角状态
  const [viewMode, setViewMode] = useState<ViewMode>('default')

  // 对话框状态
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewingExperiment, setReviewingExperiment] = useState<any | null>(null)
  
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false)
  const [unlockingExperiment, setUnlockingExperiment] = useState<any | null>(null)
  
  const [processUnlockDialogOpen, setProcessUnlockDialogOpen] = useState(false)
  const [processingUnlockRequest, setProcessingUnlockRequest] = useState<UnlockRequestItem | null>(null)
  const [processUnlockAction, setProcessUnlockAction] = useState<'APPROVE' | 'REJECT'>('APPROVE')
  
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [feedbackExperiment, setFeedbackExperiment] = useState<any | null>(null)

  // 解锁申请Tab状态
  const [unlockRequests, setUnlockRequests] = useState<UnlockRequestItem[]>([])
  const [isLoadingUnlockRequests, setIsLoadingUnlockRequests] = useState(false)

  // 是否是管理员
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN'
  
  // 根据视角计算各类实验数量
  const useGlobalView = viewMode === 'global' && isAdmin
  
  // 加载数据
  const loadData = useCallback(async (mode: ViewMode) => {
    setIsLoading(true)
    try {
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
    if (!currentUser) return
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

  // 待我审核
  const pendingMyReview = useGlobalView
    ? experiments.filter(e => e.reviewStatus === 'PENDING_REVIEW')
    : experiments.filter(e => {
        if (e.reviewStatus !== 'PENDING_REVIEW') return false
        const pendingReviewRequests = e.reviewRequests?.filter((rr: any) => rr.status === 'PENDING') || []
        if (pendingReviewRequests.length > 0) {
          return pendingReviewRequests.some((rr: any) => rr.reviewerId === currentUser?.id)
        } else {
          return e.projects?.some((p: any) => p.ownerId === currentUser?.id)
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

  // 打开审核对话框
  const openReviewDialog = (experiment: any) => {
    setReviewingExperiment(experiment)
    setReviewDialogOpen(true)
  }

  // 打开解锁申请对话框
  const openUnlockDialog = (experiment: any) => {
    setUnlockingExperiment(experiment)
    setUnlockDialogOpen(true)
  }

  // 处理解锁申请（批准/拒绝）
  const openProcessUnlockDialog = (request: UnlockRequestItem, action: 'APPROVE' | 'REJECT') => {
    setProcessingUnlockRequest(request)
    setProcessUnlockAction(action)
    setProcessUnlockDialogOpen(true)
  }

  // 打开反馈历史对话框
  const openFeedbackDialog = (experiment: any) => {
    setFeedbackExperiment(experiment)
    setFeedbackDialogOpen(true)
  }

  // 刷新数据
  const handleRefresh = () => {
    loadData(viewMode)
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
                  {viewMode === 'default' ? <User className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
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
                      {mode === 'default' ? <User className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
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
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
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
                    statusConfig={reviewStatusConfig as any}
                    onAction={() => onEditExperiment(experiment.id)}
                    actionLabel="继续编辑"
                    actionIcon={<Edit className="w-4 h-4" />}
                    actionVariant="default"
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
                            <Badge className={(reviewStatusConfig as any)[experiment.reviewStatus].color}>
                              {(reviewStatusConfig as any)[experiment.reviewStatus].label}
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
                                {experiment.projects.map((p: any) => p.name).join(', ')}
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
                            <Badge className={(reviewStatusConfig as any)[experiment.reviewStatus].color}>
                              {(reviewStatusConfig as any)[experiment.reviewStatus].label}
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
                .map((experiment) => {
                  const hasRestrictedProject = experiment.projects?.some(
                    (p: any) => p.status === 'COMPLETED' || p.status === 'ARCHIVED'
                  )
                  const restrictedProject = experiment.projects?.find(
                    (p: any) => p.status === 'COMPLETED' || p.status === 'ARCHIVED'
                  )
                  
                  return (
                    <Card key={experiment.id} className="hover:border-primary/40 transition-colors">
                      <CardContent className="p-6">
                        {hasRestrictedProject && (
                          <div className={`mb-4 p-3 rounded-lg border text-sm ${
                            restrictedProject?.status === 'ARCHIVED' 
                              ? 'bg-gray-50 border-gray-200 text-gray-600' 
                              : 'bg-blue-50 border-blue-200 text-blue-600'
                          }`}>
                            <div className="flex items-center gap-2">
                              <Lock className="w-3.5 h-3.5" />
                              <span>
                                项目「{restrictedProject?.name}」已{restrictedProject?.status === 'ARCHIVED' ? '归档' : '结束'}，不可申请解锁
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <FlaskConical className="w-5 h-5 text-primary flex-shrink-0" />
                              <h3 className="font-semibold text-lg truncate">{experiment.title}</h3>
                              <Badge className={(reviewStatusConfig as any)[experiment.reviewStatus].color}>
                                {(reviewStatusConfig as any)[experiment.reviewStatus].label}
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
                                  {experiment.projects.map((p: any) => p.name).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 ml-4">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs text-muted-foreground">完整度</span>
                              <span className={`text-lg font-bold ${getScoreColor(experiment.completenessScore)}`}>
                                {experiment.completenessScore}%
                              </span>
                              <Progress value={experiment.completenessScore} className="w-16 h-1.5" />
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onViewExperiment(experiment.id)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                查看
                              </Button>
                              {!hasRestrictedProject && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openUnlockDialog(experiment)}
                                >
                                  <Unlock className="w-4 h-4 mr-1" />
                                  申请解锁
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
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
          <UnlockRequestList
            requests={unlockRequests}
            isLoading={isLoadingUnlockRequests}
            onViewExperiment={onViewExperiment}
            onProcess={openProcessUnlockDialog}
          />
        </TabsContent>
      </Tabs>

      {/* 审核对话框 */}
      <ReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        experiment={reviewingExperiment}
        onSuccess={handleRefresh}
      />

      {/* 解锁申请对话框 */}
      <UnlockDialog
        open={unlockDialogOpen}
        onOpenChange={setUnlockDialogOpen}
        experiment={unlockingExperiment}
      />

      {/* 处理解锁申请对话框 */}
      <ProcessUnlockDialog
        open={processUnlockDialogOpen}
        onOpenChange={setProcessUnlockDialogOpen}
        request={processingUnlockRequest}
        action={processUnlockAction}
        onSuccess={loadUnlockRequests}
      />

      {/* 反馈历史对话框 */}
      <FeedbackHistoryDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        experiment={feedbackExperiment}
        onEditExperiment={onEditExperiment}
      />
    </div>
  )
}
