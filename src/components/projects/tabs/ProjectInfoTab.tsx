'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Users,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  Loader2,
  Pencil,
  X,
  Save,
} from 'lucide-react'
import { Project } from '@/contexts/AppContext'
import { getStatusBadge, formatDate } from '../utils'
import { EditForm } from '../types'

interface ProjectInfoTabProps {
  project: Project
  membersCount: number
  isEditing: boolean
  isLoading: boolean
  canEdit: boolean
  editForm: EditForm
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onEditFormChange: (form: EditForm) => void
}

export function ProjectInfoTab({
  project,
  membersCount,
  isEditing,
  isLoading,
  canEdit,
  editForm,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditFormChange,
}: ProjectInfoTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>项目基本信息</CardTitle>
        {canEdit && !isEditing && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onStartEdit}>
            <Pencil className="w-4 h-4" />
            编辑信息
          </Button>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={onCancelEdit}>
              <X className="w-4 h-4" />
              取消
            </Button>
            <Button size="sm" className="gap-2" onClick={onSaveEdit} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              保存
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">项目状态</p>
            <p className="font-medium">{getStatusBadge(project.status)}</p>
          </div>
          {/* 项目主负责人 - 可编辑 */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> 项目主负责人
            </p>
            {isEditing ? (
              <Input
                type="text"
                value={editForm.primaryLeader}
                onChange={(e) => onEditFormChange({ ...editForm, primaryLeader: e.target.value })}
                placeholder="输入主负责人姓名"
                className="w-full"
              />
            ) : (
              <p className="font-medium">{(project as any).primaryLeader || '-'}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">成员数量</p>
            <p className="font-medium">{membersCount || project.members?.length || 0} 人</p>
          </div>

          {/* 开始日期 - 可编辑 */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" /> 开始日期
            </p>
            {isEditing ? (
              <Input
                type="date"
                value={editForm.startDate}
                onChange={(e) => onEditFormChange({ ...editForm, startDate: e.target.value })}
                className="w-full"
              />
            ) : (
              <p className="font-medium">{formatDate(project.startDate)}</p>
            )}
          </div>

          {/* 预计结束日期 - 可编辑 */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> 预计结束
            </p>
            {isEditing ? (
              <Input
                type="date"
                value={editForm.expectedEndDate}
                onChange={(e) => onEditFormChange({ ...editForm, expectedEndDate: e.target.value })}
                className="w-full"
              />
            ) : (
              <p className="font-medium">{formatDate(project.expectedEndDate || project.endDate)}</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> 实际结束
            </p>
            <p className="font-medium">{formatDate(project.actualEndDate)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">创建时间</p>
            <p className="font-medium">{formatDate(project.createdAt)}</p>
          </div>
          {project.completedAt && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">结束时间</p>
              <p className="font-medium">{formatDate(project.completedAt)}</p>
            </div>
          )}
          {project.archivedAt && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">归档时间</p>
              <p className="font-medium">{formatDate(project.archivedAt)}</p>
            </div>
          )}
        </div>

        {/* 项目描述 - 可编辑 */}
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-2">项目描述</p>
          {isEditing ? (
            <Textarea
              value={editForm.description}
              onChange={(e) => onEditFormChange({ ...editForm, description: e.target.value })}
              placeholder="输入项目描述..."
              rows={4}
              className="resize-none"
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap">
              {project.description || '暂无描述'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
