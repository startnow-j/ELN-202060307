'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ArrowLeft, 
  Save, 
  FileText,
  Tag,
  Loader2,
  Send,
  CheckCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react'
import { useApp, Experiment, ReviewStatus, ExtractedInfo, Attachment } from '@/contexts/AppContext'
import { AttachmentManager } from '@/components/attachments/AttachmentManager'
import { ExtractedInfoPanel } from '@/components/experiments/ExtractedInfoPanel'

interface ExperimentEditorProps {
  experimentId: string | null
  onSave: () => void
  onCancel: () => void
}

// 审核状态配置
const reviewStatusConfig: Record<ReviewStatus, { label: string; color: string; description: string }> = {
  DRAFT: { label: '草稿', color: 'bg-gray-100 text-gray-700', description: '可以继续编辑' },
  PENDING_REVIEW: { label: '待审核', color: 'bg-yellow-100 text-yellow-700', description: '等待审核中' },
  NEEDS_REVISION: { label: '需要修改', color: 'bg-orange-100 text-orange-700', description: '请根据审核意见修改' },
  LOCKED: { label: '已锁定', color: 'bg-green-100 text-green-700', description: '审核通过，已锁定' },
}

export function ExperimentEditor({ experimentId, onSave, onCancel }: ExperimentEditorProps) {
  const { 
    projects, 
    experiments, 
    createExperiment, 
    updateExperiment, 
    currentUser,
    triggerExtraction,
    updateExtractedInfo,
    submitForReview,
    refreshData
  } = useApp()
  
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 表单状态
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [conclusion, setConclusion] = useState('')
  const [tags, setTags] = useState('')
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  
  // v3.0新增状态
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('DRAFT')
  const [completenessScore, setCompletenessScore] = useState(0)
  const [extractionStatus, setExtractionStatus] = useState<string>('PENDING')
  const [extractedInfo, setExtractedInfo] = useState<ExtractedInfo | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])

  // 加载现有实验数据
  useEffect(() => {
    if (experimentId) {
      const experiment = experiments.find(e => e.id === experimentId)
      if (experiment) {
        setTitle(experiment.title)
        setSummary(experiment.summary || '')
        setConclusion(experiment.conclusion || '')
        setTags(experiment.tags || '')
        setSelectedProjects(experiment.projects.map(p => p.id))
        setReviewStatus(experiment.reviewStatus)
        setCompletenessScore(experiment.completenessScore)
        setExtractionStatus(experiment.extractionStatus)
        setExtractedInfo(experiment.extractedInfo)
        setAttachments(experiment.attachments || [])
      }
    }
  }, [experimentId, experiments])

  // 计算完整度评分（v3.3 新评分标准 - 满分100分）
  // 标题 10分 | 摘要 15分 | 结论 15分 | 关联项目 10分 | 附件 30分 | AI提取 10分 | 标签 10分
  const calculateCompleteness = useCallback(() => {
    let score = 0
    
    // 标题 10分 - 填写即得分
    if (title.trim()) score += 10
    
    // 摘要 15分 - ≥20字符得满分，否则得10分
    if (summary.trim()) {
      score += summary.length >= 20 ? 15 : 10
    }
    
    // 结论 15分 - ≥20字符得满分，否则得10分
    if (conclusion.trim()) {
      score += conclusion.length >= 20 ? 15 : 10
    }
    
    // 关联项目 10分 - 关联即得分
    if (selectedProjects.length > 0) score += 10
    
    // 附件 30分 - 基础15分 + 每个附件5分（最多15分额外）
    if (attachments.length > 0) {
      score += 15 // 基础分
      score += Math.min(15, attachments.length * 5) // 每个附件5分，最多15分
    }
    
    // AI提取信息 10分 - 试剂/仪器/参数/步骤各2.5分
    if (extractedInfo) {
      if (extractedInfo.reagents?.length) score += 2.5
      if (extractedInfo.instruments?.length) score += 2.5
      if (extractedInfo.parameters?.length) score += 2.5
      if (extractedInfo.steps?.length) score += 2.5
    }
    
    // 标签 10分 - 填写即得分
    if (tags.trim()) score += 10
    
    return Math.min(100, Math.round(score))
  }, [title, summary, conclusion, selectedProjects, attachments, extractedInfo, tags])

  // 更新完整度评分
  useEffect(() => {
    const score = calculateCompleteness()
    setCompletenessScore(score)
  }, [calculateCompleteness])

  // 判断是否可编辑
  const canEdit = reviewStatus === 'DRAFT' || reviewStatus === 'NEEDS_REVISION'
  // 提交审核条件：评分>=60 且 必须关联项目
  const canSubmit = completenessScore >= 60 && selectedProjects.length > 0 && canEdit

  // 刷新实验数据
  const refreshExperimentData = useCallback(async () => {
    if (!experimentId) return
    
    try {
      // 直接获取最新的附件列表
      const response = await fetch(`/api/attachments?experimentId=${experimentId}`)
      if (response.ok) {
        const newAttachments = await response.json()
        setAttachments(newAttachments)
      }
      
      // 同时刷新全局数据
      await refreshData()
    } catch (error) {
      console.error('Failed to refresh experiment data:', error)
    }
  }, [experimentId, refreshData])

  // 保存实验
  const handleSave = async () => {
    if (!title.trim()) {
      alert('请输入实验标题')
      return
    }

    setIsLoading(true)
    try {
      const data = {
        title,
        summary: summary || null,
        conclusion: conclusion || null,
        tags: tags || null,
        completenessScore,
      }

      if (experimentId) {
        await updateExperiment(experimentId, data, selectedProjects)
        // 刷新数据以获取最新附件
        refreshExperimentData()
      } else {
        const newExperiment = await createExperiment(data, selectedProjects)
        if (newExperiment) {
          // 创建成功后，需要跳转到编辑模式以便上传附件
          // 这里通过刷新页面实现
          window.location.reload()
        }
      }
      onSave()
    } catch (error) {
      console.error('Failed to save experiment:', error)
      alert('保存失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 提交审核
  const handleSubmitReview = async () => {
    if (!experimentId) return
    
    // 检查关联项目
    if (selectedProjects.length === 0) {
      alert('请先关联项目才能提交审核')
      return
    }
    
    if (completenessScore < 60) {
      alert('完整度不足60分，无法提交审核')
      return
    }
    
    setIsSubmitting(true)
    try {
      const success = await submitForReview(experimentId)
      if (success) {
        setReviewStatus('PENDING_REVIEW')
        alert('已提交审核')
        onSave()
      } else {
        alert('提交失败')
      }
    } catch (error) {
      console.error('Failed to submit for review:', error)
      alert('提交失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  // AI提取处理 - 支持选择特定附件
  const handleExtract = async (attachmentIds: string[]): Promise<boolean> => {
    if (!experimentId || attachmentIds.length === 0) return false
    
    try {
      const res = await fetch(`/api/experiments/${experimentId}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentIds })
      })
      
      if (res.ok) {
        const updated = await res.json()
        setExtractionStatus(updated.extractionStatus)
        setExtractedInfo(updated.extractedInfo)
        await refreshData()
        return true
      } else {
        const errorData = await res.json().catch(() => ({ error: '提取失败' }))
        throw new Error(errorData.error || 'AI提取失败')
      }
    } catch (error) {
      console.error('Failed to extract:', error)
      throw error
    }
  }

  // 更新提取信息
  const handleUpdateExtractedInfo = async (info: ExtractedInfo) => {
    if (!experimentId) return false
    return await updateExtractedInfo(experimentId, info)
  }

  // 应用提取结果到摘要和结论字段
  const handleApplyToFields = (summary: string, conclusion: string) => {
    if (summary) {
      setSummary(summary)
    }
    if (conclusion) {
      setConclusion(conclusion)
    }
  }

  // 切换项目选择
  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    )
  }

  // 获取完整度评分颜色
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="border-b border-border bg-background px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">
                {experimentId ? '编辑实验记录' : '新建实验记录'}
              </h1>
              <Badge className={reviewStatusConfig[reviewStatus].color}>
                {reviewStatusConfig[reviewStatus].label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {experimentId ? '修改实验记录内容' : '创建新的实验记录'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* 评分 */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
            <span className="text-sm text-muted-foreground">评分</span>
            <span className={`text-lg font-bold ${getScoreColor(completenessScore)}`}>
              {completenessScore}
            </span>
          </div>
          
          {canEdit && (
            <>
              <Button variant="outline" onClick={onCancel}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
              {experimentId && canSubmit && (
                <Button onClick={handleSubmitReview} disabled={isSubmitting} variant="default">
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Send className="w-4 h-4 mr-2" />
                  提交审核
                </Button>
              )}
            </>
          )}
          
          {!canEdit && (
            <Badge variant="outline" className="gap-1 px-3 py-1">
              {reviewStatus === 'PENDING_REVIEW' ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  等待审核中
                </>
              ) : reviewStatus === 'LOCKED' ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  已锁定
                </>
              ) : null}
            </Badge>
          )}
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧 - 主要内容 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  基本信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">实验标题 *</Label>
                  <Input
                    id="title"
                    placeholder="输入实验标题"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">实验摘要</Label>
                  <Textarea
                    id="summary"
                    placeholder="简要描述实验目的、方法和主要发现..."
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={4}
                    disabled={!canEdit}
                  />
                  <p className="text-xs text-muted-foreground">
                    {summary.length} 字符 {summary.length >= 20 ? '✓' : '(建议至少20字符)'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conclusion">结论与分析</Label>
                  <Textarea
                    id="conclusion"
                    placeholder="记录实验结论、结果分析和讨论..."
                    value={conclusion}
                    onChange={(e) => setConclusion(e.target.value)}
                    rows={4}
                    disabled={!canEdit}
                  />
                  <p className="text-xs text-muted-foreground">
                    {conclusion.length} 字符 {conclusion.length >= 20 ? '✓' : '(建议至少20字符)'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">标签</Label>
                  <Input
                    id="tags"
                    placeholder="多个标签用逗号分隔，如: PCR,蛋白纯化,Western Blot"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 关联项目 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  关联项目
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {projects.map((project) => (
                    <Badge
                      key={project.id}
                      variant={selectedProjects.includes(project.id) ? 'default' : 'outline'}
                      className={`cursor-pointer px-3 py-1 transition-colors ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => canEdit && toggleProject(project.id)}
                    >
                      {project.name}
                    </Badge>
                  ))}
                  {projects.length === 0 && (
                    <p className="text-sm text-muted-foreground">暂无可关联的项目</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 附件管理 */}
            {experimentId && (
              <AttachmentManager
                experimentId={experimentId}
                attachments={attachments}
                canEdit={canEdit}
                onAttachmentsChange={refreshExperimentData}
              />
            )}

            {/* 新建实验时的附件提示 */}
            {!experimentId && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    附件上传
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground mb-2">
                      请先保存实验记录后再上传附件
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      支持 Word、Excel、PDF、Markdown、LaTeX 等格式
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧 - AI提取面板 */}
          <div className="space-y-6">
            {/* 完整度评分 - 简洁显示 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>评分</span>
                  <span className={`text-2xl font-bold ${getScoreColor(completenessScore)}`}>
                    {completenessScore}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={completenessScore} className="h-2" />
                
                {/* 评分明细 - 紧凑网格 */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">标题</span>
                    <span className={title.trim() ? 'text-green-600' : ''}>{title.trim() ? '✓' : '-'} 10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">摘要</span>
                    <span className={summary.trim() ? 'text-green-600' : ''}>{summary.trim() ? (summary.length >= 20 ? '✓ 15' : '10') : '- 0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">结论</span>
                    <span className={conclusion.trim() ? 'text-green-600' : ''}>{conclusion.trim() ? (conclusion.length >= 20 ? '✓ 15' : '10') : '- 0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">项目</span>
                    <span className={selectedProjects.length > 0 ? 'text-green-600' : ''}>{selectedProjects.length > 0 ? '✓' : '-'} 10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">附件</span>
                    <span className={attachments.length > 0 ? 'text-green-600' : ''}>
                      {attachments.length > 0 ? `${15 + Math.min(15, attachments.length * 5)}` : '- 0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AI</span>
                    <span className={extractedInfo ? 'text-green-600' : ''}>
                      {extractedInfo ? Math.round(
                        (extractedInfo.reagents?.length ? 2.5 : 0) +
                        (extractedInfo.instruments?.length ? 2.5 : 0) +
                        (extractedInfo.parameters?.length ? 2.5 : 0) +
                        (extractedInfo.steps?.length ? 2.5 : 0)
                      ) : '- 0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">标签</span>
                    <span className={tags.trim() ? 'text-green-600' : ''}>{tags.trim() ? '✓' : '-'} 10</span>
                  </div>
                </div>
                
                <Separator className="my-2" />
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {selectedProjects.length === 0 ? (
                      <span className="text-amber-600">需关联项目</span>
                    ) : completenessScore < 60 ? (
                      <span className="text-amber-600">需≥60分提交</span>
                    ) : (
                      <span className="text-green-600">可提交审核</span>
                    )}
                  </span>
                  <span className="text-muted-foreground">满分100</span>
                </div>
              </CardContent>
            </Card>

            {/* AI提取面板 */}
            {experimentId && (
              <ExtractedInfoPanel
                experiment={{
                  id: experimentId,
                  extractionStatus: extractionStatus as any,
                  extractedInfo,
                  extractionError: null,
                } as any}
                attachments={attachments}
                onExtract={handleExtract}
                onUpdate={handleUpdateExtractedInfo}
                onApplyToFields={handleApplyToFields}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
