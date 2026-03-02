'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Search,
  FolderKanban,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
  Loader2,
  ChevronDown,
  Globe,
  User,
  Star,
  UserPlus,
} from 'lucide-react'
import { useApp, Project } from '@/contexts/AppContext'

// 视角类型
type ViewMode = 'default' | 'global'

// 视角配置
const viewModeConfig: Record<ViewMode, { label: string; description: string; icon: React.ReactNode }> = {
  default: { label: '普通视角', description: '显示我创建和参与的项目', icon: <User className="w-4 h-4" /> },
  global: { label: '全局视角', description: '显示所有项目（管理员）', icon: <Globe className="w-4 h-4" /> },
}

// 带关系标记的项目类型
interface ProjectWithRelation extends Project {
  _relation?: 'CREATED' | 'JOINED' | 'GLOBAL'
}

interface ProjectListProps {
  onCreateProject: () => void
  onViewProject: (id: string) => void
}

export function ProjectList({ onCreateProject, onViewProject }: ProjectListProps) {
  const { currentUser, projects: contextProjects } = useApp()
  const [projects, setProjects] = useState<ProjectWithRelation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  // 管理员默认使用全局视角，普通用户使用普通视角
  const [viewMode, setViewMode] = useState<ViewMode>('default')
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: 'ACTIVE' as Project['status']
  })
  const prevProjectsLengthRef = useRef(0)  // 用于检测项目数量变化

  // 是否是管理员
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN'

  // 根据用户角色自动设置默认视角
  useEffect(() => {
    if (isAdmin && viewMode === 'default') {
      setViewMode('global')
    }
  }, [isAdmin])

  // 加载项目
  const loadProjects = useCallback(async (mode: ViewMode) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/projects?viewMode=${mode}`)
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Load projects error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 初始加载
  useEffect(() => {
    loadProjects(viewMode)
  }, [viewMode, loadProjects])

  // 当 AppContext 的 projects 数量变化时刷新（创建/删除项目后）
  useEffect(() => {
    // 首次加载时 prevProjectsLengthRef.current 为 0，跳过
    if (prevProjectsLengthRef.current === 0) {
      prevProjectsLengthRef.current = contextProjects.length
      return
    }
    // 后续变化时刷新
    if (contextProjects.length !== prevProjectsLengthRef.current) {
      prevProjectsLengthRef.current = contextProjects.length
      loadProjects(viewMode)
    }
  }, [contextProjects.length, loadProjects, viewMode])

  // 过滤项目
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // 更新项目
  const handleUpdateProject = async () => {
    if (!editProject) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/projects/${editProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        setEditProject(null)
        loadProjects(viewMode)
      }
    } catch (error) {
      console.error('Update project error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // 删除项目
  const handleDelete = async () => {
    if (!deleteProjectId) return
    try {
      const res = await fetch(`/api/projects/${deleteProjectId}`, { method: 'DELETE' })
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== deleteProjectId))
      }
    } catch (error) {
      console.error('Delete project error:', error)
    } finally {
      setDeleteProjectId(null)
    }
  }

  const handleEdit = (project: Project) => {
    setEditProject(project)
    setEditForm({
      name: project.name,
      description: project.description || '',
      status: project.status
    })
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      ACTIVE: { label: '进行中', className: 'bg-green-100 text-green-700' },
      COMPLETED: { label: '已完成', className: 'bg-blue-100 text-blue-700' },
      ARCHIVED: { label: '已归档', className: 'bg-gray-100 text-gray-700' },
    }
    const config = statusMap[status] || { label: status, className: 'bg-secondary' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getRelationBadge = (relation?: 'CREATED' | 'JOINED' | 'GLOBAL') => {
    if (!relation || relation === 'GLOBAL') return null
    if (relation === 'CREATED') {
      return (
        <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
          <Star className="w-3 h-3" />
          我创建
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-xs gap-1">
        <UserPlus className="w-3 h-3" />
        我参与
      </Badge>
    )
  }

  const canManageProject = (project: Project) => {
    return currentUser?.role === 'ADMIN' ||
           currentUser?.role === 'SUPER_ADMIN' ||
           project.ownerId === currentUser?.id
  }

  // 渲染项目卡片
  const renderProjectCard = (project: ProjectWithRelation) => (
    <Card
      key={project.id}
      className="hover:border-primary/40 cursor-pointer transition-colors group"
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2" onClick={() => onViewProject(project.id)}>
            <FolderKanban className="w-5 h-5 text-primary" />
            <h3 className="font-semibold truncate">{project.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(project.status)}
            {getRelationBadge(project._relation)}
            {canManageProject(project) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(project)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    编辑
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteProjectId(project.id)}
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

        <p className="text-muted-foreground text-sm line-clamp-2 mb-4" onClick={() => onViewProject(project.id)}>
          {project.description || '暂无描述'}
        </p>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{project.memberCount || project.members?.length || 0} 成员</span>
          </div>
          <span>
            创建于 {new Date(project.createdAt).toLocaleDateString('zh-CN')}
          </span>
        </div>
      </CardContent>
    </Card>
  )

  // 渲染项目分组
  const renderProjectGroups = () => {
    // 全局视角或普通视角都直接显示项目列表
    if (filteredProjects.length === 0) {
      return null
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map(renderProjectCard)}
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">项目管理</h1>
          <p className="text-muted-foreground mt-1">
            管理研究项目和团队成员
          </p>
        </div>
        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
          <Button onClick={onCreateProject} className="gap-2">
            <Plus className="w-4 h-4" />
            新建项目
          </Button>
        )}
      </div>

      {/* 搜索、筛选和视角切换 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索项目..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="ACTIVE">进行中</SelectItem>
                <SelectItem value="COMPLETED">已完成</SelectItem>
                <SelectItem value="ARCHIVED">已归档</SelectItem>
              </SelectContent>
            </Select>

            {/* 视角切换（仅管理员可见） */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 w-full sm:w-auto">
                    {viewModeConfig[viewMode].icon}
                    {viewModeConfig[viewMode].label}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>切换视角</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.entries(viewModeConfig).map(([mode, config]) => (
                    <DropdownMenuItem
                      key={mode}
                      onClick={() => setViewMode(mode as ViewMode)}
                      className={viewMode === mode ? 'bg-muted' : ''}
                    >
                      <div className="flex items-center gap-2">
                        {config.icon}
                        <div>
                          <p className="font-medium">{config.label}</p>
                          <p className="text-xs text-muted-foreground">{config.description}</p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 项目列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredProjects.length > 0 ? (
        renderProjectGroups()
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm || statusFilter !== 'all' ? '未找到匹配的项目' : '暂无项目'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? '尝试调整搜索条件'
                  : (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN')
                    ? '点击下方按钮创建您的第一个项目'
                    : '等待管理员创建项目'}
              </p>
              {!searchTerm && statusFilter === 'all' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
                <Button onClick={onCreateProject}>
                  <Plus className="w-4 h-4 mr-2" />
                  新建项目
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 编辑对话框 */}
      <Dialog open={!!editProject} onOpenChange={() => setEditProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑项目</DialogTitle>
            <DialogDescription>
              修改项目信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">项目名称</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">项目描述</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">状态</Label>
              <Select
                value={editForm.status}
                onValueChange={(value: Project['status']) => setEditForm(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">进行中</SelectItem>
                  <SelectItem value="COMPLETED">已完成</SelectItem>
                  <SelectItem value="ARCHIVED">已归档</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProject(null)}>取消</Button>
            <Button onClick={handleUpdateProject} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个项目吗？此操作无法撤销，项目下的实验记录关联将被移除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
