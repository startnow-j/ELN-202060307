'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, Calendar, CalendarClock } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void  // 创建成功回调
}

export function CreateProjectDialog({ open, onOpenChange, onSuccess }: CreateProjectDialogProps) {
  const { createProject, refreshData } = useApp()
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    primaryLeader: '',
    startDate: '',
    expectedEndDate: ''  // 改为预计结束日期
  })

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      alert('请输入项目名称')
      return
    }

    setIsLoading(true)
    const project = await createProject({
      name: form.name,
      description: form.description || null,
      primaryLeader: form.primaryLeader || null,
      startDate: form.startDate || null,
      expectedEndDate: form.expectedEndDate || null  // 使用预计结束日期
    })
    setIsLoading(false)

    if (project) {
      setForm({ name: '', description: '', primaryLeader: '', startDate: '', expectedEndDate: '' })
      onOpenChange(false)
      refreshData()  // 刷新 AppContext 数据
      onSuccess?.()  // 调用成功回调
    } else {
      alert('创建失败，请重试')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新建项目</DialogTitle>
          <DialogDescription>
            创建一个新的研究项目
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">项目名称 *</Label>
            <Input
              id="project-name"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="输入项目名称"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">项目描述</Label>
            <Textarea
              id="project-description"
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="描述项目的目标和内容"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-leader">项目主负责人</Label>
            <Input
              id="project-leader"
              value={form.primaryLeader}
              onChange={(e) => setForm(prev => ({ ...prev, primaryLeader: e.target.value }))}
              placeholder="输入项目主负责人姓名"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project-start" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                开始日期
              </Label>
              <Input
                id="project-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-expected-end" className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4" />
                预计结束日期
              </Label>
              <Input
                id="project-expected-end"
                type="date"
                value={form.expectedEndDate}
                onChange={(e) => setForm(prev => ({ ...prev, expectedEndDate: e.target.value }))}
                min={form.startDate || undefined}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            💡 提示：预计结束日期为计划时间，实际结束时间将在项目状态变更为「已结束」时自动记录。
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            创建项目
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
