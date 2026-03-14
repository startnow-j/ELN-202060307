/**
 * FileManager 组件类型定义
 */

// 文件节点
export interface FileNode {
  name: string
  type: 'file' | 'directory'
  size?: number
  sizeFormatted?: string
  modifiedAt?: string
  path: string
  children?: FileNode[]
}

// 项目统计
export interface ProjectStat {
  id: string
  name: string
  status: string
  size: number
  sizeFormatted: string
  fileCount: number
  experimentCount: number
}

// 用户暂存统计
export interface UserDraftStat {
  userId: string
  userName: string
  userEmail: string
  size: number
  sizeFormatted: string
  fileCount: number
  draftCount: number
}

// 暂存统计
export interface DraftStats {
  size: number
  sizeFormatted: string
  fileCount: number
  userCount: number
  totalDrafts: number
}

// 文件统计
export interface FileStats {
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
  currentUserRole?: string
}

// 文件树数据
export interface FileTreeData {
  type: string
  name: string
  path: string
  tree: FileNode[]
}

// 搜索结果
export interface SearchResult {
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

// 孤立文件
export interface OrphanedFile {
  path: string
  relativePath: string
  size: number
  sizeFormatted: string
  modifiedAt: string
  type: 'attachment_orphan' | 'user_deleted' | 'project_orphan' | 'temp_file'
  suggestion: 'delete' | 'review' | 'keep'
  reason: string
}

// 孤立目录
export interface OrphanedDirectory {
  path: string
  relativePath: string
  type: 'user_deleted' | 'project_orphan' | 'experiment_orphan'
  fileCount: number
  size: number
  sizeFormatted: string
  files: OrphanedFile[]
}

// 孤立文件汇总
export interface OrphanedSummary {
  totalOrphanedFiles: number
  totalSize: number
  totalSizeFormatted: string
  byType: {
    userDeleted: { count: number; fileCount: number; size: number }
    projectOrphan: { count: number; fileCount: number; size: number }
    attachmentOrphan: { count: number; size: number }
  }
}

// 孤立文件数据
export interface OrphanedData {
  summary: OrphanedSummary
  orphanedFiles: OrphanedFile[]
  orphanedDirectories: OrphanedDirectory[]
}

// 选中的路径
export interface SelectedPath {
  path: string
  type: 'file' | 'directory'
}

// 选中文件统计
export interface SelectedStats {
  fileCount: number
  totalSize: number
  formattedSize: string
}
