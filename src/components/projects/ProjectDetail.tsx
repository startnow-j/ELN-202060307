'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  Users,
  FlaskConical,
  FileText,
  Settings,
  CheckCircle,
  Archive,
  Unlock,
  History,
} from 'lucide-react'
import { useApp, Project, Experiment } from '@/contexts/AppContext'
import { useToast } from '@/hooks/use-toast'

// 导入拆分的组件
import {
  ProjectInfoTab,
  ProjectMembersTab,
  ProjectDocumentsTab,
  ProjectExperimentsTab,
  ProjectHistoryTab,
} from './tabs'
import {
  StatusChangeDialog,
  UploadDocumentDialog,
  AddMemberDialog,
} from './dialogs'

// 导入类型和工具函数
import {
  StatusAction,
  StatusActionInfo,
  StatusActionFromAPI,
  ProjectMember,
  SelectableUser,
  UserFromAPI,
  ProjectDocument,
  EditForm,
  UploadForm,
} from './types'
import { getStatusBadge } from './utils'

interface ProjectDetailProps {
  project: Project
  experiments: Experiment[]
  onBack: () => void
  onViewExperiment?: (id: string) => void
}

export function ProjectDetail({ project, experiments, onBack, onViewExperiment }: ProjectDetailProps) {
  const { currentUser, refreshData } = useApp()
  const { toast } = useToast()
  
  // Tab 状态
  const [activeTab, setActiveTab] = useState('info')
  
  // 全局加载状态
  const [isLoading, setIsLoading] = useState(false)

  // 状态操作相关
  const [availableActions, setAvailableActions] = useState<StatusActionInfo[]>([])
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<StatusAction | null>(null)

  // 编辑模式状态
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({
    startDate: '',
    expectedEndDate: '',
    description: '',
    primaryLeader: ''
  })

  // 文档相关状态
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadForm, setUploadForm] = useState<UploadForm>({
    name: '',
    type: 'OTHER',
    description: ''
  })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([])

  // 成员管理状态
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<SelectableUser[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [lastRefreshedTab, setLastRefreshedTab] = useState<string | null>(null)

  // 权限检查
  const isProjectOwner = project.ownerId === currentUser?.id
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN'
  const canManage = isProjectOwner || isAdmin
  const canEdit = canManage && project.status === 'ACTIVE'

  // 获取可用状态操作
  useEffect(() => {
    const fetchAvailableActions = async () => {
      try {
        const res = await fetch(`/api/projects/${project.id}/status`)
        if (res.ok) {
          const data = await res.json()
          const actions: StatusActionInfo[] = data.availableActions.map((a: StatusActionFromAPI) => {
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
    fetchMembers()
  }, [project.id])

  // 切换到人员管理 Tab 时刷新成员列表
  useEffect(() => {
    const refreshMembers = async () => {
      if (activeTab === 'members' && lastRefreshedTab !== 'members') {
        try {
          const res = await fetch(`/api/projects/${project.id}/members`)
          if (res.ok) {
            const data = await res.json()
            setMembers(data)
            setLastRefreshedTab('members')
          }
        } catch (error) {
          console.error('Refresh members error:', error)
        }
      } else if (activeTab !== 'members') {
        setLastRefreshedTab(null)
      }
    }
    refreshMembers()
  }, [activeTab, project.id, lastRefreshedTab])

  // 获取可添加的用户列表
  useEffect(() => {
    const fetchAvailableUsers = async () => {
      try {
        const res = await fetch('/api/users')
        if (res.ok) {
          const data = await res.json()
          const memberIds = members.map(m => m.id)
          const selectableUsers = data
            .filter((u: UserFromAPI) => !memberIds.includes(u.id))
            .map((u: UserFromAPI) => ({
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
      description: project.description || '',
      primaryLeader: (project as any).primaryLeader || ''
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
          description: editForm.description || null,
          primaryLeader: editForm.primaryLeader || null
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
  const handleAddMembers = async (userIds: string[], role: string) => {
    if (userIds.length === 0) {
      toast({ variant: 'destructive', title: '请选择要添加的成员' })
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds,
          role
        })
      })

      if (res.ok) {
        toast({ title: '成员添加成功' })
        setAddMemberDialogOpen(false)
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
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              操作历史
            </TabsTrigger>
          </TabsList>

          {/* 项目信息Tab */}
          <TabsContent value="info">
            <ProjectInfoTab
              project={project}
              membersCount={members.length}
              isEditing={isEditing}
              isLoading={isLoading}
              canEdit={canEdit}
              editForm={editForm}
              onStartEdit={handleStartEdit}
              onCancelEdit={handleCancelEdit}
              onSaveEdit={handleSaveEdit}
              onEditFormChange={setEditForm}
            />
          </TabsContent>

          {/* 人员管理Tab */}
          <TabsContent value="members">
            <ProjectMembersTab
              members={members}
              loadingMembers={loadingMembers}
              canManage={canManage}
              projectStatus={project.status}
              projectOwnerId={project.ownerId}
              onAddMember={() => setAddMemberDialogOpen(true)}
              onUpdateMemberRole={handleUpdateMemberRole}
              onRemoveMember={handleRemoveMember}
            />
          </TabsContent>

          {/* 项目文档Tab */}
          <TabsContent value="documents">
            <ProjectDocumentsTab
              projectId={project.id}
              documents={projectDocuments}
              canManage={canManage}
              projectStatus={project.status}
              onUpload={() => setUploadDialogOpen(true)}
              onDelete={handleDeleteDocument}
            />
          </TabsContent>

          {/* 实验记录Tab */}
          <TabsContent value="experiments">
            <ProjectExperimentsTab
              projectStatus={project.status}
              experiments={experiments}
              onViewExperiment={onViewExperiment}
            />
          </TabsContent>

          {/* 操作历史Tab */}
          <TabsContent value="history">
            <ProjectHistoryTab projectId={project.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* 状态变更确认对话框 */}
      <StatusChangeDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        selectedAction={selectedAction}
        availableActions={availableActions}
        isLoading={isLoading}
        onConfirm={handleStatusChange}
      />

      {/* 上传文档对话框 */}
      <UploadDocumentDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        uploadForm={uploadForm}
        uploadFile={uploadFile}
        isLoading={isLoading}
        onFormChange={setUploadForm}
        onFileChange={setUploadFile}
        onUpload={handleUploadDocument}
      />

      {/* 添加成员对话框 */}
      <AddMemberDialog
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
        availableUsers={availableUsers}
        isLoading={isLoading}
        onToggleUser={toggleUserSelection}
        onAddMembers={handleAddMembers}
      />
    </div>
  )
}
