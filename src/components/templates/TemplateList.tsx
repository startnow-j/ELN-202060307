'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { 
  Plus, 
  Search, 
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useAuth,
} from '@/hooks/api'
import type { Template } from '@/hooks/api'

export function TemplateList() {
  const { data: templates = [], isLoading } = useTemplates()
  const createMutation = useCreateTemplate()
  const updateMutation = useUpdateTemplate()
  const deleteMutation = useDeleteTemplate()
  const { data: currentUser } = useAuth()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  
  // 表单状态
  const [form, setForm] = useState({
    name: '',
    description: '',
    content: '',
    tags: '',
    isPublic: false
  })

  // 过滤模板
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    // 只显示公开模板或自己创建的模板
    const hasAccess = template.isPublic || template.creatorId === currentUser?.id
    return matchesSearch && hasAccess
  })

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('请输入模板名称')
      return
    }

    const data = {
      name: form.name,
      description: form.description || null,
      content: form.content,
      tags: form.tags || null,
      isPublic: form.isPublic
    }

    if (editingTemplate) {
      await updateMutation.mutateAsync({ id: editingTemplate.id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
    setIsCreateOpen(false)
    resetForm()
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个模板吗？')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      content: '',
      tags: '',
      isPublic: false
    })
    setEditingTemplate(null)
  }

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template)
    setForm({
      name: template.name,
      description: template.description || '',
      content: template.content,
      tags: template.tags || '',
      isPublic: template.isPublic
    })
    setIsCreateOpen(true)
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">实验模板</h1>
          <p className="text-muted-foreground mt-1">
            管理实验记录模板，快速创建标准化实验
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          新建模板
        </Button>
      </div>

      {/* 搜索 */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索模板..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 模板列表 */}
      {filteredTemplates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="group hover:border-primary/40 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold truncate">{template.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {template.isPublic && (
                      <Badge variant="outline" className="text-xs">公开</Badge>
                    )}
                    {template.creatorId === currentUser?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(template)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(template.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                  {template.description || '暂无描述'}
                </p>

                {template.tags && (
                  <div className="flex flex-wrap gap-1">
                    {template.tags.split(',').map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag.trim()}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                  创建者: {template.creator?.name || '未知'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? '未找到匹配的模板' : '暂无模板'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? '尝试调整搜索条件'
                  : '点击下方按钮创建您的第一个实验模板'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  新建模板
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 创建/编辑对话框 */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? '编辑模板' : '新建模板'}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? '修改模板信息' : '创建一个新的实验模板'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">模板名称 *</Label>
                <Input
                  id="template-name"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入模板名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-tags">标签分类</Label>
                <Input
                  id="template-tags"
                  value={form.tags}
                  onChange={(e) => setForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="多个标签用逗号分隔"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">模板描述</Label>
              <Textarea
                id="template-description"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="描述模板的用途"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>模板内容</Label>
              <RichTextEditor
                content={form.content}
                onChange={(content) => setForm(prev => ({ ...prev, content }))}
                placeholder="输入模板内容，可包含实验步骤、材料清单等...&#10;&#10;支持富文本格式、图片上传、表格等功能。"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="template-public"
                checked={form.isPublic}
                onChange={(e) => setForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                className="rounded border-input"
              />
              <Label htmlFor="template-public" className="cursor-pointer">
                设为公开模板（所有用户可见）
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm() }}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingTemplate ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
