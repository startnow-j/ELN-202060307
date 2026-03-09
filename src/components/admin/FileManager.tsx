'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
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
  Folder,
  File,
  Download,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  HardDrive,
  Users,
  FolderKanban,
  FileText,
  Loader2,
  Search,
  Beaker,
  ExternalLink,
  X,
  AlertTriangle,
  Trash2,
  Archive,
  Package
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ==================== 类型定义 ====================

interface FileNode {
  name: string
  type: 'file' | 'directory'
  size?: number
  sizeFormatted?: string
  modifiedAt?: string
  path: string
  children?: FileNode[]
}

interface ProjectStat {
  id: string
  name: string
  status: string
  size: number
  sizeFormatted: string
  fileCount: number
  experimentCount: number
}

interface UserDraftStat {
  userId: string
  userName: string
  userEmail: string
  size: number
  sizeFormatted: string
  fileCount: number
  draftCount: number
}

interface DraftStats {
  size: number
  sizeFormatted: string
  fileCount: number
  userCount: number
  totalDrafts: number
}

interface FileStats {
  projects: ProjectStat[]
  userDrafts: UserDraftStat[]
  drafts: DraftStats
  summary: {
    totalSize: number
    totalSizeFormatted: string
    totalFiles: number
    projectCount: number
  }
  database: {
    totalAttachments: number
    totalExperiments: number
    totalProjects: number
    draftExperiments: number
  }
}

interface FileTreeData {
  type: string
  name: string
  path: string
  tree: FileNode[]
}

interface SearchResult {
  type: 'project' | 'experiment'
  id: string
  title: string
  projectId?: string
  projectName?: string
  storageLocation?: string
  userId?: string
  userName?: string
  attachmentCount: number
  createdAt: string
  updatedAt: string
}

interface OrphanedFile {
  path: string
  relativePath: string
  size: number
  sizeFormatted: string
  modifiedAt: string
  type: 'attachment_orphan' | 'user_deleted' | 'project_orphan' | 'temp_file'
  suggestion: 'delete' | 'review' | 'keep'
  reason: string
}

interface OrphanedDirectory {
  path: string
  relativePath: string
  type: 'user_deleted' | 'project_orphan' | 'experiment_orphan'
  fileCount: number
  size: number
  sizeFormatted: string
  files: OrphanedFile[]
}

interface OrphanedSummary {
  totalOrphanedFiles: number
  totalSize: number
  totalSizeFormatted: string
  byType: {
    userDeleted: { count: number; fileCount: number; size: number }
    projectOrphan: { count: number; fileCount: number; size: number }
    attachmentOrphan: { count: number; size: number }
  }
}

// 选中的路径
interface SelectedPath {
  path: string
  type: 'file' | 'directory'
}

// ==================== 工具函数 ====================

// 格式化文件大小
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 递归获取节点下所有文件的数量和大小
function getNodeStats(node: FileNode): { fileCount: number; totalSize: number } {
  if (node.type === 'file') {
    return { fileCount: 1, totalSize: node.size || 0 }
  }

  let fileCount = 0
  let totalSize = 0

  if (node.children) {
    for (const child of node.children) {
      const stats = getNodeStats(child)
      fileCount += stats.fileCount
      totalSize += stats.totalSize
    }
  }

  return { fileCount, totalSize }
}

// 递归获取节点下所有文件路径
function getAllNodePaths(node: FileNode): SelectedPath[] {
  if (node.type === 'file') {
    return [{ path: node.path, type: 'file' }]
  }

  const paths: SelectedPath[] = [{ path: node.path, type: 'directory' }]

  if (node.children) {
    for (const child of node.children) {
      paths.push(...getAllNodePaths(child))
    }
  }

  return paths
}

// ==================== 子组件 ====================

