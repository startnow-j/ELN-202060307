'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
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
  FileText
} from 'lucide-react'
import { useApp, ReviewStatus } from '@/contexts/AppContext'

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

export function ExperimentList({ onCreateExperiment, onViewExperiment }: ExperimentListProps) {
  const { experiments } = useApp()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // 过滤实验
  const filteredExperiments = experiments.filter(experiment => {
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
        <Button onClick={onCreateExperiment} className="gap-2">
          <Plus className="w-4 h-4" />
          新建实验
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索实验记录..."
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

      {/* 实验列表 */}
      {filteredExperiments.length > 0 ? (
        <div className="space-y-4">
          {filteredExperiments.map((experiment) => {
            const statusConfig = reviewStatusConfig[experiment.reviewStatus]
            
            return (
              <Card
                key={experiment.id}
                className="hover:border-primary/40 cursor-pointer transition-colors"
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
                      {/* 完整度评分 */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground">完整度</span>
                        <span className={`text-lg font-bold ${getScoreColor(experiment.completenessScore)}`}>
                          {experiment.completenessScore}%
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
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm || statusFilter !== 'all' ? '未找到匹配的实验记录' : '暂无实验记录'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? '尝试调整搜索条件'
                  : '点击下方按钮创建您的第一个实验记录'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={onCreateExperiment}>
                  <Plus className="w-4 h-4 mr-2" />
                  新建实验
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
