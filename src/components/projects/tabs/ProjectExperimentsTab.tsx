'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FlaskConical,
  Lock,
} from 'lucide-react'
import { Experiment } from '@/contexts/AppContext'
import { getReviewStatusBadge, formatDate } from '../utils'

interface ProjectExperimentsTabProps {
  projectStatus: string
  experiments: Experiment[]
  onViewExperiment?: (id: string) => void
}

export function ProjectExperimentsTab({
  projectStatus,
  experiments,
  onViewExperiment,
}: ProjectExperimentsTabProps) {
  return (
    <>
      {/* 项目状态提示 */}
      {(projectStatus === 'COMPLETED' || projectStatus === 'ARCHIVED') && (
        <div className={`mb-4 p-4 rounded-lg border ${
          projectStatus === 'ARCHIVED' 
            ? 'bg-gray-50 border-gray-200 text-gray-700' 
            : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span className="font-medium">
              {projectStatus === 'ARCHIVED' ? '项目已归档' : '项目已结束'}
            </span>
          </div>
          <p className="text-sm mt-1 opacity-90">
            {projectStatus === 'ARCHIVED' 
              ? '归档项目的实验记录不可编辑、删除或提交审核' 
              : '已结束项目的实验记录不可编辑、删除或提交审核'}
          </p>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>关联实验记录 ({experiments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {experiments.length > 0 ? (
            <div className="space-y-3">
              {experiments.map((experiment) => (
                <div
                  key={experiment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/40 cursor-pointer transition-colors"
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
                  {getReviewStatusBadge(experiment.reviewStatus)}
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
    </>
  )
}
