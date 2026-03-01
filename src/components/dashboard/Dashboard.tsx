'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  FlaskConical, 
  FolderKanban, 
  FileText, 
  Plus,
  Clock,
  ChevronRight,
  Lock,
  AlertCircle,
  CheckCircle,
  ClipboardCheck
} from 'lucide-react'
import { useApp, ReviewStatus } from '@/contexts/AppContext'

interface DashboardProps {
  onCreateExperiment: () => void
  onViewExperiment: (id: string) => void
  onViewProject: (id: string) => void
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

export function Dashboard({ onCreateExperiment, onViewExperiment, onViewProject }: DashboardProps) {
  const { experiments, projects, currentUser } = useApp()

  // 计算统计数据
  const stats = {
    totalExperiments: experiments.length,
    draftExperiments: experiments.filter(e => e.reviewStatus === 'DRAFT').length,
    pendingReview: experiments.filter(e => e.reviewStatus === 'PENDING_REVIEW').length,
    lockedExperiments: experiments.filter(e => e.reviewStatus === 'LOCKED').length,
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'ACTIVE').length,
  }

  // 最近的实验记录
  const recentExperiments = [...experiments]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  // 我创建的实验
  const myExperiments = experiments.filter(e => e.authorId === currentUser?.id)

  // 待审核的实验（管理员和项目负责人可见）
  const pendingReviewExperiments = experiments.filter(e => e.reviewStatus === 'PENDING_REVIEW')
  const canReview = currentUser?.role === 'ADMIN' || currentUser?.role === 'PROJECT_LEAD'

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
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
          <h1 className="text-3xl font-bold tracking-tight">仪表盘</h1>
          <p className="text-muted-foreground mt-1">
            欢迎回来，{currentUser?.name}
          </p>
        </div>
        <Button onClick={onCreateExperiment} className="gap-2">
          <Plus className="w-4 h-4" />
          新建实验
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">实验记录总数</CardTitle>
            <FlaskConical className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExperiments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              我的实验: {myExperiments.length}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-primary/20 hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">草稿/待审核</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draftExperiments + stats.pendingReview}</div>
            <p className="text-xs text-muted-foreground mt-1">
              待审核: {stats.pendingReview}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-primary/20 hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已锁定</CardTitle>
            <Lock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lockedExperiments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              审核通过率 {stats.totalExperiments ? Math.round(stats.lockedExperiments / stats.totalExperiments * 100) : 0}%
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-primary/20 hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">项目总数</CardTitle>
            <FolderKanban className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              进行中: {stats.activeProjects}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 待审核提醒（仅管理员和项目负责人可见） */}
      {canReview && pendingReviewExperiments.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <ClipboardCheck className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-yellow-800">
                    有 {pendingReviewExperiments.length} 条实验记录等待审核
                  </p>
                  <p className="text-sm text-yellow-600">
                    请及时审核以确保实验数据的合规性
                  </p>
                </div>
              </div>
              <Button variant="outline" className="border-yellow-300 text-yellow-700 hover:bg-yellow-100">
                去审核
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 最近实验记录 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>最近实验记录</CardTitle>
              <CardDescription>最近更新的实验记录</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentExperiments.length > 0 ? (
            <div className="space-y-4">
              {recentExperiments.map((experiment) => {
                const statusConfig = reviewStatusConfig[experiment.reviewStatus]
                
                return (
                  <div
                    key={experiment.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onViewExperiment(experiment.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{experiment.title}</h4>
                        <Badge className={statusConfig.color}>
                          {statusConfig.icon}
                          <span className="ml-1">{statusConfig.label}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {experiment.summary || '暂无摘要'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      {/* 完整度评分 */}
                      <div className="text-center">
                        <span className={`text-sm font-bold ${getScoreColor(experiment.completenessScore)}`}>
                          {experiment.completenessScore}%
                        </span>
                        <Progress value={experiment.completenessScore} className="w-12 h-1 mt-1" />
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {experiment.author.name}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(experiment.updatedAt)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">暂无实验记录</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                点击下方按钮创建您的第一个实验记录
              </p>
              <Button onClick={onCreateExperiment}>
                <Plus className="w-4 h-4 mr-2" />
                新建实验
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 项目概览 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>项目概览</CardTitle>
              <CardDescription>所有研究项目</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.slice(0, 6).map((project) => (
                <div
                  key={project.id}
                  className="p-4 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onViewProject(project.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium truncate">{project.name}</h4>
                    <Badge variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {project.status === 'ACTIVE' ? '进行中' : 
                       project.status === 'COMPLETED' ? '已完成' : '已归档'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description || '暂无描述'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FolderKanban className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">暂无项目</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
