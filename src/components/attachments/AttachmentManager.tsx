'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  File, 
  Trash2,
  MoreVertical,
  Loader2,
  Eye,
  Download
} from 'lucide-react'
import { FilePreviewDialog } from './FilePreviewDialog'
import { PreviewData } from '@/contexts/AppContext'

interface Attachment {
  id: string
  name: string
  type: string
  size: number
  path: string
  category: string
  previewData: PreviewData
  createdAt: string
}

interface AttachmentManagerProps {
  experimentId: string
  attachments: Attachment[]
  canEdit: boolean
  onAttachmentsChange: () => void
}

export function AttachmentManager({ 
  experimentId, 
  attachments, 
  canEdit,
  onAttachmentsChange 
}: AttachmentManagerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null)

  // 获取文件图标
  const getFileIcon = (type: string, category: string) => {
    if (category === 'IMAGE' || type.startsWith('image/')) return <FileImage className="w-5 h-5 text-purple-500" />
    if (category === 'DATA_FILE' || type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="w-5 h-5 text-green-500" />
    return <FileText className="w-5 h-5 text-blue-500" />
  }

  // 获取文件分类颜色
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'DOCUMENT': return 'bg-blue-100 text-blue-700'
      case 'DATA_FILE': return 'bg-green-100 text-green-700'
      case 'IMAGE': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // 获取预览摘要
  const getPreviewSummary = (attachment: Attachment) => {
    const data = attachment.previewData
    if (!data) return null
    
    switch (data.type) {
      case 'word':
        return `${data.pages}页 · ${data.paragraphs}段落`
      case 'pdf':
        return `${data.pages}页 · ${data.chars.toLocaleString()}字符`
      case 'excel':
        return `${data.totalSheets}个工作表`
      case 'markdown':
        return `${data.chars.toLocaleString()}字符`
      default:
        return null
    }
  }

  // 上传文件
  const handleUpload = useCallback(async (files: FileList) => {
    if (!files.length || !canEdit) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('experimentId', experimentId)
      
      const file = files[0]
      formData.append('file', file)

      const response = await fetch('/api/attachments', {
        method: 'POST',
        body: formData
      })

      setUploadProgress(100)

      if (response.ok) {
        onAttachmentsChange()
      } else {
        const error = await response.json()
        alert(error.error || '上传失败')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('上传失败')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [experimentId, canEdit, onAttachmentsChange])

  // 删除文件
  const handleDelete = async (attachmentId: string) => {
    if (!confirm('确定要删除这个附件吗？')) return

    try {
      const response = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onAttachmentsChange()
      } else {
        alert('删除失败')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('删除失败')
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              实验附件 ({attachments.length})
            </span>
            {canEdit && (
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".doc,.docx,.pdf,.xls,.xlsx,.txt,.md,.tex,.png,.jpg,.jpeg"
                  onChange={(e) => e.target.files && handleUpload(e.target.files)}
                  disabled={isUploading}
                />
                <Button size="sm" variant="outline" asChild>
                  <span>
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        上传中...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        上传文件
                      </>
                    )}
                  </span>
                </Button>
              </label>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 上传进度 */}
          {isUploading && (
            <div className="mb-4">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-1">正在上传...</p>
            </div>
          )}

          {/* 文件列表 */}
          {attachments.length === 0 ? (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Upload className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground mb-1">暂无附件</p>
              <p className="text-xs text-muted-foreground/70">
                支持 Word、Excel、PDF、图片等格式
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {attachments.map((attachment) => {
                const previewSummary = getPreviewSummary(attachment)
                
                return (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {getFileIcon(attachment.type, attachment.category)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{attachment.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(attachment.size)}
                        {previewSummary && (
                          <>
                            <span className="mx-2">·</span>
                            {previewSummary}
                          </>
                        )}
                      </p>
                    </div>

                    <Badge variant="secondary" className={getCategoryColor(attachment.category)}>
                      {attachment.category === 'DOCUMENT' && '文档'}
                      {attachment.category === 'DATA_FILE' && '数据'}
                      {attachment.category === 'IMAGE' && '图片'}
                      {attachment.category === 'RAW_DATA' && '原始数据'}
                      {attachment.category === 'LOCKED_PDF' && '锁定PDF'}
                      {attachment.category === 'OTHER' && '其他'}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPreviewAttachment(attachment)}>
                          <Eye className="w-4 h-4 mr-2" />
                          预览信息
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`/api/attachments/${attachment.id}/download`, '_blank')}>
                          <Download className="w-4 h-4 mr-2" />
                          下载
                        </DropdownMenuItem>
                        {canEdit && attachment.category !== 'LOCKED_PDF' && (
                          <DropdownMenuItem 
                            onClick={() => handleDelete(attachment.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 文件预览对话框 */}
      <FilePreviewDialog
        attachment={previewAttachment}
        open={!!previewAttachment}
        onOpenChange={(open) => !open && setPreviewAttachment(null)}
      />
    </>
  )
}
