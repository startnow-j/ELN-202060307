'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  X,
  AlertTriangle,
  Trash2,
  Archive,
  Package
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFileManager } from './file-manager/useFileManager'
import { SelectableFileTreeNode } from './file-manager/SelectableFileTreeNode'
import { SearchResultItem } from './file-manager/SearchResultItem'

/**
 * 文件管理主组件
 */
export function FileManager() {
  const {
    // 数据状态
    stats,
    orphanedData,
    projectTreeData,
    draftTreeData,
    
    // 用户角色
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
  } = useFileManager()

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
                onClick={clearSearch}
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

                        return (
                          <div key={dirIndex} className="border rounded-lg overflow-hidden">
                            <div
                              className="flex items-center justify-between p-4 bg-muted/50 border-b cursor-pointer hover:bg-muted/70"
                              onClick={() => toggleOrphanDir(dirIndex)}
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
          <AlertDialogDescription asChild>
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
          </AlertDialogDescription>
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
