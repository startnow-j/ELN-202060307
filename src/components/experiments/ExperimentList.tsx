'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus, 
  Search, 
  FlaskConical,
  ChevronRight,
  Clock,
  Filter,
  Lock,
  AlertCircle,
  CheckCircle,
  FileText,
  FolderOpen,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'
import { useApp, ReviewStatus, Experiment } from '@/contexts/AppContext'

interface ExperimentListProps {
  onCreateExperiment: () => void
  onViewExperiment: (id: string) => void
}

// 审核状态配置
const reviewStatusConfig: Record<ReviewStatus, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { 
    label: '草稿', 
    color: 'bg-gray-100 text-gray-700',
    icon: <FileText className="w-3.5 h-3.5" />
  },
  PENDING_REVIEW: { 
    label: '待审核', 
    color: 'bg-yellow-100 text-yellow-700',
    icon: <AlertCircle className="w-3.5 h-3.5" />
  },
  NEEDS_REVISION: { 
    label: '需要修改', 
    color: 'bg-orange-100 text-orange-700',
    icon: <AlertCircle className="w-3.5 h-3.5" />
  },
  LOCKED: { 
    label: '已锁定', 
    color: 'bg-green-100 text-green-700',
    icon: <Lock className="w-3.5 h-3.5" />
  },
}

