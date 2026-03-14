'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CheckCircle, XCircle, Loader2, Unlock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AppUser } from '@/contexts/AppContext'

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

interface ProcessUnlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: UnlockRequestItem | null
  action: 'APPROVE' | 'REJECT'
  onSuccess: () => void
}

export function ProcessUnlockDialog({
  open,
  onOpenChange,
  request,
  action,
  onSuccess,
}: ProcessUnlockDialogProps) {
  const { toast } = useToast()
  const [response, setResponse] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!request || !response.trim()) {
      toast({
        variant: 'destructive',
        title: '请填写处理理由',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/experiments/${request.experiment.id}/unlock-request`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          action,
          response: response.trim(),
        }),
      })

      if (res.ok) {
        toast({
          title: action === 'APPROVE' ? '已批准解锁' : '已拒绝解锁',
          description:
            action === 'APPROVE'
              ? '实验记录已解锁，作者可以继续编辑'
              : '解锁申请已被拒绝',
        })
        setResponse('')
        onOpenChange(false)
        onSuccess()
      } else {
        const data = await res.json()
        toast({
          variant: 'destructive',
          title: '处理失败',
          description: data.error || '请稍后重试',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!request) return null

  const isApprove = action === 'APPROVE'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApprove ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                批准解锁申请
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-destructive" />
                拒绝解锁申请
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? '批准后，实验记录将解锁，作者可以继续编辑'
              : '拒绝后，作者将收到通知'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{request.experiment.title}</span>
              <Badge className="bg-amber-100 text-amber-700">解锁申请</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              申请人: {request.requester.name} ({request.requester.email})
            </div>
            <div className="text-sm text-muted-foreground">
              实验作者: {request.experiment.author.name}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm font-medium text-amber-800 mb-1">申请理由：</p>
            <p className="text-sm text-amber-700">{request.reason}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {isApprove ? '批准理由' : '拒绝理由'} *
            </label>
            <Textarea
              placeholder={`请输入${isApprove ? '批准' : '拒绝'}理由...`}
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant={isApprove ? 'default' : 'destructive'}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                处理中...
              </>
            ) : isApprove ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                确认批准
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                确认拒绝
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
