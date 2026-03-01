'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
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
  FileText
} from 'lucide-react'
import { useApp, Experiment, ReviewStatus } from '@/contexts/AppContext'
import { AttachmentManager } from '@/components/attachments/AttachmentManager'
import { ExtractedInfoPanel } from '@/components/experiments/ExtractedInfoPanel'

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

export function ExperimentDetail({ experiment, onEdit, onBack }: ExperimentDetailProps) {
  const { deleteExperiment, currentUser, triggerExtraction, updateExtractedInfo, submitForReview } = useApp()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canEdit = (currentUser?.id === experiment.authorId || 
                  currentUser?.role === 'ADMIN' || 
                  currentUser?.role === 'PROJECT_LEAD') &&
                  (experiment.reviewStatus === 'DRAFT' || experiment.reviewStatus === 'NEEDS_REVISION')
  
  const canDelete = currentUser?.id === experiment.authorId || 
                   currentUser?.role === 'ADMIN'
  
  const canSubmit = experiment.completenessScore >= 60 && 
                   canEdit && 
                   experiment.reviewStatus === 'DRAFT'

  const canReview = currentUser?.role === 'PROJECT_LEAD' || 
                   currentUser?.role === 'ADMIN'

  const handleDelete = async () => {
    await deleteExperiment(experiment.id)
    onBack()
  }

  const handleSubmitReview = async () => {
    setIsSubmitting(true)
    try {
      const success = await submitForReview(experiment.id)
      if (success) {
        alert('已提交审核')
      } else {
        alert('提交失败')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // AI提取处理
  const handleExtract = async () => {
    return await triggerExtraction(experiment.id)
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
            <span className="text-sm text-muted-foreground">完整度</span>
            <span className={`text-lg font-bold ${getScoreColor(experiment.completenessScore)}`}>
              {experiment.completenessScore}%
            </span>
          </div>
          
          {canDelete && experiment.reviewStatus !== 'LOCKED' && (
            <Button variant="outline" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              删除
            </Button>
          )}
          
          {canSubmit && (
            <Button onClick={handleSubmitReview} disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
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
            {/* 完整度进度 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">完整度评分</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-3xl font-bold ${getScoreColor(experiment.completenessScore)}`}>
                    {experiment.completenessScore}%
                  </span>
                  <Progress value={experiment.completenessScore} className="w-24" />
                </div>
                <Separator />
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>• 标题、摘要、结论各占15分</p>
                  <p>• 关联项目、附件各占10分</p>
                  <p>• AI提取信息占20分</p>
                </div>
                {experiment.completenessScore < 60 && canEdit && (
                  <p className="text-xs text-amber-600">
                    完整度需达到60%才能提交审核
                  </p>
                )}
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

            {/* 审核信息 */}
            {experiment.reviewStatus !== 'DRAFT' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">审核信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">状态</span>
                    <Badge className={statusConfig.color}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                  {experiment.submittedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">提交时间</span>
                      <span>{formatDate(experiment.submittedAt)}</span>
                    </div>
                  )}
                  {experiment.reviewedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">审核时间</span>
                      <span>{formatDate(experiment.reviewedAt)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
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
    </div>
  )
}
