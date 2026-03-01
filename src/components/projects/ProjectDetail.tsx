'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  ScrollArea,
} from '@/components/ui/scroll-area'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Users,
  Calendar as CalendarIcon,
  FlaskConical,
  FileText,
  Settings,
  Upload,
  Download,
  Trash2,
  Clock,
  CheckCircle,
  Archive,
  Lock,
  Unlock,
  AlertTriangle,
  Loader2,
  Plus,
  MoreVertical,
  Search,
  UserPlus,
  Pencil,
  X,
  Save,
} from 'lucide-react'
import { useApp, Project, Experiment } from '@/contexts/AppContext'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface ProjectDetailProps {
  project: Project
  experiments: Experiment[]
  onBack: () => void
  onViewExperiment?: (id: string) => void
}

// 状态操作类型
type StatusAction = 'complete' | 'reactivate' | 'archive' | 'unarchive'

interface StatusActionInfo {
  action: StatusAction
  label: string
  description: string
  variant: 'default' | 'destructive' | 'outline'
  icon: React.ReactNode
}

// 项目成员类型
interface ProjectMember {
  id: string
  name: string
  email: string
  role: string
  avatar: string | null
  projectRole: string
  joinedAt: string | null
}

// 可选用户类型
interface SelectableUser {
  id: string
  name: string
  email: string
  role: string
  selected: boolean
}

