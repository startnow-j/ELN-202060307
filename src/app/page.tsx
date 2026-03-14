'use client'

import { useState } from 'react'
import { AppProvider, useApp } from '@/contexts/AppContext'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { LoginPage } from '@/components/auth/LoginPage'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { ExperimentList } from '@/components/experiments/ExperimentList'
import { ProjectList } from '@/components/projects/ProjectList'
import { ExperimentEditor } from '@/components/experiments/ExperimentEditor'
import { ProjectDetail } from '@/components/projects/ProjectDetail'
import { ExperimentDetail } from '@/components/experiments/ExperimentDetail'
import { TemplateList } from '@/components/templates/TemplateList'
// ReviewList 已废弃，功能已合并到 MyTasks 组件
// import { ReviewList } from '@/components/experiments/ReviewList'
import { UserManagement } from '@/components/users/UserManagement'
import { FileManager } from '@/components/admin/FileManager'
import { AIConfigManager } from '@/components/admin/AIConfigManager'
import { MyTasks } from '@/components/tasks/MyTasks'
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog'
import { Toaster } from '@/components/ui/toaster'
import { Button } from '@/components/ui/button'
import { ErrorBoundary, PartialErrorBoundary } from '@/components/common/ErrorBoundary'

function MainContent() {
  const { currentUser, isLoading, projects, experiments } = useApp()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [editingExperimentId, setEditingExperimentId] = useState<string | null>(null)
  const [viewingExperimentId, setViewingExperimentId] = useState<string | null>(null)
  const [viewingProjectId, setViewingProjectId] = useState<string | null>(null)
  const [isCreatingExperiment, setIsCreatingExperiment] = useState(false)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  
  // 单独获取的项目详情（用于ARCHIVED等不在列表中的项目）
  const [fetchedProject, setFetchedProject] = useState<any | null>(null)
  const [isLoadingProject, setIsLoadingProject] = useState(false)

  // 加载中状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  // 未登录显示登录页面
  if (!currentUser) {
    return <LoginPage />
  }

  // 创建实验
  const handleCreateExperiment = () => {
    setEditingExperimentId(null)
    setIsCreatingExperiment(true)
    setActiveTab('experiments')
  }

  // 查看实验详情
  const handleViewExperiment = (id: string) => {
    setViewingExperimentId(id)
    setEditingExperimentId(null)
    setIsCreatingExperiment(false)
  }

  // 编辑实验
  const handleEditExperiment = (id: string) => {
    setEditingExperimentId(id)
    setViewingExperimentId(null)
    setIsCreatingExperiment(false)
  }

  // 创建项目
  const handleCreateProject = () => {
    setIsCreatingProject(true)
  }

  // 查看项目详情
  const handleViewProject = async (id: string) => {
    setViewingProjectId(id)
    setFetchedProject(null)
    
    // 如果项目不在列表中，单独获取
    const projectInList = projects.find(p => p.id === id)
    if (!projectInList) {
      setIsLoadingProject(true)
      try {
        const res = await fetch(`/api/projects/${id}`)
        if (res.ok) {
          const data = await res.json()
          setFetchedProject(data)
        }
      } catch (error) {
        console.error('Failed to fetch project:', error)
      } finally {
        setIsLoadingProject(false)
      }
    }
  }

  // 返回列表
  const handleBack = () => {
    setEditingExperimentId(null)
    setViewingExperimentId(null)
    setViewingProjectId(null)
    setFetchedProject(null)
    setIsCreatingExperiment(false)
  }

  // 切换Tab时清除详情状态（允许从详情页直接导航到其他模块）
  const handleTabChange = (tab: string) => {
    // 清除所有详情/编辑状态
    setEditingExperimentId(null)
    setViewingExperimentId(null)
    setViewingProjectId(null)
    setFetchedProject(null)
    setIsCreatingExperiment(false)
    setIsCreatingProject(false)
    // 切换Tab
    setActiveTab(tab)
  }

  // 渲染内容
  const renderContent = () => {
    // 实验编辑器
    if (isCreatingExperiment || editingExperimentId) {
      return (
        <PartialErrorBoundary onRetry={handleBack}>
          <ExperimentEditor
            experimentId={editingExperimentId}
            onSave={handleBack}
            onCancel={handleBack}
          />
        </PartialErrorBoundary>
      )
    }

    // 实验详情
    if (viewingExperimentId) {
      const experiment = experiments.find(e => e.id === viewingExperimentId)
      if (experiment) {
        return (
          <PartialErrorBoundary onRetry={handleBack}>
            <ExperimentDetail
              experiment={experiment}
              onEdit={() => handleEditExperiment(viewingExperimentId)}
              onBack={handleBack}
            />
          </PartialErrorBoundary>
        )
      }
    }

    // 项目详情
    if (viewingProjectId) {
      // 优先使用列表中的项目
      const project = projects.find(p => p.id === viewingProjectId) || fetchedProject
      
      if (isLoadingProject) {
        return (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-muted-foreground">加载项目详情...</p>
            </div>
          </div>
        )
      }
      
      if (project) {
        return (
          <PartialErrorBoundary onRetry={handleBack}>
            <ProjectDetail
              project={project}
              experiments={experiments.filter(e => 
                e.projects.some(p => p.id === viewingProjectId)
              )}
              onBack={handleBack}
              onViewExperiment={handleViewExperiment}
            />
          </PartialErrorBoundary>
        )
      }
      
      // 项目不存在或无权访问
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">项目不存在或您没有访问权限</p>
            <Button onClick={handleBack}>返回列表</Button>
          </div>
        </div>
      )
    }

    // 主要标签页
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            onCreateExperiment={handleCreateExperiment}
            onViewExperiment={handleViewExperiment}
            onViewProject={handleViewProject}
          />
        )
      case 'experiments':
        return (
          <ExperimentList
            onCreateExperiment={handleCreateExperiment}
            onViewExperiment={handleViewExperiment}
          />
        )
      case 'projects':
        return (
          <ProjectList
            onCreateProject={handleCreateProject}
            onViewProject={handleViewProject}
          />
        )
      case 'templates':
        return <TemplateList />
      case 'my-tasks':
        return (
          <MyTasks 
            onViewExperiment={handleViewExperiment}
            onEditExperiment={handleEditExperiment}
          />
        )
      // 'review' 分支已移除，审核功能统一到 'my-tasks'
      // case 'review':
      //   return (
      //     <ReviewList onViewExperiment={handleViewExperiment} />
      //   )
      case 'users':
        return <UserManagement />
      case 'files':
        return <FileManager />
      case 'ai-config':
        return <AIConfigManager />
      default:
        return null
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onCreateExperiment={handleCreateExperiment} />
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
      
      {/* 创建项目对话框 */}
      <CreateProjectDialog 
        open={isCreatingProject} 
        onOpenChange={setIsCreatingProject} 
      />
      
      <Toaster />
    </div>
  )
}

export default function Home() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainContent />
      </AppProvider>
    </ErrorBoundary>
  )
}

// rebuild 1773290868
