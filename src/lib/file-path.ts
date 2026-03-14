// BioLab ELN - 文件路径工具函数
// v3.3 支持暂存区和项目存储区

import fs from 'fs'
import path from 'path'

// ==================== 类型定义 ====================

export type StorageLocation = 'draft' | 'project'

export interface FilePathResult {
  fullPath: string      // 文件系统完整路径
  relativePath: string  // 数据库存储的相对路径
  directory: string     // 文件所在目录
}

// ==================== 常量 ====================

const UPLOAD_ROOT = 'upload'
const DRAFTS_DIR = 'users'
const PROJECTS_DIR = 'projects'
const EXPERIMENTS_DIR = 'experiments'

// ==================== 工具函数 ====================

/**
 * 清理文件名，移除不安全字符
 */
function sanitizeName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')  // 移除不允许的字符
    .replace(/\s+/g, '_')           // 空格替换为下划线
    .slice(0, 100)                  // 限制长度
}

/**
 * 获取日期前缀 (YYYYMMDD)
 */
function getDatePrefix(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * 获取唯一文件名（处理冲突）
 */
function getUniqueFilename(dir: string, filename: string): string {
  let finalName = filename
  let counter = 1
  
  while (fs.existsSync(path.join(dir, finalName))) {
    const ext = path.extname(filename)
    const baseName = path.basename(filename, ext)
    finalName = `${baseName}_${counter}${ext}`
    counter++
  }
  
  return finalName
}

/**
 * 确保目录存在
 */
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

// ==================== 暂存区路径 ====================

/**
 * 获取用户暂存区目录
 * 格式: upload/users/{用户ID}/drafts/
 */
export function getUserDraftsDir(userId: string): string {
  return path.join(process.cwd(), UPLOAD_ROOT, DRAFTS_DIR, userId, 'drafts')
}

/**
 * 获取暂存实验目录
 * 格式: upload/users/{用户ID}/drafts/{日期}_{实验标题}/
 */
export function getDraftExperimentDir(userId: string, experimentTitle: string): string {
  const draftsDir = getUserDraftsDir(userId)
  const datePrefix = getDatePrefix()
  const safeTitle = sanitizeName(experimentTitle)
  const dirName = `${datePrefix}_${safeTitle}`
  
  return path.join(draftsDir, dirName)
}

/**
 * 生成暂存区文件路径
 * 用于上传附件时生成保存路径
 */
export function generateDraftFilePath(
  userId: string,
  experimentTitle: string,
  originalFilename: string
): FilePathResult {
  const experimentDir = getDraftExperimentDir(userId, experimentTitle)
  ensureDirectoryExists(experimentDir)
  
  const uniqueFilename = getUniqueFilename(experimentDir, originalFilename)
  const fullPath = path.join(experimentDir, uniqueFilename)
  
  // 相对路径: users/{userId}/drafts/{date}_{title}/{filename}
  const relativePath = path.join(
    DRAFTS_DIR,
    userId,
    'drafts',
    path.basename(experimentDir),
    uniqueFilename
  ).replace(/\\/g, '/')
  
  return {
    fullPath,
    relativePath,
    directory: experimentDir
  }
}

// ==================== 项目区路径 ====================

/**
 * 获取项目实验目录
 * 格式: upload/projects/{项目名称}/experiments/{日期}_{实验标题}/
 */
export function getProjectExperimentDir(projectName: string, experimentTitle: string): string {
  const datePrefix = getDatePrefix()
  const safeProjectName = sanitizeName(projectName)
  const safeTitle = sanitizeName(experimentTitle)
  const dirName = `${datePrefix}_${safeTitle}`
  
  return path.join(
    process.cwd(),
    UPLOAD_ROOT,
    PROJECTS_DIR,
    safeProjectName,
    EXPERIMENTS_DIR,
    dirName
  )
}

/**
 * 生成项目区文件路径
 * 用于上传附件时生成保存路径
 */
export function generateProjectFilePath(
  projectName: string,
  experimentTitle: string,
  originalFilename: string
): FilePathResult {
  const experimentDir = getProjectExperimentDir(projectName, experimentTitle)
  ensureDirectoryExists(experimentDir)
  
  const uniqueFilename = getUniqueFilename(experimentDir, originalFilename)
  const fullPath = path.join(experimentDir, uniqueFilename)
  
  // 相对路径: projects/{projectName}/experiments/{date}_{title}/{filename}
  const relativePath = path.join(
    PROJECTS_DIR,
    sanitizeName(projectName),
    EXPERIMENTS_DIR,
    path.basename(experimentDir),
    uniqueFilename
  ).replace(/\\/g, '/')
  
  return {
    fullPath,
    relativePath,
    directory: experimentDir
  }
}

/**
 * 创建 .link 引用文件内容
 */
export function createLinkFileContent(
  experimentId: string,
  experimentTitle: string,
  primaryProjectId: string,
  primaryProjectName: string,
  primaryPath: string,
  linkedBy: string
): string {
  return JSON.stringify({
    type: 'cross_project_reference',
    experimentId,
    title: experimentTitle,
    primaryStorage: {
      projectId: primaryProjectId,
      projectName: primaryProjectName,
      path: primaryPath
    },
    linkedAt: new Date().toISOString(),
    linkedBy
  }, null, 2)
}

// ==================== 辅助函数 ====================

/**
 * 从相对路径解析存储位置
 */
export function parseStorageLocation(relativePath: string): {
  location: StorageLocation
  userId?: string
  projectName?: string
} {
  const normalized = relativePath.replace(/\\/g, '/')
  
  if (normalized.includes(`/${DRAFTS_DIR}/`)) {
    // 暂存区路径
    const match = normalized.match(new RegExp(`/${DRAFTS_DIR}/([^/]+)/`))
    return {
      location: 'draft',
      userId: match ? match[1] : undefined
    }
  } else if (normalized.includes(`/${PROJECTS_DIR}/`)) {
    // 项目区路径
    const match = normalized.match(new RegExp(`/${PROJECTS_DIR}/([^/]+)/`))
    return {
      location: 'project',
      projectName: match ? match[1] : undefined
    }
  }
  
  // 默认认为是旧的存储路径
  return { location: 'project' }
}

/**
 * 删除空目录（递归向上）
 */
export function cleanupEmptyDirectories(dirPath: string): void {
  try {
    const uploadRoot = path.join(process.cwd(), UPLOAD_ROOT)
    let currentDir = dirPath
    
    while (currentDir !== uploadRoot && currentDir !== process.cwd()) {
      if (fs.existsSync(currentDir)) {
        const files = fs.readdirSync(currentDir)
        if (files.length === 0) {
          fs.rmdirSync(currentDir)
          currentDir = path.dirname(currentDir)
        } else {
          break
        }
      } else {
        break
      }
    }
  } catch (error) {
    console.error('Cleanup empty directories error:', error)
  }
}

/**
 * 确保目录存在（导出版本）
 */
export function ensureDirectoryExistsExport(dirPath: string): void {
  ensureDirectoryExists(dirPath)
}

// 为了兼容旧代码，也导出 ensureDirectoryExists
export { ensureDirectoryExists }

/**
 * 获取项目的实验目录
 * 格式: upload/projects/{项目名称}/experiments/
 */
export function getProjectExperimentsDir(projectName: string): string {
  const safeProjectName = sanitizeName(projectName)
  return path.join(
    process.cwd(),
    UPLOAD_ROOT,
    PROJECTS_DIR,
    safeProjectName,
    EXPERIMENTS_DIR
  )
}

/**
 * 生成跨项目链接文件路径
 * 用于创建 .link 文件指向实际实验位置
 */
export function generateLinkFilePath(
  projectName: string,
  experimentId: string
): { fullPath: string; relativePath: string } {
  const experimentsDir = getProjectExperimentsDir(projectName)
  ensureDirectoryExists(experimentsDir)

  const linkFilename = `${experimentId}.link`
  const fullPath = path.join(experimentsDir, linkFilename)

  // 相对路径: projects/{projectName}/experiments/{experimentId}.link
  const relativePath = path.join(
    PROJECTS_DIR,
    sanitizeName(projectName),
    EXPERIMENTS_DIR,
    linkFilename
  ).replace(/\\/g, '/')

  return { fullPath, relativePath }
}

/**
 * 获取项目文档目录
 * 格式: upload/projects/{项目名称}/documents/
 */
export function getProjectDocumentsDir(projectName: string): string {
  const safeProjectName = sanitizeName(projectName)
  return path.join(
    process.cwd(),
    UPLOAD_ROOT,
    PROJECTS_DIR,
    safeProjectName,
    'documents'
  )
}

/**
 * 生成项目文档文件路径
 * 用于上传项目文档（建议书、报告等）
 */
export function generateProjectDocumentPath(
  projectName: string,
  originalFilename: string
): FilePathResult {
  const documentsDir = getProjectDocumentsDir(projectName)
  ensureDirectoryExists(documentsDir)

  const datePrefix = getDatePrefix()
  const ext = path.extname(originalFilename)
  const baseName = path.basename(originalFilename, ext)
  const safeBaseName = sanitizeName(baseName)
  const uniqueFilename = getUniqueFilename(documentsDir, `${datePrefix}_${safeBaseName}${ext}`)
  const fullPath = path.join(documentsDir, uniqueFilename)

  // 相对路径: projects/{projectName}/documents/{date}_{filename}
  const relativePath = path.join(
    PROJECTS_DIR,
    sanitizeName(projectName),
    'documents',
    uniqueFilename
  ).replace(/\\/g, '/')

  return {
    fullPath,
    relativePath,
    directory: documentsDir
  }
}
