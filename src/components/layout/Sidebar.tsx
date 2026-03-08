'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  LayoutDashboard, 
  FlaskConical, 
  FolderKanban, 
  FileText,
  Menu,
  X,
  LogOut,
  User,
  Users,
  HardDrive,
  ListTodo
} from 'lucide-react'
import { useApp } from '@/contexts/AppContext'

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { currentUser, logout, experiments, projects } = useApp()

  // 计算我的草稿数量
  const myDraftsCount = experiments.filter(
    e => e.reviewStatus === 'DRAFT' && e.authorId === currentUser?.id
  ).length

  // 计算待我审核数量（作为项目负责人的项目中的待审核记录）
  const myProjectsAsLead = projects.filter(p => p.ownerId === currentUser?.id)
  const pendingMyReviewCount = experiments.filter(
    e => {
      if (e.reviewStatus !== 'PENDING_REVIEW') return false
      // 检查是否是用户作为负责人的项目的实验记录
      return e.projects.some(p => myProjectsAsLead.some(mp => mp.id === p.id))
    }
  ).length

  // 计算待我修改数量
  const needsMyRevisionCount = experiments.filter(
    e => e.reviewStatus === 'NEEDS_REVISION' && e.authorId === currentUser?.id
  ).length

  // 我的任务总数量（草稿 + 待审核 + 待修改）
  const totalTasksCount = myDraftsCount + pendingMyReviewCount + needsMyRevisionCount

  // 菜单项
  const menuItems = [
    { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard },
    { id: 'experiments', label: '实验记录', icon: FlaskConical },
    { id: 'projects', label: '项目管理', icon: FolderKanban },
    { id: 'templates', label: '实验模板', icon: FileText },
  ]

  // 用户管理菜单（仅超级管理员和管理员可见）
  const showUserMenu = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN'

  return (
    <div className={cn(
      "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg text-sidebar-foreground">BioLab ELN</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? 'secondary' : 'ghost'}
              className={cn(
                "w-full justify-start gap-3 text-sidebar-foreground",
                activeTab === item.id && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                collapsed && "justify-center px-2"
              )}
              onClick={() => onTabChange(item.id)}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Button>
          ))}

          {/* 我的任务入口 - 统一的任务管理中心（包含审核功能） */}
          <div className="my-2 border-t border-sidebar-border" />
          <Button
            variant={activeTab === 'my-tasks' ? 'secondary' : 'ghost'}
            className={cn(
              "w-full justify-start gap-3 text-sidebar-foreground",
              activeTab === 'my-tasks' && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
              collapsed && "justify-center px-2"
            )}
            onClick={() => onTabChange('my-tasks')}
          >
            <ListTodo className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
              <>
                <span>我的任务</span>
                {totalTasksCount > 0 && (
                  <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-xs">
                    {totalTasksCount}
                  </Badge>
                )}
              </>
            )}
            {collapsed && totalTasksCount > 0 && (
              <div className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            )}
          </Button>

          {/* 用户管理入口 */}
          {showUserMenu && (
            <Button
              key="users"
              variant={activeTab === 'users' ? 'secondary' : 'ghost'}
              className={cn(
                "w-full justify-start gap-3 text-sidebar-foreground",
                activeTab === 'users' && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                collapsed && "justify-center px-2"
              )}
              onClick={() => onTabChange('users')}
            >
              <Users className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>用户管理</span>}
            </Button>
          )}

          {/* 文件管理入口 */}
          {showUserMenu && (
            <Button
              key="files"
              variant={activeTab === 'files' ? 'secondary' : 'ghost'}
              className={cn(
                "w-full justify-start gap-3 text-sidebar-foreground",
                activeTab === 'files' && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                collapsed && "justify-center px-2"
              )}
              onClick={() => onTabChange('files')}
            >
              <HardDrive className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>文件管理</span>}
            </Button>
          )}
        </nav>
      </ScrollArea>

      {/* User Section */}
      <div className="border-t border-sidebar-border p-4">
        {currentUser ? (
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {currentUser.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentUser.role === 'SUPER_ADMIN' ? '超级管理员' : 
                   currentUser.role === 'ADMIN' ? '管理员' : '研究员'}
                </p>
              </div>
            )}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onTabChange('login')}
          >
            {collapsed ? <User className="w-5 h-5" /> : '登录'}
          </Button>
        )}
      </div>
    </div>
  )
}
