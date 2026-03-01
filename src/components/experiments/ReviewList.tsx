'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  User,
  Calendar,
  FileText,
  MessageSquare,
  Eye
} from 'lucide-react'
import { useApp, Experiment, ReviewStatus } from '@/contexts/AppContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'

interface ReviewListProps {
  onViewExperiment: (id: string) => void
}

// 审核状态配置
const reviewStatusConfig: Record<ReviewStatus, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { 
    label: '草稿', 
    color: 'bg-gray-100 text-gray-700',
    icon: <FileText className="w-4 h-4" />
  },
  PENDING_REVIEW: { 
    label: '待审核', 
    color: 'bg-yellow-100 text-yellow-700',
    icon: <Clock className="w-4 h-4" />
  },
  NEEDS_REVISION: { 
    label: '需要修改', 
    color: 'bg-orange-100 text-orange-700',
    icon: <AlertCircle className="w-4 h-4" />
  },
  LOCKED: { 
    label: '已锁定', 
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="w-4 h-4" />
  },
}

export function ReviewList({ onViewExperiment }: ReviewListProps) {
  const { experiments, currentUser, reviewExperiment } = useApp()
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REQUEST_REVISION'>('APPROVE')
  const [feedback, setFeedback] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // 筛选实验
  const pendingExperiments = experiments.filter(e => e.reviewStatus === 'PENDING_REVIEW')
  const revisionExperiments = experiments.filter(e => e.reviewStatus === 'NEEDS_REVISION')
  const lockedExperiments = experiments.filter(e => e.reviewStatus === 'LOCKED')

  // 打开审核对话框
  const openReviewDialog = (experiment: Experiment, action: 'APPROVE' | 'REQUEST_REVISION') => {
    setSelectedExperiment(experiment)
    setReviewAction(action)
    setFeedback('')
    setShowReviewDialog(true)
  }

  // 提交审核
  const handleReview = async () => {
    if (!selectedExperiment) return
    
    setIsProcessing(true)
    try {
      const success = await reviewExperiment(
        selectedExperiment.id, 
        reviewAction, 
        feedback || undefined
      )
      if (success) {
        setShowReviewDialog(false)
        setSelectedExperiment(null)
      } else {
        alert('审核操作失败')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  // 格式化日期
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

  // 获取完整度评分颜色
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  // 渲染实验卡片
  const renderExperimentCard = (experiment: Experiment, showActions: boolean = false) => {
    const statusConfig = reviewStatusConfig[experiment.reviewStatus]
    
    return (
      <Card key={experiment.id} className="hover:shadow-md transition-shadow">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium">{experiment.title}</h3>
                <Badge className={statusConfig.color}>
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {experiment.summary || '暂无摘要'}
              </p>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 rounded bg-muted">
              <span className="text-xs text-muted-foreground">完整度</span>
              <span className={`text-sm font-bold ${getScoreColor(experiment.completenessScore)}`}>
                {experiment.completenessScore}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              <span>{experiment.author.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>提交: {formatDate(experiment.submittedAt)}</span>
            </div>
            {experiment.attachments && experiment.attachments.length > 0 && (
              <div className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                <span>{experiment.attachments.length} 个附件</span>
              </div>
            )}
          </div>

          {experiment.projects.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {experiment.projects.map(p => (
                <Badge key={p.id} variant="outline" className="text-xs">
                  {p.name}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onViewExperiment(experiment.id)}
            >
              <Eye className="w-4 h-4 mr-1" />
              查看详情
            </Button>
            
            {showActions && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => openReviewDialog(experiment, 'REQUEST_REVISION')}
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  要求修改
                </Button>
                <Button 
                  size="sm"
                  onClick={() => openReviewDialog(experiment, 'APPROVE')}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  通过
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">审核管理</h1>
            <p className="text-sm text-muted-foreground">
              审核实验记录，确保数据质量和合规性
            </p>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              待审核
              {pendingExperiments.length > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {pendingExperiments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="revision" className="gap-2">
              <AlertCircle className="w-4 h-4" />
              待修改
              {revisionExperiments.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {revisionExperiments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="locked" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              已锁定
            </TabsTrigger>
          </TabsList>

          {/* 待审核 */}
          <TabsContent value="pending">
            {pendingExperiments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">暂无待审核的实验记录</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingExperiments.map(exp => renderExperimentCard(exp, true))}
              </div>
            )}
          </TabsContent>

          {/* 待修改 */}
          <TabsContent value="revision">
            {revisionExperiments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">暂无需要修改的实验记录</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {revisionExperiments.map(exp => renderExperimentCard(exp, false))}
              </div>
            )}
          </TabsContent>

          {/* 已锁定 */}
          <TabsContent value="locked">
            {lockedExperiments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">暂无已锁定的实验记录</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {lockedExperiments.map(exp => renderExperimentCard(exp, false))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 审核对话框 */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'APPROVE' ? '审核通过' : '要求修改'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'APPROVE' 
                ? '审核通过后，实验记录将被锁定，无法再修改。'
                : '要求修改后，作者将收到通知并可以重新编辑。'
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedExperiment && (
            <div className="py-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">{selectedExperiment.title}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">完整度</span>
                  <span className={`font-bold ${getScoreColor(selectedExperiment.completenessScore)}`}>
                    {selectedExperiment.completenessScore}%
                  </span>
                </div>
              </div>
              <Progress value={selectedExperiment.completenessScore} className="h-2 mb-4" />
              
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  审核意见 {reviewAction === 'REQUEST_REVISION' && '*(必填)'}
                </label>
                <Textarea
                  placeholder={reviewAction === 'APPROVE' 
                    ? '可选：添加审核意见或备注...' 
                    : '请详细说明需要修改的内容...'
                  }
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={handleReview}
              disabled={isProcessing || (reviewAction === 'REQUEST_REVISION' && !feedback.trim())}
              variant={reviewAction === 'APPROVE' ? 'default' : 'destructive'}
            >
              {isProcessing ? (
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : reviewAction === 'APPROVE' ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <MessageSquare className="w-4 h-4 mr-2" />
              )}
              {reviewAction === 'APPROVE' ? '确认通过' : '确认要求修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
