'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/contexts/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  UserX, 
  Shield, 
  ShieldCheck,
  Search
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface User {
  id: string
  email: string
  name: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'RESEARCHER'
  avatar: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  experimentCount: number
  ownedProjectCount: number
  memberProjectCount: number
}

export function UserManagement() {
  const { currentUser } = useApp()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'RESEARCHER' as 'SUPER_ADMIN' | 'ADMIN' | 'RESEARCHER'
  })

  // 是否是超级管理员
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'

  // 加载用户列表
  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users/manage')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      } else {
        const error = await res.json()
        toast({
          title: '加载失败',
          description: error.error || '无法加载用户列表',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: '加载失败',
        description: '网络错误',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // 创建用户
  const handleCreate = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast({
        title: '请填写完整信息',
        variant: 'destructive'
      })
      return
    }

    try {
      const res = await fetch('/api/users/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        const newUser = await res.json()
        setUsers(prev => [newUser, ...prev])
        setIsCreateOpen(false)
        setFormData({ name: '', email: '', password: '', role: 'RESEARCHER' })
        toast({
          title: '创建成功',
          description: `用户 ${newUser.name} 已创建`
        })
      } else {
        const error = await res.json()
        toast({
          title: '创建失败',
          description: error.error,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: '创建失败',
        description: '网络错误',
        variant: 'destructive'
      })
    }
  }

  // 更新用户
  const handleUpdate = async () => {
    if (!editingUser || !formData.name) {
      toast({
        title: '请填写完整信息',
        variant: 'destructive'
      })
      return
    }

    try {
      const updateData: {
        name: string
        role?: 'SUPER_ADMIN' | 'ADMIN' | 'RESEARCHER'
        password?: string
      } = { name: formData.name }
      
      if (formData.role) updateData.role = formData.role
      if (formData.password) updateData.password = formData.password

      const res = await fetch(`/api/users/manage/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (res.ok) {
        const updated = await res.json()
        setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u))
        setIsEditOpen(false)
        setEditingUser(null)
        setFormData({ name: '', email: '', password: '', role: 'RESEARCHER' })
        toast({
          title: '更新成功',
          description: `用户 ${updated.name} 已更新`
        })
      } else {
        const error = await res.json()
        toast({
          title: '更新失败',
          description: error.error,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: '更新失败',
        description: '网络错误',
        variant: 'destructive'
      })
    }
  }

  // 禁用用户
  const handleDisable = async (user: User) => {
    if (!confirm(`确定要禁用用户 ${user.name} 吗？`)) return

    try {
      const res = await fetch(`/api/users/manage/${user.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setUsers(prev => prev.map(u => 
          u.id === user.id ? { ...u, isActive: false } : u
        ))
        toast({
          title: '已禁用',
          description: `用户 ${user.name} 已被禁用`
        })
      } else {
        const error = await res.json()
        toast({
          title: '操作失败',
          description: error.error,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: '操作失败',
        description: '网络错误',
        variant: 'destructive'
      })
    }
  }

  // 打开编辑对话框
  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role
    })
    setIsEditOpen(true)
  }

  // 过滤用户
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 角色显示名称
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return '超级管理员'
      case 'ADMIN': return '管理员'
      default: return '研究员'
    }
  }

  // 角色徽章样式
  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-800'
      case 'ADMIN': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-muted-foreground">管理系统用户账户和权限</p>
        </div>
        <Button onClick={() => {
          setFormData({ name: '', email: '', password: '', role: 'RESEARCHER' })
          setIsCreateOpen(true)
        }}>
          <Plus className="w-4 h-4 mr-2" />
          新建用户
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">总用户数</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">超级管理员</CardTitle>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'SUPER_ADMIN').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">管理员</CardTitle>
            <Shield className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'ADMIN').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
            <Users className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索栏 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="搜索用户名或邮箱..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 用户列表 */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户名</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>实验数</TableHead>
              <TableHead>项目数</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge className={getRoleBadgeStyle(user.role)}>
                    {getRoleDisplay(user.role)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? 'default' : 'secondary'}>
                    {user.isActive ? '活跃' : '已禁用'}
                  </Badge>
                </TableCell>
                <TableCell>{user.experimentCount ?? 0}</TableCell>
                <TableCell>{(user.ownedProjectCount ?? 0) + (user.memberProjectCount ?? 0)}</TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(user)}>
                        <Edit className="w-4 h-4 mr-2" />
                        编辑
                      </DropdownMenuItem>
                      {user.isActive && user.id !== currentUser?.id && (
                        <DropdownMenuItem 
                          onClick={() => handleDisable(user)}
                          className="text-destructive"
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          禁用
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 创建用户对话框 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建用户</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">姓名 *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="请输入用户姓名"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">邮箱 *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="请输入邮箱地址"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">密码 *</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="请输入密码"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">角色</label>
              <Select
                value={formData.role}
                onValueChange={(value: 'SUPER_ADMIN' | 'ADMIN' | 'RESEARCHER') => 
                  setFormData(prev => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESEARCHER">研究员</SelectItem>
                  <SelectItem value="ADMIN">管理员</SelectItem>
                  {isSuperAdmin && (
                    <SelectItem value="SUPER_ADMIN">超级管理员</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {!isSuperAdmin && (
                <p className="text-xs text-muted-foreground">
                  只有超级管理员可以创建超级管理员账户
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑用户对话框 */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">姓名 *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="请输入用户姓名"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">邮箱</label>
              <Input
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">邮箱不可修改</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">新密码</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="留空则不修改密码"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">角色</label>
              <Select
                value={formData.role}
                onValueChange={(value: 'SUPER_ADMIN' | 'ADMIN' | 'RESEARCHER') => 
                  setFormData(prev => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RESEARCHER">研究员</SelectItem>
                  <SelectItem value="ADMIN">管理员</SelectItem>
                  {isSuperAdmin && (
                    <SelectItem value="SUPER_ADMIN">超级管理员</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {!isSuperAdmin && editingUser?.role === 'SUPER_ADMIN' && (
                <p className="text-xs text-muted-foreground">
                  只有超级管理员可以修改超级管理员账户
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
