'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { FlaskConical, Clock, FolderOpen, Lock } from 'lucide-react'
import { Experiment, ReviewStatus } from '@/contexts/AppContext'

interface ExperimentCardProps {
  experiment: Experiment
  reviewStatusConfig: Record<ReviewStatus, { label: string; color: string; icon?: React.ReactNode }>
  onAction?: () => void
  actionLabel?: string
  actionIcon?: React.ReactNode
  actionVariant?: 'default' | 'outline' | 'destructive'
  secondaryAction?: {
    label: string
    icon: React.ReactNode
    onClick: () => void
    variant?: 'default' | 'outline' | 'destructive'
    disabled?: boolean
  }
  tertiaryAction?: {
    label: string
    icon: React.ReactNode
    onClick: () => void
    variant?: 'default' | 'outline' | 'destructive'
  }
  formatDate: (date: string) => string
  getScoreColor: (score: number) => string
  showAuthor?: boolean
  authorLabel?: string
  timeLabel?: string
  timeValue?: string
  warningMessage?: React.ReactNode
  borderColor?: string
}

export function ExperimentCard({
  experiment,
  reviewStatusConfig,
  onAction,
  actionLabel,
  actionIcon,
  actionVariant = 'default',
  secondaryAction,
  tertiaryAction,
  formatDate,
  getScoreColor,
  showAuthor = false,
  authorLabel,
  timeLabel = '提交于',
  timeValue,
  warningMessage,
  borderColor,
}: ExperimentCardProps) {
  const displayTime = timeValue || experiment.submittedAt || experiment.updatedAt

  return (
    <Card className={`hover:border-primary/40 transition-colors ${borderColor || ''}`}>
      <CardContent className="p-6">
        {/* 警告消息 */}
        {warningMessage}

        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <FlaskConical className="w-5 h-5 text-primary flex-shrink-0" />
              <h3 className="font-semibold text-lg truncate">{experiment.title}</h3>
              <Badge className={reviewStatusConfig[experiment.reviewStatus].color}>
                {reviewStatusConfig[experiment.reviewStatus].icon}
                {reviewStatusConfig[experiment.reviewStatus].label && (
                  <span className="ml-1">{reviewStatusConfig[experiment.reviewStatus].label}</span>
                )}
              </Badge>
            </div>

            <p className="text-muted-foreground line-clamp-2 mb-3">
              {experiment.summary || '暂无摘要'}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {showAuthor && (
                <span>{authorLabel || '作者'}: {experiment.author.name}</span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {timeLabel} {formatDate(displayTime)}
              </span>
              {experiment.projects.length > 0 && (
                <span className="flex items-center gap-1">
                  <FolderOpen className="w-4 h-4" />
                  {experiment.projects.map(p => p.name).join(', ')}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 ml-4">
            {/* 完整度评分 */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">完整度</span>
              <span className={`text-lg font-bold ${getScoreColor(experiment.completenessScore)}`}>
                {experiment.completenessScore}%
              </span>
              <Progress value={experiment.completenessScore} className="w-16 h-1.5" />
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col gap-2">
              {onAction && actionLabel && (
                <Button
                  size="sm"
                  variant={actionVariant}
                  onClick={onAction}
                >
                  {actionIcon}
                  {actionLabel}
                </Button>
              )}
              {secondaryAction && (
                <Button
                  size="sm"
                  variant={secondaryAction.variant || 'outline'}
                  onClick={secondaryAction.onClick}
                  disabled={secondaryAction.disabled}
                >
                  {secondaryAction.icon}
                  {secondaryAction.label}
                </Button>
              )}
              {tertiaryAction && (
                <Button
                  size="sm"
                  variant={tertiaryAction.variant || 'outline'}
                  onClick={tertiaryAction.onClick}
                >
                  {tertiaryAction.icon}
                  {tertiaryAction.label}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