// 可选择的文件树节点
function SelectableFileTreeNode({
  node,
  depth = 0,
  selectedPaths,
  onToggleSelect,
  expandedNodes,
  onToggleExpand,
  isSuperAdmin
}: {
  node: FileNode
  depth?: number
  selectedPaths: Map<string, SelectedPath>
  onToggleSelect: (node: FileNode, checked: boolean) => void
  expandedNodes: Set<string>
  onToggleExpand: (path: string) => void
  isSuperAdmin: boolean
}) {
  const isExpanded = expandedNodes.has(node.path)
  const nodeStats = useMemo(() => getNodeStats(node), [node])

  // 计算选中状态
  const selectionState = useMemo(() => {
    if (node.type === 'file') {
      return selectedPaths.has(node.path) ? 'checked' : 'unchecked'
    }

    // 对于目录，检查其下所有文件的选中状态
    const allPaths = getAllNodePaths(node)
    const fileCount = allPaths.filter(p => p.type === 'file').length
    const selectedCount = allPaths.filter(p => p.type === 'file' && selectedPaths.has(p.path)).length

    if (selectedCount === 0) return 'unchecked'
    if (selectedCount === fileCount) return 'checked'
    return 'indeterminate'
  }, [node, selectedPaths])

  const isChecked = selectionState === 'checked'
  const isIndeterminate = selectionState === 'indeterminate'

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleExpand(node.path)
  }

  const handleToggleSelect = (checked: boolean) => {
    onToggleSelect(node, checked)
  }

  if (node.type === 'directory') {
    return (
      <div>
        <div
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 hover:bg-muted/50 rounded",
            depth === 0 && "font-medium bg-muted/30"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {/* 展开/折叠按钮 */}
          <button
            onClick={handleToggleExpand}
            className="p-0.5 hover:bg-muted rounded flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {/* 复选框（仅超级管理员可见） */}
          {isSuperAdmin && (
            <Checkbox
              checked={isChecked}
              indeterminate={isIndeterminate}
              onCheckedChange={handleToggleSelect}
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0"
            />
          )}

          {/* 文件夹图标 */}
          <Folder className="w-4 h-4 text-primary flex-shrink-0" />

          {/* 名称 */}
          <span className="flex-1 truncate">{node.name}</span>

          {/* 文件数量和大小 */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
            <span>{nodeStats.fileCount} 文件</span>
            <span>{formatBytes(nodeStats.totalSize)}</span>
          </div>
        </div>

        {/* 子节点 */}
        {isExpanded && node.children?.map((child, index) => (
          <SelectableFileTreeNode
            key={`${child.path}-${index}`}
            node={child}
            depth={depth + 1}
            selectedPaths={selectedPaths}
            onToggleSelect={onToggleSelect}
            expandedNodes={expandedNodes}
            onToggleExpand={onToggleExpand}
            isSuperAdmin={isSuperAdmin}
          />
        ))}
      </div>
    )
  }

  // 文件节点
  return (
    <div
      className={cn(
        "flex items-center gap-2 py-1.5 px-2 hover:bg-muted/50 rounded",
        selectedPaths.has(node.path) && "bg-primary/5"
      )}
      style={{ paddingLeft: `${depth * 16 + 28}px` }}
    >
      {/* 复选框（仅超级管理员可见） */}
      {isSuperAdmin && (
        <Checkbox
          checked={selectedPaths.has(node.path)}
          onCheckedChange={handleToggleSelect}
          className="flex-shrink-0"
        />
      )}

      {/* 文件图标 */}
      <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />

      {/* 名称 */}
      <span className="flex-1 truncate text-sm">{node.name}</span>

      {/* 文件大小 */}
      {node.sizeFormatted && (
        <span className="text-xs text-muted-foreground flex-shrink-0">{node.sizeFormatted}</span>
      )}
    </div>
  )
}

