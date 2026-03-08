'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  File,
  SheetIcon
} from 'lucide-react'

interface WordPreview {
  type: 'word'
  pages: number
  paragraphs: number
  chars: number
  summary: string
}

interface PDFPreview {
  type: 'pdf'
  pages: number
  chars: number
  summary: string
}

interface ExcelSheetPreview {
  name: string
  rows: number
  cols: number
  headers: string[]
  sampleData: string[][]
}

interface ExcelPreview {
  type: 'excel'
  sheets: ExcelSheetPreview[]
  totalSheets: number
}

interface MarkdownPreview {
  type: 'markdown'
  chars: number
  summary: string
}

type PreviewData = WordPreview | PDFPreview | ExcelPreview | MarkdownPreview | null

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

interface FilePreviewDialogProps {
  attachment: Attachment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 格式化文件大小
const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Word预览组件
function WordPreviewContent({ data }: { data: WordPreview }) {
  return (
    <div className="space-y-4">
      {/* 文件信息 */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{data.pages}</p>
          <p className="text-xs text-muted-foreground">页数（估算）</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{data.paragraphs}</p>
          <p className="text-xs text-muted-foreground">段落数</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{data.chars.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">字符数</p>
        </div>
      </div>
      
      {/* 摘要 */}
      {data.summary && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            内容摘要
          </h4>
          <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground max-h-48 overflow-y-auto">
            {data.summary}
            {data.chars > 500 && <span className="text-primary ml-1">...</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// PDF预览组件
function PDFPreviewContent({ data }: { data: PDFPreview }) {
  return (
    <div className="space-y-4">
      {/* 文件信息 */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{data.pages}</p>
          <p className="text-xs text-muted-foreground">页数</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{data.chars.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">字符数</p>
        </div>
      </div>
      
      {/* 摘要 */}
      {data.summary && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            内容摘要
          </h4>
          <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground max-h-48 overflow-y-auto">
            {data.summary}
            {data.chars > 500 && <span className="text-primary ml-1">...</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// Markdown预览组件
function MarkdownPreviewContent({ data }: { data: MarkdownPreview }) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted/50 rounded-lg text-center">
        <p className="text-2xl font-bold text-primary">{data.chars.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">字符数</p>
      </div>
      
      {data.summary && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            内容预览
          </h4>
          <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground max-h-48 overflow-y-auto font-mono whitespace-pre-wrap">
            {data.summary}
          </div>
        </div>
      )}
    </div>
  )
}

// Excel预览组件
function ExcelPreviewContent({ data }: { data: ExcelPreview }) {
  const [selectedSheet, setSelectedSheet] = useState(0)
  
  if (!data.sheets.length) {
    return <p className="text-muted-foreground">无法解析Excel文件</p>
  }
  
  const sheet = data.sheets[selectedSheet]
  
  return (
    <div className="space-y-4">
      {/* Sheet概览 */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">工作表概览</h4>
          <Badge variant="secondary">共 {data.totalSheets} 个</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.sheets.map((s, i) => (
            <Button
              key={i}
              size="sm"
              variant={selectedSheet === i ? 'default' : 'outline'}
              onClick={() => setSelectedSheet(i)}
              className="h-auto py-1"
            >
              <SheetIcon className="w-3 h-3 mr-1" />
              {s.name}
              <span className="ml-1 text-xs opacity-70">({s.rows}行)</span>
            </Button>
          ))}
        </div>
      </div>
      
      {/* 当前Sheet详情 */}
      {sheet && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>行数: <strong className="text-foreground">{sheet.rows}</strong></span>
            <span>列数: <strong className="text-foreground">{sheet.cols}</strong></span>
          </div>
          
          {/* 数据预览表格 */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-center text-xs text-muted-foreground w-8">#</th>
                    {sheet.headers.map((h, i) => (
                      <th key={i} className="px-2 py-1 text-left font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheet.sampleData.map((row, ri) => (
                    <tr key={ri} className="border-t hover:bg-muted/30">
                      <td className="px-2 py-1 text-center text-xs text-muted-foreground">
                        {ri + 1}
                      </td>
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-2 py-1 whitespace-nowrap max-w-[200px] truncate">
                          {cell || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sheet.rows > 6 && (
              <div className="px-3 py-2 bg-muted/50 text-xs text-muted-foreground text-center border-t">
                显示前 5 行，共 {sheet.rows} 行
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function FilePreviewDialog({ attachment, open, onOpenChange }: FilePreviewDialogProps) {
  if (!attachment) return null
  
  const handleDownload = () => {
    window.open(`/api/attachments/${attachment.id}/download`, '_blank')
  }
  
  const getIcon = () => {
    if (attachment.category === 'DATA_FILE') return <FileSpreadsheet className="w-12 h-12 text-green-500" />
    if (attachment.category === 'IMAGE') return <File className="w-12 h-12 text-purple-500" />
    return <FileText className="w-12 h-12 text-blue-500" />
  }
  
  const renderPreview = () => {
    const data = attachment.previewData
    
    if (!data) {
      return (
        <div className="text-center py-8">
          <File className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">暂无预览信息</p>
          <p className="text-xs text-muted-foreground mt-1">可下载后查看完整内容</p>
        </div>
      )
    }
    
    switch (data.type) {
      case 'word':
        return <WordPreviewContent data={data} />
      case 'pdf':
        return <PDFPreviewContent data={data} />
      case 'excel':
        return <ExcelPreviewContent data={data} />
      case 'markdown':
        return <MarkdownPreviewContent data={data} />
      default:
        return <p className="text-muted-foreground">不支持的文件类型</p>
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            <span className="truncate">{attachment.name}</span>
          </DialogTitle>
        </DialogHeader>
        
        {/* 基本信息 */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground pb-4 border-b">
          <span>大小: {formatSize(attachment.size)}</span>
          <span>·</span>
          <span>类型: {attachment.type || '未知'}</span>
          <span>·</span>
          <Badge variant="outline">
            {attachment.category === 'DOCUMENT' && '文档'}
            {attachment.category === 'DATA_FILE' && '数据'}
            {attachment.category === 'IMAGE' && '图片'}
            {attachment.category === 'RAW_DATA' && '原始数据'}
            {attachment.category === 'LOCKED_PDF' && '锁定PDF'}
            {attachment.category === 'OTHER' && '其他'}
          </Badge>
        </div>
        
        {/* 预览内容 */}
        {renderPreview()}
        
        {/* 下载按钮 */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            下载完整文件
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
