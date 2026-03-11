'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { UploadForm, DocumentType } from '../types'

interface UploadDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  uploadForm: UploadForm
  uploadFile: File | null
  isLoading: boolean
  onFormChange: (form: UploadForm) => void
  onFileChange: (file: File | null) => void
  onUpload: () => void
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  uploadForm,
  uploadFile,
  isLoading,
  onFormChange,
  onFileChange,
  onUpload,
}: UploadDocumentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>上传项目文档</DialogTitle>
          <DialogDescription>
            上传项目相关文档
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>选择文件</Label>
            <Input
              type="file"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            />
          </div>
          <div className="space-y-2">
            <Label>文档类型</Label>
            <Select 
              value={uploadForm.type} 
              onValueChange={(v) => onFormChange({ ...uploadForm, type: v as DocumentType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PROPOSAL">立项报告</SelectItem>
                <SelectItem value="PROGRESS_REPORT">进展报告</SelectItem>
                <SelectItem value="FINAL_REPORT">结题报告</SelectItem>
                <SelectItem value="OTHER">其他文档</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>描述</Label>
            <Textarea
              value={uploadForm.description}
              onChange={(e) => onFormChange({ ...uploadForm, description: e.target.value })}
              placeholder="文档描述（可选）"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={onUpload} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            上传
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
