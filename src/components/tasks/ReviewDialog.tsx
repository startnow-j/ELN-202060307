'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
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
  Paperclip,
  Download,
  FlaskConical,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Experiment } from '@/contexts/AppContext'
import { authFetch } from '@/contexts/AppContext'

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
}

// 格式化文件大小
const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 获取文件图标
const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return '🖼️'
  if (type.includes('pdf')) return '📄'
  if (type.includes('spreadsheet') || type.includes('excel')) return '📊'
  return '📎'
}

export function ReviewDialog({
  open,
  onOpenChange,
  experiment,
  onSuccess,
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
      const res = await authFetch(`/api/experiments/${experiment.id}/reviewers`)
      if (res && res.ok) {
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

  // 提交审核
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
      // 先上传附件（如果有的话）
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

      // 调用审核 API
      const res = await authFetch(`/api/experiments/${experiment.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          feedback: feedback || undefined,
          transferToUserId: action === 'TRANSFER' ? selectedTransferUser : undefined,
          attachmentIds: uploadedAttachmentIds.length > 0 ? uploadedAttachmentIds : undefined
        })
      })

      if (res && res.ok) {
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
        const errorData = await res?.json().catch(() => ({}))
        toast({
          variant: 'destructive',
          title: '操作失败',
          description: errorData.error || '请稍后重试',
        })
      }
    } catch (error) {
      console.error('Review error:', error)
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: '网络错误，请稍后重试',
      })
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

        {/* 实验附件快捷下载 */}
        {experiment.attachments && experiment.attachments.length > 0 && (
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              实验附件 ({experiment.attachments.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {experiment.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-2 rounded border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-lg">{getFileIcon(att.type)}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{att.name}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(att.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`/api/attachments/${att.id}/download`, '_blank')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

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

              <TabsContent value="APPROVE" className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  通过审核后，实验记录将被锁定，无法再进行编辑。
                </p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">审核意见（可选）</label>
                  <Textarea
                    placeholder="请输入审核意见..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="REQUEST_REVISION" className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  请填写需要作者修改的具体内容：
                </p>
                <Textarea
                  placeholder="请输入修改意见..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                />
                
                {/* 批注附件上传 - 仅在要求修改时显示 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">审核批注附件（可选）</label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      添加批注附件
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
                            type="button"
                            onClick={() => removeAttachment(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="TRANSFER" className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">转交说明（可选）</label>
                  <Textarea
                    placeholder="请输入转交原因或说明..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                  />
                </div>
              </TabsContent>
            </Tabs>
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