// 计算暂存天数
function getDaysSinceCreation(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  const diff = now.getTime() - created.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// 检查是否需要提醒关联项目
function needsProjectReminder(experiment: Experiment): boolean {
  return experiment.storageLocation === 'draft' || 
         (!experiment.storageLocation && experiment.projects.length === 0)
}

export function ExperimentList({ onCreateExperiment, onViewExperiment }: ExperimentListProps) {
  const { experiments, currentUser, refreshData } = useApp()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'projects' | 'drafts'>('projects')
  const [isLoading, setIsLoading] = useState(false)

  // 刷新数据
  const handleRefresh = async () => {
    setIsLoading(true)
    await refreshData()
    setIsLoading(false)
  }

  // 分离项目相关和暂存实验
  const projectExperiments = experiments.filter(exp => 
    exp.storageLocation !== 'draft' && exp.projects.length > 0
  )
  const draftExperiments = experiments.filter(exp => 
    exp.storageLocation === 'draft' || (!exp.storageLocation && exp.projects.length === 0)
  )

  // 计算超过10天未关联的暂存实验数量
  const staleDraftCount = draftExperiments.filter(exp => 
    getDaysSinceCreation(exp.createdAt) >= 10
  ).length

  // 根据当前 Tab 过滤实验
  const currentExperiments = activeTab === 'projects' ? projectExperiments : draftExperiments

  // 过滤实验
  const filteredExperiments = currentExperiments.filter(experiment => {
    const matchesSearch = experiment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (experiment.summary?.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || experiment.reviewStatus === statusFilter
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  // 检查用户是否有创建实验的权限
  const canCreateExperiment = (() => {
    if (!currentUser) return false
    if (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') return true
    
    for (const project of experiments.flatMap(e => e.projects)) {
      const myMembership = project.members?.find(m => m.id === currentUser.id)
      if (myMembership && (myMembership as any).projectRole !== 'VIEWER') {
        return true
      }
    }
    return false
  })()

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">实验记录</h1>
          <p className="text-muted-foreground mt-1">
            管理您的所有实验记录
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {canCreateExperiment && (
            <Button onClick={onCreateExperiment} className="gap-2">
              <Plus className="w-4 h-4" />
              新建实验
            </Button>
          )}
        </div>
      </div>

      {/* 暂存实验提醒 */}
      {staleDraftCount > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-800">
                  您有 {staleDraftCount} 个暂存实验待关联项目
                </p>
                <p className="text-sm text-amber-600">
                  这些实验已创建超过10天，请及时关联项目以便提交审核
                </p>
              </div>
              <Button 
                variant="outline" 
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={() => setActiveTab('drafts')}
              >
                查看暂存
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 分类 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'projects' | 'drafts')}>
        <TabsList>
          <TabsTrigger value="projects" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            项目相关
            <Badge variant="secondary" className="ml-1">
              {projectExperiments.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="drafts" className="gap-2">
            <FileText className="w-4 h-4" />
            我的暂存
            <Badge variant="secondary" className="ml-1">
              {draftExperiments.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* 搜索和筛选 */}
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={`搜索${activeTab === 'projects' ? '项目相关' : '暂存'}实验...`}
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="DRAFT">草稿</SelectItem>
                  <SelectItem value="PENDING_REVIEW">待审核</SelectItem>
                  <SelectItem value="NEEDS_REVISION">需要修改</SelectItem>
                  <SelectItem value="LOCKED">已锁定</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 项目相关实验 */}
        <TabsContent value="projects">
          {filteredExperiments.length > 0 ? (
            <ExperimentCardList 
              experiments={filteredExperiments}
              onViewExperiment={onViewExperiment}
              isDraft={false}
            />
          ) : (
            <EmptyState 
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              onCreateExperiment={canCreateExperiment ? onCreateExperiment : undefined}
              type="projects"
            />
          )}
        </TabsContent>

        {/* 暂存实验 */}
        <TabsContent value="drafts">
          {filteredExperiments.length > 0 ? (
            <ExperimentCardList 
              experiments={filteredExperiments}
              onViewExperiment={onViewExperiment}
              isDraft={true}
            />
          ) : (
            <EmptyState 
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              onCreateExperiment={canCreateExperiment ? onCreateExperiment : undefined}
              type="drafts"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// 实验卡片列表组件
function ExperimentCardList({ 
  experiments, 
  onViewExperiment, 
  isDraft 
}: { 
  experiments: Experiment[]
  onViewExperiment: (id: string) => void
  isDraft: boolean
}) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-4">
      {experiments.map((experiment) => {
        const statusConfig = reviewStatusConfig[experiment.reviewStatus]
        const daysSinceCreation = getDaysSinceCreation(experiment.createdAt)
        const isStale = isDraft && daysSinceCreation >= 10
        
        return (
          <Card
            key={experiment.id}
            className={`hover:border-primary/40 cursor-pointer transition-colors ${
              isStale ? 'border-amber-300' : ''
            }`}
            onClick={() => onViewExperiment(experiment.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <FlaskConical className="w-5 h-5 text-primary flex-shrink-0" />
                    <h3 className="font-semibold text-lg truncate">{experiment.title}</h3>
                    <Badge className={statusConfig.color}>
                      {statusConfig.icon}
                      <span className="ml-1">{statusConfig.label}</span>
                    </Badge>
                    {isDraft && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        暂存
                      </Badge>
                    )}
                    {isStale && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {daysSinceCreation}天未关联
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-muted-foreground line-clamp-2 mb-3">
                    {experiment.summary || '暂无摘要'}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span>作者: {experiment.author.name}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      更新于 {formatDate(experiment.updatedAt)}
                    </span>
                    {experiment.projects.length > 0 && (
                      <span>项目: {experiment.projects.map(p => p.name).join(', ')}</span>
                    )}
                  </div>

                  {experiment.tags && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {experiment.tags.split(',').map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 ml-4">
                  {/* 评分 */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground">评分</span>
                    <span className={`text-lg font-bold ${getScoreColor(experiment.completenessScore)}`}>
                      {experiment.completenessScore}
                    </span>
                    <Progress value={experiment.completenessScore} className="w-16 h-1.5" />
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// 空状态组件
function EmptyState({ 
  searchTerm, 
  statusFilter, 
  onCreateExperiment,
  type 
}: { 
  searchTerm: string
  statusFilter: string
  onCreateExperiment?: () => void
  type: 'projects' | 'drafts'
}) {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center">
          <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {searchTerm || statusFilter !== 'all' 
              ? '未找到匹配的实验记录'
              : type === 'drafts' 
                ? '暂无暂存实验'
                : '暂无项目相关实验'
            }
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? '尝试调整搜索条件'
              : type === 'drafts'
                ? '创建实验时不关联项目，将会保存在这里'
                : '加入项目后，您的项目实验将显示在这里'}
          </p>
          {onCreateExperiment && !searchTerm && statusFilter === 'all' && (
            <Button onClick={onCreateExperiment}>
              <Plus className="w-4 h-4 mr-2" />
              新建实验
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
