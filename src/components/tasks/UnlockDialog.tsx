'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Unlock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Experiment } from '@/contexts/AppContext'

interface UnlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  experiment: Experiment | null
  onSuccess: () => void
  viewMode?: 'default' | 'global'
}

export function UnlockDialog({
  open,
  onOpenChange,
  experiment,
  onSuccess,
  viewMode = 'default',
}: UnlockDialogProps) {
  const { toast } = useToast()
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!experiment || !reason.trim()) {
      toast({
        variant: 'destructive',
        title: '请填写解锁原因',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/experiments/${experiment.id}/unlock-request?viewMode=${viewMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (res.ok) {
        toast({
          title: '解锁申请已提交',
          description: '请等待审核人处理',
        })
        setReason('')
        onOpenChange(false)
        onSuccess()
      } else {
        const data = await res.json()
        toast({
          variant: 'destructive',
          title: '提交失败',
          description: data.error || '请稍后重试',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="w-5 h-5" />
            申请解锁
          </DialogTitle>
          <DialogDescription>
            请填写解锁原因，审核人将根据您的申请决定是否解锁
          </DialogDescription>
        </DialogHeader>

        {experiment && (
          <div className="text-sm text-muted-foreground mb-4">
            <p><strong>实验标题：</strong>{experiment.title}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">解锁原因 *</label>
          <Textarea
            placeholder="请详细说明需要解锁的原因..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                提交中...
              </>
            ) : (
              '提交申请'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
