'use client'

import { useMemo } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FileNode, SelectedPath } from './types'
import { formatBytes, getNodeStats, getAllNodePaths } from './utils'

interface SelectableFileTreeNodeProps {
  node: FileNode
  depth?: number
  selectedPaths: Map<string, SelectedPath>
  onToggleSelect: (node: FileNode, checked: boolean) => void
  expandedNodes: Set<string>
  onToggleExpand: (path: string) => void
  isSuperAdmin: boolean
}

/**
 * 可选择的文件树节点组件
 */
export function SelectableFileTreeNode({
  node,
  depth = 0,
  selectedPaths,
  onToggleSelect,
  expandedNodes,
  onToggleExpand,
  isSuperAdmin
}: SelectableFileTreeNodeProps) {
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
