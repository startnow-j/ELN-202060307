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
import { ReviewList } from '@/components/experiments/ReviewList'
import { UserManagement } from '@/components/users/UserManagement'
import { FileManager } from '@/components/admin/FileManager'
import { MyTasks } from '@/components/tasks/MyTasks'
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog'
import { Toaster } from '@/components/ui/toaster'

function MainContent() {
  const { currentUser, isLoading, projects, experiments } = useApp()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [editingExperimentId, setEditingExperimentId] = useState<string | null>(null)
  const [viewingExperimentId, setViewingExperimentId] = useState<string | null>(null)
  const [viewingProjectId, setViewingProjectId] = useState<string | null>(null)
  const [isCreatingExperiment, setIsCreatingExperiment] = useState(false)
  const [isCreatingProject, setIsCreatingProject] = useState(false)

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
  const handleViewProject = (id: string) => {
    setViewingProjectId(id)
  }

  // 返回列表
  const handleBack = () => {
    setEditingExperimentId(null)
    setViewingExperimentId(null)
    setViewingProjectId(null)
    setIsCreatingExperiment(false)
  }

  // 切换Tab时清除详情状态（允许从详情页直接导航到其他模块）
  const handleTabChange = (tab: string) => {
    // 清除所有详情/编辑状态
    setEditingExperimentId(null)
    setViewingExperimentId(null)
    setViewingProjectId(null)
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
        <ExperimentEditor
          experimentId={editingExperimentId}
          onSave={handleBack}
          onCancel={handleBack}
        />
      )
    }

    // 实验详情
    if (viewingExperimentId) {
      const experiment = experiments.find(e => e.id === viewingExperimentId)
      if (experiment) {
        return (
          <ExperimentDetail
            experiment={experiment}
            onEdit={() => handleEditExperiment(viewingExperimentId)}
            onBack={handleBack}
          />
        )
      }
    }

    // 项目详情
    if (viewingProjectId) {
      const project = projects.find(p => p.id === viewingProjectId)
      if (project) {
        return (
          <ProjectDetail
            project={project}
            experiments={experiments.filter(e => 
              e.projects.some(p => p.id === viewingProjectId)
            )}
            onBack={handleBack}
            onViewExperiment={handleViewExperiment}
          />
        )
      }
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
      case 'review':
        return (
          <ReviewList onViewExperiment={handleViewExperiment} />
        )
      case 'users':
        return <UserManagement />
      case 'files':
        return <FileManager />
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
    <AppProvider>
      <MainContent />
    </AppProvider>
  )
}
