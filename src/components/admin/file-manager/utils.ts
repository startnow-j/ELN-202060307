/**
 * FileManager 工具函数
 */

import type { FileNode, SelectedPath } from './types'

/**
 * 格式化文件大小
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 递归获取节点下所有文件的数量和大小
 */
export function getNodeStats(node: FileNode): { fileCount: number; totalSize: number } {
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

/**
 * 递归获取节点下所有文件路径
 */
export function getAllNodePaths(node: FileNode): SelectedPath[] {
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

/**
 * 从节点树中查找指定路径的节点
 */
export function findNode(nodes: FileNode[], targetPath: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === targetPath) return node
    if (node.children) {
      const found = findNode(node.children, targetPath)
      if (found) return found
    }
  }
  return null
}
