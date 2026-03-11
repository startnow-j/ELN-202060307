'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  CheckCircle,
  RefreshCw,
  ArrowRightLeft,
  Loader2,
  Upload,
  X,
  FileText,
  Paperclip,
  Download,
  FlaskConical,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Experiment, ReviewFeedback, AppUser } from '@/contexts/AppContext'

interface Reviewer {
  id: string
  name: string
  email: string
  role: string
  avatar: string | null
}

interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  experiment: Experiment | null
  onSuccess: () => void
  onReview: (
    experimentId: string,
    action: 'APPROVE' | 'REQUEST_REVISION' | 'TRANSFER',
    feedback?: string,
    transferTo?: string,
    attachmentIds?: string[]
  ) => Promise<boolean>
}

export function ReviewDialog({
  open,
  onOpenChange,
  experiment,
  onSuccess,
  onReview,
}: ReviewDialogProps) {
  const { toast } = useToast()
  const [action, setAction] = useState<'APPROVE' | 'REQUEST_REVISION' | 'TRANSFER'>('APPROVE')
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reviewers, setReviewers] = useState<Reviewer[]>([])
  const [isLoadingReviewers, setIsLoadingReviewers] = useState(false)
  const [selectedTransferUser, setSelectedTransferUser] = useState<string>('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 加载审核人列表
  useEffect(() => {
    if (open && experiment) {
      setAction('APPROVE')
      setFeedback('')
      setSelectedTransferUser('')
      setAttachments([])
      loadReviewers()
    }
  }, [open, experiment?.id])

  const loadReviewers = async () => {
    if (!experiment) return
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

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setAttachments(prev => [...prev, ...Array.from(files)])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!experiment) return

    if (action === 'TRANSFER' && !selectedTransferUser) {
      toast({
        variant: 'destructive',
        title: '请选择转交目标',
      })
      return
    }

    setIsSubmitting(true)
    try {
      // 上传附件
      let uploadedAttachmentIds: string[] = []
      if (attachments.length > 0) {
        setIsUploadingAttachment(true)
        try {
          for (const file of attachments) {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('experimentId', experiment.id)

            const uploadRes = await fetch('/api/attachments', {
              method: 'POST',
              body: formData
            })

            if (uploadRes.ok) {
              const attachmentData = await uploadRes.json()
              uploadedAttachmentIds.push(attachmentData.id)
            }
          }
        } finally {
          setIsUploadingAttachment(false)
        }
      }

      // 提交审核
      const success = await onReview(
        experiment.id,
        action,
        feedback || undefined,
        action === 'TRANSFER' ? selectedTransferUser : undefined,
        uploadedAttachmentIds.length > 0 ? uploadedAttachmentIds : undefined
      )

      if (success) {
        const messages: Record<string, { title: string; description: string }> = {
          APPROVE: { title: '审核通过', description: '实验记录已锁定' },
          REQUEST_REVISION: { title: '已要求修改', description: '已通知作者进行修改' },
          TRANSFER: { title: '已转交审核', description: '已转交给其他审核人' },
        }
        toast({
          title: messages[action]?.title,
          description: messages[action]?.description,
        })
        onOpenChange(false)
        onSuccess()
      } else {
        toast({
          variant: 'destructive',
          title: '操作失败',
          description: '请稍后重试',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
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

  if (!experiment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>审核实验记录</DialogTitle>
          <DialogDescription>
            请查看实验记录详情并决定审核结果
          </DialogDescription>
        </DialogHeader>

        {/* 实验信息 */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              <h4 className="font-semibold">{experiment.title}</h4>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">完整度</span>
              <span className={`text-lg font-bold ${getScoreColor(experiment.completenessScore)}`}>
                {experiment.completenessScore}%
              </span>
              <Progress value={experiment.completenessScore} className="w-16 h-1.5" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {experiment.summary || '暂无摘要'}
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>作者: {experiment.author.name}</span>
            <span>提交于: {formatDate(experiment.submittedAt || experiment.updatedAt)}</span>
          </div>
        </div>

        {/* 审核操作 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">审核操作</label>
            <Tabs value={action} onValueChange={(v) => setAction(v as typeof action)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="APPROVE" className="gap-2">
                  <CheckCircle className="w-4 h-4" />
                  通过
                </TabsTrigger>
                <TabsTrigger value="REQUEST_REVISION" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  要求修改
                </TabsTrigger>
                <TabsTrigger value="TRANSFER" className="gap-2">
                  <ArrowRightLeft className="w-4 h-4" />
                  转交审核
                </TabsTrigger>
              </TabsList>

              <TabsContent value="APPROVE" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  通过审核后，实验记录将被锁定，无法再进行编辑。
                </p>
              </TabsContent>

              <TabsContent value="REQUEST_REVISION" className="mt-4">
                <p className="text-sm text-muted-foreground mb-3">
                  请填写需要作者修改的具体内容：
                </p>
                <Textarea
                  placeholder="请输入修改意见..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                />
              </TabsContent>

              <TabsContent value="TRANSFER" className="mt-4">
                <p className="text-sm text-muted-foreground mb-3">
                  将审核任务转交给其他审核人：
                </p>
                {isLoadingReviewers ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    加载审核人列表...
                  </div>
                ) : (
                  <Select value={selectedTransferUser} onValueChange={setSelectedTransferUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择转交目标" />
                    </SelectTrigger>
                    <SelectContent>
                      {reviewers.map((reviewer) => (
                        <SelectItem key={reviewer.id} value={reviewer.id}>
                          {reviewer.name} ({reviewer.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* 附件上传 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">审核批注附件（可选）</label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                添加附件
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleAttachmentSelect}
              />
            </div>
            {attachments.length > 0 && (
              <div className="space-y-2 mt-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{file.name}</span>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                处理中...
              </>
            ) : (
              '确认提交'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
