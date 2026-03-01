'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users, Calendar, FlaskConical } from 'lucide-react'
import { useApp, Project, Experiment } from '@/contexts/AppContext'

interface ProjectDetailProps {
  project: Project
  experiments: Experiment[]
  onBack: () => void
  onViewExperiment?: (id: string) => void
}

export function ProjectDetail({ project, experiments, onBack, onViewExperiment }: ProjectDetailProps) {
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      ACTIVE: { label: '进行中', variant: 'default' },
      COMPLETED: { label: '已完成', variant: 'outline' },
      ARCHIVED: { label: '已归档', variant: 'secondary' },
    }
    const config = statusMap[status] || { label: status, variant: 'secondary' }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="border-b border-border bg-background px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{project.name}</h1>
              {getStatusBadge(project.status)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              项目详情
            </p>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 项目信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">项目信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">成员:</span>
                  <span className="font-medium">{project.members?.length || 0} 人</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">开始:</span>
                  <span>{formatDate(project.startDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">结束:</span>
                  <span>{formatDate(project.endDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">实验:</span>
                  <span className="font-medium">{experiments.length} 个</span>
                </div>
              </div>
              
              {project.description && (
                <div className="pt-4 border-t">
                  <p className="text-muted-foreground">{project.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 关联的实验记录 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">关联实验记录</CardTitle>
            </CardHeader>
            <CardContent>
              {experiments.length > 0 ? (
                <div className="space-y-3">
                  {experiments.map((experiment) => (
                    <div
                      key={experiment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/40 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => onViewExperiment?.(experiment.id)}
                    >
                      <div className="flex items-center gap-3">
                        <FlaskConical className="w-5 h-5 text-primary" />
                        <div>
                          <h4 className="font-medium">{experiment.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {experiment.author.name} · {formatDate(experiment.updatedAt)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={
                        experiment.reviewStatus === 'DRAFT' ? 'secondary' :
                        experiment.reviewStatus === 'PENDING_REVIEW' ? 'default' :
                        experiment.reviewStatus === 'NEEDS_REVISION' ? 'outline' : 'default'
                      }>
                        {experiment.reviewStatus === 'DRAFT' ? '草稿' :
                         experiment.reviewStatus === 'PENDING_REVIEW' ? '待审核' :
                         experiment.reviewStatus === 'NEEDS_REVISION' ? '需修改' : '已锁定'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FlaskConical className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">暂无关联的实验记录</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