// 搜索结果项
function SearchResultItem({
  result,
  onClick
}: {
  result: SearchResult
  onClick: () => void
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer border border-transparent hover:border-border"
      onClick={onClick}
    >
      {result.type === 'project' ? (
        <FolderKanban className="w-5 h-5 text-primary flex-shrink-0" />
      ) : (
        <Beaker className="w-5 h-5 text-green-500 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{result.title}</span>
          {result.type === 'experiment' && result.storageLocation === 'draft' && (
            <Badge variant="outline" className="text-xs">暂存</Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {result.type === 'project' ? (
            <span>项目 · {result.attachmentCount} 个实验记录</span>
          ) : (
            <span>
              实验{result.projectName ? ` · ${result.projectName}` : ''}
              {result.userName && ` · ${result.userName}`}
              {' · '}{result.attachmentCount} 个附件
            </span>
          )}
        </div>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </div>
  )
}

// ==================== 主组件 ====================

export function FileManager() {
  // 数据状态
  const [stats, setStats] = useState<FileStats | null>(null)
  const [treeData, setTreeData] = useState<FileTreeData[]>([])
  const [orphanedData, setOrphanedData] = useState<{
    summary: OrphanedSummary
    orphanedFiles: OrphanedFile[]
    orphanedDirectories: OrphanedDirectory[]
  } | null>(null)

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

  const fetchStats = async () => {
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
  }

  const fetchTree = async () => {
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
  }

  const fetchOrphaned = async () => {
    try {
      const response = await fetch('/api/admin/files/orphaned')
      if (response.ok) {
        const data = await response.json()
        setOrphanedData(data)
      }
    } catch (error) {
      console.error('获取孤立文件失败:', error)
    }
  }

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
  }, [])

  // 切换到孤立文件Tab时加载数据
  useEffect(() => {
    if (activeTab === 'orphaned' && !orphanedData) {
      fetchOrphaned()
    }
  }, [activeTab, orphanedData])

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
  const handleBatchDownload = async () => {
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
  }

  // 刷新数据
  const handleRefresh = async () => {
    setLoading(true)
    handleClearSelection()
    await Promise.all([fetchStats(), fetchTree(), fetchOrphaned()])
    setLoading(false)
  }

  // 点击搜索结果
  const handleSearchResultClick = (result: SearchResult) => {
    if (result.type === 'project') {
      window.open(`/projects/${result.id}`, '_blank')
    } else {
      if (result.storageLocation === 'draft') {
        window.open(`/experiments/${result.id}`, '_blank')
      } else if (result.projectId) {
        window.open(`/projects/${result.projectId}/experiments/${result.id}`, '_blank')
      }
    }
  }

  // 清理孤立文件
  const handleCleanupOrphaned = async (type: 'all' | 'user_deleted' | 'project_orphan') => {
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
  }

  // 分类数据
  const projectTreeData = treeData.filter(d => d.type === 'project')
  const draftTreeData = treeData.filter(d => d.type === 'draft')

  // 计算选中文件的总大小
  const selectedStats = useMemo(() => {
    let fileCount = 0
    let totalSize = 0

    // 遍历所有选中的路径，从 treeData 中查找对应的文件大小
    const findNode = (nodes: FileNode[], targetPath: string): FileNode | null => {
      for (const node of nodes) {
        if (node.path === targetPath) return node
        if (node.children) {
          const found = findNode(node.children, targetPath)
          if (found) return found
        }
      }
      return null
    }

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

  return (
    <div className="space-y-6">
      {/* 标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">文件管理</h2>
          <p className="text-muted-foreground">查看存储情况和管理项目文件</p>
        </div>
        <Button onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          刷新
        </Button>
      </div>

      {/* 全局存储统计 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总存储空间</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.summary.totalSizeFormatted}</div>
              <p className="text-xs text-muted-foreground">{stats.summary.totalFiles} 个文件</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">项目数量</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.summary.projectCount}</div>
              <p className="text-xs text-muted-foreground">数据库: {stats.database.totalProjects}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">附件数量</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.database.totalAttachments}</div>
              <p className="text-xs text-muted-foreground">{stats.database.totalExperiments} 个实验</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">暂存实验</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.database.draftExperiments}</div>
              <p className="text-xs text-muted-foreground">{stats.drafts.userCount} 位用户</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 快速查找 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">快速查找</CardTitle>
          <CardDescription>搜索项目或实验记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="输入项目名称或实验标题..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSearchResults([])
                  setShowSearchResults(false)
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}

            {/* 搜索结果下拉 */}
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                {searching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="p-2">
                    <div className="text-xs text-muted-foreground px-2 py-1">
                      找到 {searchResults.length} 个结果
                    </div>
                    {searchResults.map((result) => (
                      <SearchResultItem
                        key={`${result.type}-${result.id}`}
                        result={result}
                        onClick={() => handleSearchResultClick(result)}
                      />
                    ))}
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Search className="w-8 h-8 mb-2 opacity-50" />
                    <p>未找到匹配结果</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tab区域 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>目录浏览</CardTitle>
              <CardDescription>按项目或用户浏览文件目录</CardDescription>
            </div>
            {/* Tab切换 */}
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              <Button
                variant={activeTab === 'projects' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => { setActiveTab('projects'); handleClearSelection(); }}
                className="gap-2"
              >
                <FolderKanban className="w-4 h-4" />
                项目文件
                {stats && stats.projects.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{stats.projects.length}</Badge>
                )}
              </Button>
              <Button
                variant={activeTab === 'drafts' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => { setActiveTab('drafts'); handleClearSelection(); }}
                className="gap-2"
              >
                <Users className="w-4 h-4" />
                用户暂存区
                {stats && stats.drafts.userCount > 0 && (
                  <Badge variant="secondary" className="ml-1">{stats.drafts.userCount}</Badge>
                )}
              </Button>
              {/* 孤立文件Tab仅超级管理员可见 */}
              {isSuperAdmin && (
                <Button
                  variant={activeTab === 'orphaned' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('orphaned')}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  孤立文件
                  {orphanedData && orphanedData.summary.totalOrphanedFiles > 0 && (
                    <Badge variant="destructive" className="ml-1">{orphanedData.summary.totalOrphanedFiles}</Badge>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              {/* 项目文件Tab */}
              {activeTab === 'projects' && (
                <div className="space-y-4">
                  {/* 选择操作栏（仅超级管理员） */}
                  {isSuperAdmin && (
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={handleSelectAll}>
                          全选
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleClearSelection} disabled={selectedPaths.size === 0}>
                          清除选择
                        </Button>
                      </div>
                      {selectedPaths.size > 0 && (
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            已选择 <strong>{selectedStats.fileCount}</strong> 个文件
                            ({selectedStats.formattedSize})
                          </span>
                          <Button size="sm" onClick={handleBatchDownload} disabled={downloading}>
                            {downloading ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Package className="w-4 h-4 mr-1" />
                            )}
                            打包下载
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {projectTreeData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <FolderKanban className="w-12 h-12 mb-3 opacity-50" />
                      <p>暂无项目文件</p>
                      <p className="text-sm">创建项目并上传附件后，文件将显示在这里</p>
                    </div>
                  ) : (
                    projectTreeData.map((item) => {
                      const projectStat = stats?.projects.find(p => p.name === item.name)
                      const isArchived = projectStat?.status === 'ARCHIVED'

                      return (
                        <div key={item.path} className="border rounded-lg overflow-hidden">
                          {/* 项目标题栏 */}
                          <div className={cn(
                            "flex items-center justify-between p-4 border-b",
                            isArchived ? "bg-muted/30" : "bg-muted/50"
                          )}>
                            <div className="flex items-center gap-3">
                              <Folder className={cn("w-5 h-5", isArchived ? "text-muted-foreground" : "text-primary")} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{item.name}</span>
                                  <Badge variant={isArchived ? "secondary" : "outline"} className="text-xs">
                                    {isArchived ? (
                                      <><Archive className="w-3 h-3 mr-1" />已归档</>
                                    ) : (
                                      projectStat?.status || '活跃'
                                    )}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Beaker className="w-3 h-3" />
                                    {projectStat?.experimentCount || 0} 个实验
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    {projectStat?.fileCount || 0} 个文件
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <HardDrive className="w-3 h-3" />
                                    {projectStat?.sizeFormatted || '0 B'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {!isArchived && projectStat && projectStat.fileCount > 0 && (
                              <div className="flex items-center gap-1 text-xs text-amber-500">
                                <AlertTriangle className="w-3 h-3" />
                                <span>活跃项目</span>
                              </div>
                            )}
                          </div>
                          {/* 文件树 */}
                          <div className="p-2">
                            {item.tree.map((node, index) => (
                              <SelectableFileTreeNode
                                key={`${node.path}-${index}`}
                                node={node}
                                selectedPaths={selectedPaths}
                                onToggleSelect={handleToggleSelect}
                                expandedNodes={expandedNodes}
                                onToggleExpand={handleToggleExpand}
                                isSuperAdmin={isSuperAdmin}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* 用户暂存区Tab */}
              {activeTab === 'drafts' && (
                <div className="space-y-4">
                  {/* 选择操作栏（仅超级管理员） */}
                  {isSuperAdmin && (
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={handleSelectAll}>
                          全选
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleClearSelection} disabled={selectedPaths.size === 0}>
                          清除选择
                        </Button>
                      </div>
                      {selectedPaths.size > 0 && (
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            已选择 <strong>{selectedStats.fileCount}</strong> 个文件
                            ({selectedStats.formattedSize})
                          </span>
                          <Button size="sm" onClick={handleBatchDownload} disabled={downloading}>
                            {downloading ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Package className="w-4 h-4 mr-1" />
                            )}
                            打包下载
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {draftTreeData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <Users className="w-12 h-12 mb-3 opacity-50" />
                      <p>暂无暂存文件</p>
                      <p className="text-sm">用户上传但未关联项目的文件将显示在这里</p>
                    </div>
                  ) : (
                    draftTreeData.map((item) => {
                      const userIdMatch = item.path.match(/users\/([^/]+)/)
                      const userId = userIdMatch ? userIdMatch[1] : null
                      const userStat = stats?.userDrafts.find(u => u.userId === userId)

                      return (
                        <div key={item.path} className="border rounded-lg overflow-hidden">
                          {/* 用户标题栏 */}
                          <div className="flex items-center justify-between p-4 bg-muted/50 border-b">
                            <div className="flex items-center gap-3">
                              <Users className="w-5 h-5 text-primary" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{item.name}</span>
                                  <Badge variant="outline" className="text-xs">暂存区</Badge>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Beaker className="w-3 h-3" />
                                    {userStat?.draftCount || 0} 个暂存实验
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    {userStat?.fileCount || 0} 个文件
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <HardDrive className="w-3 h-3" />
                                    {userStat?.sizeFormatted || '0 B'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-amber-500">
                              <AlertTriangle className="w-3 h-3" />
                              <span>用户可能正在编辑</span>
                            </div>
                          </div>
                          {/* 文件树 */}
                          <div className="p-2">
                            {item.tree.map((node, index) => (
                              <SelectableFileTreeNode
                                key={`${node.path}-${index}`}
                                node={node}
                                selectedPaths={selectedPaths}
                                onToggleSelect={handleToggleSelect}
                                expandedNodes={expandedNodes}
                                onToggleExpand={handleToggleExpand}
                                isSuperAdmin={isSuperAdmin}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* 孤立文件Tab */}
              {activeTab === 'orphaned' && (
                <div className="space-y-4">
                  {!orphanedData ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : orphanedData.summary.totalOrphanedFiles === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <Trash2 className="w-12 h-12 mb-3 opacity-50" />
                      <p>未发现孤立文件</p>
                      <p className="text-sm">系统文件与数据库记录一致</p>
                    </div>
                  ) : (
                    <>
                      {/* 孤立文件汇总 */}
                      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-destructive font-medium">
                              <AlertTriangle className="w-5 h-5" />
                              发现 {orphanedData.summary.totalOrphanedFiles} 个孤立文件
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              总大小：{orphanedData.summary.totalSizeFormatted}
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setShowCleanupDialog(true)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            安全清理
                          </Button>
                        </div>

                        {/* 分类统计 */}
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          {orphanedData.summary.byType.userDeleted.count > 0 && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">已删除用户：</span>
                              <span className="font-medium">{orphanedData.summary.byType.userDeleted.count} 个目录</span>
                            </div>
                          )}
                          {orphanedData.summary.byType.projectOrphan.count > 0 && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">孤立项目：</span>
                              <span className="font-medium">{orphanedData.summary.byType.projectOrphan.count} 个目录</span>
                            </div>
                          )}
                          {orphanedData.summary.byType.attachmentOrphan.count > 0 && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">孤立附件：</span>
                              <span className="font-medium">{orphanedData.summary.byType.attachmentOrphan.count} 个文件</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 孤立目录列表 */}
                      {orphanedData.orphanedDirectories.map((dir, dirIndex) => {
                        const isExpanded = expandedOrphanDirs.has(dirIndex)
                        const toggleExpand = () => {
                          setExpandedOrphanDirs(prev => {
                            const newSet = new Set(prev)
                            if (newSet.has(dirIndex)) {
                              newSet.delete(dirIndex)
                            } else {
                              newSet.add(dirIndex)
                            }
                            return newSet
                          })
                        }

                        return (
                          <div key={dirIndex} className="border rounded-lg overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 bg-muted/50 border-b cursor-pointer hover:bg-muted/70"
                              onClick={toggleExpand}
                            >
                              <div className="flex items-center gap-3">
                                <Folder className="w-5 h-5 text-destructive" />
                                <div>
                                  <span className="font-medium">{dir.relativePath}</span>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {dir.fileCount} 个文件 · {dir.sizeFormatted}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {dir.type === 'user_deleted' ? '用户已删除' :
                                   dir.type === 'project_orphan' ? '项目孤立' : '实验孤立'}
                                </Badge>
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>

                            {/* 文件列表（可展开） */}
                            {isExpanded && dir.files && dir.files.length > 0 && (
                              <div className="p-2 bg-muted/20 border-t max-h-60 overflow-y-auto">
                                <div className="text-xs text-muted-foreground mb-2 px-2">
                                  文件列表：
                                </div>
                                <div className="space-y-1">
                                  {dir.files.map((file, fileIndex) => (
                                    <div
                                      key={fileIndex}
                                      className="flex items-center justify-between p-2 bg-background rounded border text-sm"
                                    >
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <span className="truncate" title={file.relativePath.split('/').pop()}>
                                          {file.relativePath.split('/').pop()}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                                        <span>{file.sizeFormatted}</span>
                                        <span>{new Date(file.modifiedAt).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* 孤立文件列表（单独文件，非目录形式） */}
                      {orphanedData.orphanedFiles.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between p-4 bg-muted/50 border-b">
                            <div className="flex items-center gap-3">
                              <File className="w-5 h-5 text-amber-500" />
                              <div>
                                <span className="font-medium">孤立文件（{orphanedData.orphanedFiles.length} 个）</span>
                                <div className="text-xs text-muted-foreground mt-1">
                                  数据库中无记录的单独文件
                                </div>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              附件孤立
                            </Badge>
                          </div>
                          <div className="p-2 bg-muted/20 max-h-60 overflow-y-auto">
                            <div className="space-y-1">
                              {orphanedData.orphanedFiles.map((file, fileIndex) => (
                                <div
                                  key={fileIndex}
                                  className="flex items-center justify-between p-2 bg-background rounded border text-sm"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <span className="truncate" title={file.relativePath.split('/').pop()}>
                                      {file.relativePath.split('/').pop()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                                    <span>{file.sizeFormatted}</span>
                                    <span>{new Date(file.modifiedAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* 孤立文件清理弹窗 */}
      <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              清理孤立文件
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <span className="block">将清理以下类型的孤立文件：</span>
            <ul className="list-disc list-inside space-y-1">
              <li>已删除用户的残留目录</li>
              <li>已删除项目的残留目录</li>
              <li>统一存储目录中的孤立文件</li>
            </ul>
            <span className="block text-amber-500 font-medium">
              此操作不可逆，请确认已备份重要数据。
            </span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleCleanupOrphaned('all')}
              disabled={cleaningUp}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cleaningUp ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1" />
              )}
              确认清理
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