export function ProjectDetail({ project, experiments, onBack, onViewExperiment }: ProjectDetailProps) {
  const { currentUser, refreshData } = useApp()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('info')
  const [availableActions, setAvailableActions] = useState<StatusActionInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 编辑模式状态
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    startDate: '',
    expectedEndDate: '',
    description: ''
  })

  // 状态变更对话框
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<StatusAction | null>(null)

  // 文档上传对话框
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: 'OTHER' as 'PROPOSAL' | 'PROGRESS_REPORT' | 'FINAL_REPORT' | 'OTHER',
    description: ''
  })
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  // 项目文档列表
  const [projectDocuments, setProjectDocuments] = useState<any[]>([])

  // 成员管理状态
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<SelectableUser[]>([])
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('MEMBER')
  const [loadingMembers, setLoadingMembers] = useState(false)

  // 获取可用状态操作
  useEffect(() => {
    const fetchAvailableActions = async () => {
      try {
        const res = await fetch(`/api/projects/${project.id}/status`)
        if (res.ok) {
          const data = await res.json()
          const actions: StatusActionInfo[] = data.availableActions.map((a: any) => {
            const iconMap: Record<string, React.ReactNode> = {
              complete: <CheckCircle className="w-4 h-4" />,
              reactivate: <Unlock className="w-4 h-4" />,
              archive: <Archive className="w-4 h-4" />,
              unarchive: <Unlock className="w-4 h-4" />
            }
            return {
              ...a,
              variant: a.action === 'archive' ? 'destructive' : 'default',
              icon: iconMap[a.action]
            }
          })
          setAvailableActions(actions)
        }
      } catch (error) {
        console.error('Fetch available actions error:', error)
      }
    }
    fetchAvailableActions()
  }, [project.id, project.status])

  // 获取项目文档
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await fetch(`/api/projects/${project.id}/documents`)
        if (res.ok) {
          const data = await res.json()
          setProjectDocuments(data)
        }
      } catch (error) {
        console.error('Fetch documents error:', error)
      }
    }
    if (activeTab === 'documents') {
      fetchDocuments()
    }
  }, [project.id, activeTab])

  // 获取项目成员
  useEffect(() => {
    const fetchMembers = async () => {
      setLoadingMembers(true)
      try {
        const res = await fetch(`/api/projects/${project.id}/members`)
        if (res.ok) {
          const data = await res.json()
          setMembers(data)
        }
      } catch (error) {
        console.error('Fetch members error:', error)
      } finally {
        setLoadingMembers(false)
      }
    }
    if (activeTab === 'members') {
      fetchMembers()
    }
  }, [project.id, activeTab])

  // 获取可添加的用户列表
  useEffect(() => {
    const fetchAvailableUsers = async () => {
      try {
        const res = await fetch('/api/users')
        if (res.ok) {
          const data = await res.json()
          // 过滤掉已经是成员的用户
          const memberIds = members.map(m => m.id)
          const selectableUsers = data
            .filter((u: any) => !memberIds.includes(u.id))
            .map((u: any) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              selected: false
            }))
          setAvailableUsers(selectableUsers)
        }
      } catch (error) {
        console.error('Fetch available users error:', error)
      }
    }
    if (addMemberDialogOpen) {
      fetchAvailableUsers()
    }
  }, [addMemberDialogOpen, members])

  // 初始化编辑表单
  const initEditForm = () => {
    setEditForm({
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
      expectedEndDate: (project.expectedEndDate || project.endDate) ? new Date(project.expectedEndDate || project.endDate!).toISOString().split('T')[0] : '',
      description: project.description || ''
    })
  }

  // 开始编辑
  const handleStartEdit = () => {
    initEditForm()
    setIsEditing(true)
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false)
    initEditForm()
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: editForm.startDate || null,
          expectedEndDate: editForm.expectedEndDate || null,
          description: editForm.description || null
        })
      })

      if (res.ok) {
        toast({ title: '保存成功' })
        setIsEditing(false)
        await refreshData()
      } else {
        const data = await res.json()
        toast({ variant: 'destructive', title: data.error || '保存失败' })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: '保存失败' })
    } finally {
      setIsLoading(false)
    }
  }

  // 状态变更处理
  const handleStatusChange = async () => {
    if (!selectedAction) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: selectedAction })
      })

      if (res.ok) {
        toast({
          title: '状态变更成功',
          description: getActionSuccessMessage(selectedAction)
        })
        await refreshData()
      } else {
        const data = await res.json()
        toast({
          variant: 'destructive',
          title: '操作失败',
          description: data.error
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '服务器错误'
      })
    } finally {
      setIsLoading(false)
      setStatusDialogOpen(false)
      setSelectedAction(null)
    }
  }

  const getActionSuccessMessage = (action: StatusAction) => {
    const messages: Record<StatusAction, string> = {
      complete: '项目已结束，关联实验记录已锁定',
      reactivate: '项目已恢复为进行中状态',
      archive: '项目已归档',
      unarchive: '项目已解除归档'
    }
    return messages[action]
  }

  // 上传文档
  const handleUploadDocument = async () => {
    if (!uploadFile) {
      toast({ variant: 'destructive', title: '请选择文件' })
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('type', uploadForm.type)
      formData.append('description', uploadForm.description)

      const res = await fetch(`/api/projects/${project.id}/documents`, {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        toast({ title: '文档上传成功' })
        setUploadDialogOpen(false)
        setUploadForm({ name: '', type: 'OTHER', description: '' })
        setUploadFile(null)
        // 刷新文档列表
        const docsRes = await fetch(`/api/projects/${project.id}/documents`)
        if (docsRes.ok) {
          setProjectDocuments(await docsRes.json())
        }
      } else {
        const data = await res.json()
        toast({ variant: 'destructive', title: data.error })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: '上传失败' })
    } finally {
      setIsLoading(false)
    }
  }

  // 删除文档
  const handleDeleteDocument = async (docId: string) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/documents/${docId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast({ title: '文档已删除' })
        setProjectDocuments(prev => prev.filter(d => d.id !== docId))
      }
    } catch (error) {
      toast({ variant: 'destructive', title: '删除失败' })
    }
  }

  // 切换用户选择
  const toggleUserSelection = (userId: string) => {
    setAvailableUsers(prev =>
      prev.map(u => u.id === userId ? { ...u, selected: !u.selected } : u)
    )
  }

  // 添加成员
  const handleAddMembers = async () => {
    const selectedUsers = availableUsers.filter(u => u.selected)
    if (selectedUsers.length === 0) {
      toast({ variant: 'destructive', title: '请选择要添加的成员' })
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUsers.map(u => u.id),
          role: selectedRole
        })
      })

      if (res.ok) {
        toast({ title: '成员添加成功' })
        setAddMemberDialogOpen(false)
        setUserSearchTerm('')
        setSelectedRole('MEMBER')
        // 刷新成员列表
        const membersRes = await fetch(`/api/projects/${project.id}/members`)
        if (membersRes.ok) {
          setMembers(await membersRes.json())
        }
      } else {
        const data = await res.json()
        toast({ variant: 'destructive', title: data.error })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: '添加失败' })
    } finally {
      setIsLoading(false)
    }
  }

  // 移除成员
  const handleRemoveMember = async (userId: string) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/members/${userId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast({ title: '成员已移除' })
        setMembers(prev => prev.filter(m => m.id !== userId))
      } else {
        const data = await res.json()
        toast({ variant: 'destructive', title: data.error })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: '移除失败' })
    }
  }

  // 更新成员角色
  const handleUpdateMemberRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/members/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      if (res.ok) {
        toast({ title: '角色已更新' })
        setMembers(prev => prev.map(m =>
          m.id === userId ? { ...m, projectRole: newRole } : m
        ))
      } else {
        const data = await res.json()
        toast({ variant: 'destructive', title: data.error })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: '更新失败' })
    }
  }

  // 状态徽章
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      ACTIVE: { label: '进行中', className: 'bg-green-100 text-green-700' },
      COMPLETED: { label: '已结束', className: 'bg-blue-100 text-blue-700' },
      ARCHIVED: { label: '已归档', className: 'bg-gray-100 text-gray-700' },
    }
    const config = statusMap[status] || { label: status, className: 'bg-secondary' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  // 权限检查
  const isProjectOwner = project.ownerId === currentUser?.id
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN'
  const canManage = isProjectOwner || isAdmin
  const canEdit = canManage && project.status === 'ACTIVE'

  // 审核状态徽章
  const getReviewStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      DRAFT: { label: '草稿', className: 'bg-gray-100 text-gray-700' },
      PENDING_REVIEW: { label: '待审核', className: 'bg-yellow-100 text-yellow-700' },
      NEEDS_REVISION: { label: '需修改', className: 'bg-orange-100 text-orange-700' },
      LOCKED: { label: '已锁定', className: 'bg-green-100 text-green-700' },
    }
    const config = statusMap[status] || { label: status, className: 'bg-secondary' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  // 项目角色标签
  const getProjectRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      PROJECT_LEAD: { label: '负责人', variant: 'default' },
      MEMBER: { label: '参与人', variant: 'secondary' },
      VIEWER: { label: '观察员', variant: 'outline' },
    }
    const config = roleMap[role] || { label: role, variant: 'secondary' }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // 过滤用户列表
  const filteredUsers = availableUsers.filter(u =>
    u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  )

  // 选中的用户数量
  const selectedCount = availableUsers.filter(u => u.selected).length

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
        {canManage && availableActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" />
                状态操作
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {availableActions.map((action) => (
                <DropdownMenuItem
                  key={action.action}
                  onClick={() => {
                    setSelectedAction(action.action)
                    setStatusDialogOpen(true)
                  }}
                  className={action.variant === 'destructive' ? 'text-destructive' : ''}
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="info" className="gap-2">
              <FileText className="w-4 h-4" />
              项目信息
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="w-4 h-4" />
              人员管理
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="w-4 h-4" />
              项目文档
            </TabsTrigger>
            <TabsTrigger value="experiments" className="gap-2">
              <FlaskConical className="w-4 h-4" />
              实验记录
            </TabsTrigger>
          </TabsList>

          {/* 项目信息Tab */}
          <TabsContent value="info">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>项目基本信息</CardTitle>
                {canEdit && !isEditing && (
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleStartEdit}>
                    <Pencil className="w-4 h-4" />
                    编辑信息
                  </Button>
                )}
                {isEditing && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleCancelEdit}>
                      <X className="w-4 h-4" />
                      取消
                    </Button>
                    <Button size="sm" className="gap-2" onClick={handleSaveEdit} disabled={isLoading}>
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
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">项目负责人</p>
                    <p className="font-medium">{project.members?.find(m => m.id === project.ownerId)?.name || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">成员数量</p>
                    <p className="font-medium">{members.length || project.members?.length || 0} 人</p>
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
                        onChange={(e) => setEditForm(prev => ({ ...prev, startDate: e.target.value }))}
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
                        onChange={(e) => setEditForm(prev => ({ ...prev, expectedEndDate: e.target.value }))}
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
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
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
          </TabsContent>

          {/* 人员管理Tab */}
          <TabsContent value="members">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>项目成员 ({members.length})</CardTitle>
                {canManage && project.status === 'ACTIVE' && (
                  <Button size="sm" className="gap-2" onClick={() => setAddMemberDialogOpen(true)}>
                    <UserPlus className="w-4 h-4" />
                    添加成员
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {loadingMembers ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">加载中...</p>
                  </div>
                ) : members.length > 0 ? (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getProjectRoleBadge(member.projectRole)}
                          {canManage && member.id !== project.ownerId && project.status === 'ACTIVE' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, 'PROJECT_LEAD')}>
                                  设为负责人
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, 'MEMBER')}>
                                  设为参与人
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, 'VIEWER')}>
                                  设为观察员
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="text-destructive"
                                >
                                  移除成员
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">暂无成员</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 项目文档Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>项目文档</CardTitle>
                {canManage && project.status === 'ACTIVE' && (
                  <Button size="sm" className="gap-2" onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="w-4 h-4" />
                    上传文档
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {projectDocuments.length > 0 ? (
                  <div className="space-y-3">
                    {projectDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {doc.type === 'PROPOSAL' ? '立项报告' :
                               doc.type === 'PROGRESS_REPORT' ? '进展报告' :
                               doc.type === 'FINAL_REPORT' ? '结题报告' : '其他文档'}
                              {' · '}{(doc.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`/api/projects/${project.id}/documents/${doc.id}`, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          {canManage && project.status === 'ACTIVE' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteDocument(doc.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">暂无项目文档</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 实验记录Tab */}
          <TabsContent value="experiments">
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
          </TabsContent>
        </Tabs>
      </div>

      {/* 状态变更确认对话框 */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {selectedAction === 'archive' && <AlertTriangle className="w-5 h-5 text-destructive" />}
              确认操作
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAction && availableActions.find(a => a.action === selectedAction)?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusChange}
              disabled={isLoading}
              className={selectedAction === 'archive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 上传文档对话框 */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上传项目文档</DialogTitle>
            <DialogDescription>
              上传项目相关文档
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>选择文件</Label>
              <Input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="space-y-2">
              <Label>文档类型</Label>
              <Select value={uploadForm.type} onValueChange={(v: any) => setUploadForm(prev => ({ ...prev, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROPOSAL">立项报告</SelectItem>
                  <SelectItem value="PROGRESS_REPORT">进展报告</SelectItem>
                  <SelectItem value="FINAL_REPORT">结题报告</SelectItem>
                  <SelectItem value="OTHER">其他文档</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="文档描述（可选）"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>取消</Button>
            <Button onClick={handleUploadDocument} disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加成员对话框 */}
      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>添加项目成员</DialogTitle>
            <DialogDescription>
              选择要添加到项目的用户
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户..."
                className="pl-10"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
              />
            </div>

            {/* 角色选择 */}
            <div className="space-y-2">
              <Label>分配角色</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROJECT_LEAD">项目负责人</SelectItem>
                  <SelectItem value="MEMBER">参与人</SelectItem>
                  <SelectItem value="VIEWER">观察员</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 用户列表 */}
            <div className="border rounded-lg">
              <ScrollArea className="h-64">
                {filteredUsers.length > 0 ? (
                  <div className="p-2 space-y-1">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => toggleUserSelection(user.id)}
                      >
                        <Checkbox
                          checked={user.selected}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {user.role === 'SUPER_ADMIN' ? '超管' :
                           user.role === 'ADMIN' ? '管理员' : '研究员'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {userSearchTerm ? '未找到匹配用户' : '暂无可添加的用户'}
                  </div>
                )}
              </ScrollArea>
            </div>

            {selectedCount > 0 && (
              <p className="text-sm text-muted-foreground">
                已选择 {selectedCount} 个用户
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberDialogOpen(false)}>取消</Button>
            <Button onClick={handleAddMembers} disabled={isLoading || selectedCount === 0}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              添加 ({selectedCount})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
