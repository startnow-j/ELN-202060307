'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  FileStats,
  FileTreeData,
  FileNode,
  OrphanedData,
  SearchResult,
  SelectedPath,
  SelectedStats
} from './types'
import { formatBytes, getAllNodePaths, findNode } from './utils'

/**
 * FileManager 数据管理和业务逻辑 Hook
 */
export function useFileManager() {
  // 数据状态
  const [stats, setStats] = useState<FileStats | null>(null)
  const [treeData, setTreeData] = useState<FileTreeData[]>([])
  const [orphanedData, setOrphanedData] = useState<OrphanedData | null>(null)

  // 用户角色状态
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN'

  // UI状态
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [activeTab, setActiveTab] = useState<'projects' | 'drafts' | 'orphaned'>('projects')

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  // 文件选择状态
  const [selectedPaths, setSelectedPaths] = useState<Map<string, SelectedPath>>(new Map())
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  // 孤立文件清理弹窗
  const [showCleanupDialog, setShowCleanupDialog] = useState(false)
  const [cleaningUp, setCleaningUp] = useState(false)

  // 孤立目录展开状态
  const [expandedOrphanDirs, setExpandedOrphanDirs] = useState<Set<number>>(new Set())

  // ==================== 数据获取 ====================

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/files/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
        if (data.currentUserRole) {
          setCurrentUserRole(data.currentUserRole)
        }
      }
    } catch (error) {
      console.error('获取存储统计失败:', error)
    }
  }, [])

  const fetchTree = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/files/tree?type=all&depth=4')
      if (response.ok) {
        const data = await response.json()
        setTreeData(data.data)

        // 默认展开前两层
        const defaultExpanded = new Set<string>()
        const expandNodes = (nodes: FileNode[], depth: number) => {
          if (depth >= 2) return
          for (const node of nodes) {
            if (node.type === 'directory') {
              defaultExpanded.add(node.path)
              if (node.children) {
                expandNodes(node.children, depth + 1)
              }
            }
          }
        }
        for (const item of data.data) {
          expandNodes(item.tree, 0)
        }
        setExpandedNodes(defaultExpanded)
      }
    } catch (error) {
      console.error('获取目录树失败:', error)
    }
  }, [])

  const fetchOrphaned = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/files/orphaned')
      if (response.ok) {
        const data = await response.json()
        setOrphanedData(data)
      }
    } catch (error) {
      console.error('获取孤立文件失败:', error)
    }
  }, [])

  // 搜索功能
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setSearching(true)
    setShowSearchResults(true)
    try {
      const response = await fetch(`/api/admin/files/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.results || [])
      }
    } catch (error) {
      console.error('搜索失败:', error)
    } finally {
      setSearching(false)
    }
  }, [])

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  // 初始化
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchStats(), fetchTree()])
      setLoading(false)
    }
    init()
  }, [fetchStats, fetchTree])

  // 切换到孤立文件Tab时加载数据
  useEffect(() => {
    if (activeTab === 'orphaned' && !orphanedData) {
      fetchOrphaned()
    }
  }, [activeTab, orphanedData, fetchOrphaned])

  // ==================== 选择操作 ====================

  // 切换节点展开
  const handleToggleExpand = useCallback((path: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }, [])

  // 切换节点选择
  const handleToggleSelect = useCallback((node: FileNode, checked: boolean) => {
    setSelectedPaths(prev => {
      const newMap = new Map(prev)

      if (node.type === 'file') {
        // 文件：直接添加或删除
        if (checked) {
          newMap.set(node.path, { path: node.path, type: 'file' })
        } else {
          newMap.delete(node.path)
        }
      } else {
        // 目录：添加或删除所有子文件
        const allPaths = getAllNodePaths(node)
        for (const p of allPaths) {
          if (p.type === 'file') {
            if (checked) {
              newMap.set(p.path, p)
            } else {
              newMap.delete(p.path)
            }
          }
        }
      }

      return newMap
    })
  }, [])

  // 全选当前Tab
  const handleSelectAll = useCallback(() => {
    const currentTree = activeTab === 'projects'
      ? treeData.filter(d => d.type === 'project')
      : treeData.filter(d => d.type === 'draft')

    const allPaths: SelectedPath[] = []
    for (const item of currentTree) {
      for (const node of item.tree) {
        allPaths.push(...getAllNodePaths(node).filter(p => p.type === 'file'))
      }
    }

    setSelectedPaths(prev => {
      const newMap = new Map(prev)
      for (const p of allPaths) {
        newMap.set(p.path, p)
      }
      return newMap
    })
  }, [activeTab, treeData])

  // 清除选择
  const handleClearSelection = useCallback(() => {
    setSelectedPaths(new Map())
  }, [])

  // ==================== 下载操作 ====================

  // 批量下载选中的文件
  const handleBatchDownload = useCallback(async () => {
    if (selectedPaths.size === 0) return

    setDownloading(true)
    try {
      // 将选中的文件路径按目录分组，优化下载
      const paths: SelectedPath[] = Array.from(selectedPaths.values())

      // 按父目录分组，找出顶层目录
      const topLevelPaths: SelectedPath[] = []
      const sortedPaths = [...paths].sort((a, b) => a.path.length - b.path.length)

      for (const p of sortedPaths) {
        // 检查是否已有父目录被选中
        const hasParent = topLevelPaths.some(existing =>
          p.path.startsWith(existing.path + '/') || p.path.startsWith(existing.path + '\\')
        )
        if (!hasParent) {
          topLevelPaths.push(p)
        }
      }

      const response = await fetch('/api/admin/files/batch-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paths: topLevelPaths,
          downloadName: `selected_files_${new Date().toISOString().slice(0, 10)}`
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '下载失败')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `selected_files_${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // 清除选择
      handleClearSelection()
    } catch (error) {
      console.error('下载失败:', error)
      alert(error instanceof Error ? error.message : '下载失败')
    } finally {
      setDownloading(false)
    }
  }, [selectedPaths, handleClearSelection])

  // 刷新数据
  const handleRefresh = useCallback(async () => {
    setLoading(true)
    handleClearSelection()
    await Promise.all([fetchStats(), fetchTree(), fetchOrphaned()])
    setLoading(false)
  }, [fetchStats, fetchTree, fetchOrphaned, handleClearSelection])

  // 点击搜索结果
  const handleSearchResultClick = useCallback((result: SearchResult) => {
    if (result.type === 'project') {
      window.open(`/projects/${result.id}`, '_blank')
    } else {
      if (result.storageLocation === 'draft') {
        window.open(`/experiments/${result.id}`, '_blank')
      } else if (result.projectId) {
        window.open(`/projects/${result.projectId}/experiments/${result.id}`, '_blank')
      }
    }
  }, [])

  // 清理孤立文件
  const handleCleanupOrphaned = useCallback(async (type: 'all' | 'user_deleted' | 'project_orphan') => {
    setCleaningUp(true)
    try {
      const response = await fetch('/api/admin/files/orphaned', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`清理完成：删除 ${data.deletedCount} 个文件/目录`)
        await fetchOrphaned()
      } else {
        alert('清理失败')
      }
    } catch (error) {
      console.error('清理失败:', error)
      alert('清理失败')
    } finally {
      setCleaningUp(false)
      setShowCleanupDialog(false)
    }
  }, [fetchOrphaned])

  // 分类数据
  const projectTreeData = treeData.filter(d => d.type === 'project')
  const draftTreeData = treeData.filter(d => d.type === 'draft')

  // 计算选中文件的总大小
  const selectedStats: SelectedStats = useMemo(() => {
    let fileCount = 0
    let totalSize = 0

    for (const [path] of selectedPaths) {
      for (const item of treeData) {
        const node = findNode(item.tree, path)
        if (node) {
          fileCount++
          totalSize += node.size || 0
          break
        }
      }
    }

    return { fileCount, totalSize, formattedSize: formatBytes(totalSize) }
  }, [selectedPaths, treeData])

  // 清空搜索
  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setShowSearchResults(false)
  }, [])

  // 切换孤立目录展开
  const toggleOrphanDir = useCallback((dirIndex: number) => {
    setExpandedOrphanDirs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(dirIndex)) {
        newSet.delete(dirIndex)
      } else {
        newSet.add(dirIndex)
      }
      return newSet
    })
  }, [])

  return {
    // 数据状态
    stats,
    treeData,
    orphanedData,
    projectTreeData,
    draftTreeData,
    
    // 用户角色
    currentUserRole,
    isSuperAdmin,
    
    // UI状态
    loading,
    downloading,
    activeTab,
    setActiveTab,
    
    // 搜索
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    showSearchResults,
    clearSearch,
    handleSearchResultClick,
    
    // 文件选择
    selectedPaths,
    selectedStats,
    expandedNodes,
    handleToggleExpand,
    handleToggleSelect,
    handleSelectAll,
    handleClearSelection,
    
    // 下载
    handleBatchDownload,
    handleRefresh,
    
    // 孤立文件
    showCleanupDialog,
    setShowCleanupDialog,
    cleaningUp,
    expandedOrphanDirs,
    toggleOrphanDir,
    handleCleanupOrphaned,
  }
}
