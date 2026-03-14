'use client'

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
import { AlertTriangle, Loader2 } from 'lucide-react'
import { StatusAction, StatusActionInfo } from '../types'

interface StatusChangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedAction: StatusAction | null
  availableActions: StatusActionInfo[]
  isLoading: boolean
  onConfirm: () => void
}

export function StatusChangeDialog({
  open,
  onOpenChange,
  selectedAction,
  availableActions,
  isLoading,
  onConfirm,
}: StatusChangeDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {selectedAction === 'archive' && <AlertTriangle className="w-5 h-5 text-destructive" />}
            确认操作
          </AlertDialogTitle>
          <AlertDialogDescription>
            {selectedAction && availableActions.find(a => a.action === selectedAction)?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={selectedAction === 'archive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            确认
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
