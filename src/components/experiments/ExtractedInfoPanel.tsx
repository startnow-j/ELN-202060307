'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Sparkles, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  FlaskConical,
  Settings,
  FileText,
  ListChecks,
  AlertTriangle,
  Plus,
  X,
  Edit3,
  Save,
  File,
  ArrowUpToLine
} from 'lucide-react'
import { Experiment, ExtractedInfo, Attachment } from '@/contexts/AppContext'

interface ExtractedInfoPanelProps {
  experiment: Experiment
  attachments: Attachment[]
  onExtract: (attachmentIds: string[]) => Promise<boolean>
  onUpdate: (info: ExtractedInfo) => Promise<boolean>
  onApplyToFields: (summary: string, conclusion: string) => void
}

export function ExtractedInfoPanel({ 
  experiment, 
  attachments, 
  onExtract, 
  onUpdate,
  onApplyToFields 
}: ExtractedInfoPanelProps) {
  const [isExtracting, setIsExtracting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedInfo, setEditedInfo] = useState<ExtractedInfo | null>(null)
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([])
  const [showFileSelector, setShowFileSelector] = useState(false)

  const extractionStatus = experiment.extractionStatus
  const extractedInfo = experiment.extractedInfo

  // 可用于提取的文档附件
  const extractableAttachments = attachments.filter(
    a => a.category === 'DOCUMENT' || a.category === 'DATA_FILE'
  )

  // 切换附件选择
  const toggleAttachment = (id: string) => {
    setSelectedAttachments(prev => 
      prev.includes(id) 
        ? prev.filter(a => a !== id) 
        : [...prev, id]
    )
  }

  // 全选/取消全选
  const toggleAll = () => {
    if (selectedAttachments.length === extractableAttachments.length) {
      setSelectedAttachments([])
    } else {
      setSelectedAttachments(extractableAttachments.map(a => a.id))
    }
  }

  // 触发AI提取
  const handleExtract = async () => {
    if (selectedAttachments.length === 0) {
      alert('请至少选择一个文件进行提取')
      return
    }
    
    setIsExtracting(true)
    setShowFileSelector(false)
    try {
      await onExtract(selectedAttachments)
    } finally {
      setIsExtracting(false)
    }
  }

  // 开始编辑
  const handleStartEdit = () => {
    setEditedInfo(extractedInfo || {})
    setIsEditing(true)
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (editedInfo) {
      await onUpdate(editedInfo)
    }
    setIsEditing(false)
    setEditedInfo(null)
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedInfo(null)
  }

  // 应用到摘要和结论
  const handleApplyToFields = () => {
    const summary = extractedInfo?.rawSummary || ''
    const conclusion = extractedInfo?.conclusion || ''
    
    if (!summary && !conclusion) {
      alert('没有可应用的内容')
      return
    }
    
    onApplyToFields(summary, conclusion)
  }

  // 添加试剂
  const handleAddReagent = () => {
    if (!editedInfo) return
    const newReagents = [...(editedInfo.reagents || []), { name: '', specification: '', batch: '', manufacturer: '', amount: '' }]
    setEditedInfo({ ...editedInfo, reagents: newReagents })
  }

  // 删除试剂
  const handleRemoveReagent = (index: number) => {
    if (!editedInfo?.reagents) return
    const newReagents = editedInfo.reagents.filter((_, i) => i !== index)
    setEditedInfo({ ...editedInfo, reagents: newReagents })
  }

  // 渲染状态指示器
  const renderStatus = () => {
    switch (extractionStatus) {
      case 'PENDING':
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">等待提取</span>
          </div>
        )
      case 'PROCESSING':
        return (
          <div className="flex items-center gap-2 text-yellow-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">正在提取...</span>
          </div>
        )
      case 'COMPLETED':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">提取完成</span>
          </div>
        )
      case 'FAILED':
        return (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">提取失败</span>
          </div>
        )
    }
  }

  // 文件选择器
  if (showFileSelector || (!extractedInfo && !isEditing)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI智能提取
          </CardTitle>
        </CardHeader>
        <CardContent>
          {extractableAttachments.length === 0 ? (
            <div className="text-center py-6">
              <File className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">
                请先上传文档类附件（Word、PDF、Excel等）
              </p>
              <p className="text-xs text-muted-foreground/70">
                AI将从选定的文件中提取实验关键信息
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                选择要进行AI提取的文件：
              </p>
              
              {/* 全选按钮 */}
              <div className="flex items-center justify-between">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={toggleAll}
                >
                  {selectedAttachments.length === extractableAttachments.length 
                    ? '取消全选' 
                    : '全选'}
                </Button>
                <span className="text-xs text-muted-foreground">
                  已选择 {selectedAttachments.length} / {extractableAttachments.length} 个文件
                </span>
              </div>
              
              {/* 文件列表 */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {extractableAttachments.map((attachment) => (
                  <label
                    key={attachment.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedAttachments.includes(attachment.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedAttachments.includes(attachment.id)}
                      onCheckedChange={() => toggleAttachment(attachment.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {attachment.category === 'DOCUMENT' ? '文档' : '数据文件'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              
              {/* 操作按钮 */}
              <div className="flex gap-2 pt-2">
                {extractedInfo && (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowFileSelector(false)}
                    className="flex-1"
                  >
                    取消
                  </Button>
                )}
                <Button 
                  onClick={handleExtract} 
                  disabled={isExtracting || selectedAttachments.length === 0}
                  className="flex-1 gap-2"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      正在提取...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      开始AI提取
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const currentInfo = isEditing ? editedInfo : extractedInfo

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI提取结果
          </span>
          <div className="flex items-center gap-2">
            {renderStatus()}
            {!isEditing ? (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowFileSelector(true)} 
                  disabled={isExtracting}
                >
                  {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span className="ml-1 hidden sm:inline">重新提取</span>
                </Button>
                <Button size="sm" variant="outline" onClick={handleStartEdit}>
                  <Edit3 className="w-4 h-4 mr-1" />
                  编辑
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  <X className="w-4 h-4 mr-1" />
                  取消
                </Button>
                <Button size="sm" onClick={handleSaveEdit}>
                  <Save className="w-4 h-4 mr-1" />
                  保存
                </Button>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 应用到字段按钮 */}
        {(currentInfo?.rawSummary || currentInfo?.conclusion) && !isEditing && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <Button 
              size="sm" 
              onClick={handleApplyToFields}
              className="w-full gap-2"
            >
              <ArrowUpToLine className="w-4 h-4" />
              应用到摘要和结论
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              将提取的内容自动填充到上方的摘要和结论字段
            </p>
          </div>
        )}

        {/* 试剂信息 */}
        {currentInfo?.reagents && currentInfo.reagents.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              试剂信息
            </h4>
            <div className="space-y-2">
              {currentInfo.reagents.map((reagent, index) => (
                <div key={index} className="p-3 bg-muted/50 rounded-lg relative group">
                  {isEditing && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => handleRemoveReagent(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {isEditing ? (
                      <>
                        <Input
                          placeholder="试剂名称"
                          value={reagent.name}
                          onChange={(e) => {
                            const newReagents = [...(currentInfo.reagents || [])]
                            newReagents[index] = { ...newReagents[index], name: e.target.value }
                            setEditedInfo({ ...currentInfo, reagents: newReagents })
                          }}
                          className="h-8"
                        />
                        <Input
                          placeholder="批号"
                          value={reagent.batch || ''}
                          onChange={(e) => {
                            const newReagents = [...(currentInfo.reagents || [])]
                            newReagents[index] = { ...newReagents[index], batch: e.target.value }
                            setEditedInfo({ ...currentInfo, reagents: newReagents })
                          }}
                          className="h-8"
                        />
                      </>
                    ) : (
                      <>
                        <span className="font-medium">{reagent.name}</span>
                        {reagent.batch && <Badge variant="secondary">批号: {reagent.batch}</Badge>}
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                      {reagent.manufacturer && <span>厂家: {reagent.manufacturer}</span>}
                      {reagent.amount && <span>用量: {reagent.amount}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {isEditing && (
              <Button size="sm" variant="outline" onClick={handleAddReagent} className="mt-2">
                <Plus className="w-4 h-4 mr-1" />
                添加试剂
              </Button>
            )}
          </div>
        )}

        {/* 仪器设备 */}
        {currentInfo?.instruments && currentInfo.instruments.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              仪器设备
            </h4>
            <div className="flex flex-wrap gap-2">
              {currentInfo.instruments.map((inst, index) => (
                <Badge key={index} variant="secondary" className="px-3 py-1">
                  {inst.name}
                  {inst.model && <span className="ml-1 opacity-70">({inst.model})</span>}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 关键参数 */}
        {currentInfo?.parameters && currentInfo.parameters.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <ListChecks className="w-4 h-4" />
              关键参数
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {currentInfo.parameters.map((param, index) => (
                <div key={index} className="flex justify-between p-2 bg-muted/50 rounded text-sm">
                  <span className="text-muted-foreground">{param.name}</span>
                  <span className="font-medium">{param.value} {param.unit || ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 实验步骤 */}
        {currentInfo?.steps && currentInfo.steps.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              实验步骤
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              {currentInfo.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {/* 安全注意事项 */}
        {currentInfo?.safetyNotes && currentInfo.safetyNotes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              安全注意事项
            </h4>
            <ul className="space-y-1">
              {currentInfo.safetyNotes.map((note, index) => (
                <li key={index} className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 内容摘要 */}
        {currentInfo?.rawSummary && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              内容摘要
            </h4>
            {isEditing ? (
              <Textarea
                value={currentInfo.rawSummary}
                onChange={(e) => setEditedInfo({ ...currentInfo, rawSummary: e.target.value })}
                rows={3}
              />
            ) : (
              <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                {currentInfo.rawSummary}
              </p>
            )}
          </div>
        )}

        {/* 结论 */}
        {currentInfo?.conclusion && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              实验结论
            </h4>
            {isEditing ? (
              <Textarea
                value={currentInfo.conclusion}
                onChange={(e) => setEditedInfo({ ...currentInfo, conclusion: e.target.value })}
                rows={3}
              />
            ) : (
              <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                {currentInfo.conclusion}
              </p>
            )}
          </div>
        )}

        {/* 如果没有任何提取信息 */}
        {!currentInfo?.reagents?.length && 
         !currentInfo?.instruments?.length && 
         !currentInfo?.parameters?.length && 
         !currentInfo?.steps?.length && 
         !currentInfo?.safetyNotes?.length && 
         !currentInfo?.rawSummary &&
         !currentInfo?.conclusion && (
          <p className="text-muted-foreground text-sm text-center py-4">
            暂无提取信息，请重新提取
          </p>
        )}
      </CardContent>
    </Card>
  )
}
