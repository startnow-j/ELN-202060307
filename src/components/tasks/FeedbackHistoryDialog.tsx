'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { History, Loader2, User, CheckCircle, RefreshCw, Paperclip, Download } from 'lucide-react'
import { Experiment, ReviewFeedback } from '@/contexts/AppContext'

interface FeedbackHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  experiment: Experiment | null
}

export function FeedbackHistoryDialog({
  open,
  onOpenChange,
  experiment,
}: FeedbackHistoryDialogProps) {
  const [feedbacks, setFeedbacks] = useState<ReviewFeedback[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && experiment) {
      loadFeedbacks()
    }
  }, [open, experiment?.id])

  const loadFeedbacks = async () => {
    if (!experiment) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/experiments/${experiment.id}/feedbacks`)
      if (res.ok) {
        const data = await res.json()
        setFeedbacks(data.feedbacks || [])
      }
    } finally {
      setIsLoading(false)
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

  if (!experiment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            审核历史
          </DialogTitle>
          <DialogDescription>
            实验记录「{experiment.title}」的审核反馈历史
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : feedbacks.length > 0 ? (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {feedbacks.map((feedback, index) => (
                <div
                  key={feedback.id}
                  className="border rounded-lg p-4 bg-muted/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <span className="font-medium">{feedback.reviewer?.name || '审核人'}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {formatDate(feedback.createdAt)}
                        </span>
                      </div>
                    </div>
                    <Badge
                      className={
                        feedback.action === 'APPROVE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }
                    >
                      {feedback.action === 'APPROVE' ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          通过
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 mr-1" />
                          要求修改
                        </>
                      )}
                    </Badge>
                  </div>

                  {feedback.feedback && (
                    <p className="text-sm text-muted-foreground mt-2 pl-10">
                      {feedback.feedback}
                    </p>
                  )}

                  {/* 批注附件 */}
                  {feedback.attachments && feedback.attachments.length > 0 && (
                    <div className="mt-3 pl-10 space-y-2">
                      <p className="text-xs text-muted-foreground">批注附件：</p>
                      {feedback.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Paperclip className="w-4 h-4 text-muted-foreground" />
                          <span>{att.name}</span>
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
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>暂无审核历史</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
