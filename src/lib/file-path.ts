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
 * 格式: upload/users/{用户ID}/drafts/{日期}_{实验标题}/{日期}_{原始文件名}.{扩展名}
 */
export function generateDraftFilePath(
  userId: string,
  experimentTitle: string,
  originalFilename: string
): FilePathResult {
  const experimentDir = getDraftExperimentDir(userId, experimentTitle)
  
  // 确保目录存在
  if (!fs.existsSync(experimentDir)) {
    fs.mkdirSync(experimentDir, { recursive: true })
  }
  
  // 生成文件名：日期_原始文件名.扩展名
  const datePrefix = getDatePrefix()
  const ext = path.extname(originalFilename)
  const baseName = path.basename(originalFilename, ext)
  const safeBaseName = sanitizeName(baseName)
  const newFilename = `${datePrefix}_${safeBaseName}${ext}`
  
  // 处理文件名冲突
  const finalFilename = getUniqueFilename(experimentDir, newFilename)
  
  return {
    fullPath: path.join(experimentDir, finalFilename),
    relativePath: path.join(
      UPLOAD_ROOT, 
      DRAFTS_DIR, 
      userId, 
      'drafts',
      `${getDatePrefix()}_${sanitizeName(experimentTitle)}`,
      finalFilename
    ).replace(/\\/g, '/'),
    directory: experimentDir
  }
}

// ==================== 项目存储区路径 ====================

/**
 * 获取项目目录
 * 格式: upload/projects/{项目名称}/
 */
export function getProjectDir(projectName: string): string {
  const safeName = sanitizeName(projectName)
  return path.join(process.cwd(), UPLOAD_ROOT, PROJECTS_DIR, safeName)
}

/**
 * 获取项目实验目录
 * 格式: upload/projects/{项目名称}/experiments/
 */
export function getProjectExperimentsDir(projectName: string): string {
  return path.join(getProjectDir(projectName), EXPERIMENTS_DIR)
}

/**
 * 获取项目文档目录
 * 格式: upload/projects/{项目名称}/documents/
 */
export function getProjectDocumentsDir(projectName: string): string {
  return path.join(getProjectDir(projectName), 'documents')
}

/**
 * 获取项目实验目录
 * 格式: upload/projects/{项目名称}/experiments/{日期}_{实验标题}/
 */
export function getProjectExperimentDir(projectName: string, experimentTitle: string): string {
  const experimentsDir = getProjectExperimentsDir(projectName)
  const datePrefix = getDatePrefix()
  const safeTitle = sanitizeName(experimentTitle)
  const dirName = `${datePrefix}_${safeTitle}`
  
  return path.join(experimentsDir, dirName)
}

/**
 * 生成项目文件路径
 * 格式: upload/projects/{项目名称}/experiments/{日期}_{实验标题}/{日期}_{原始文件名}.{扩展名}
 */
export function generateProjectFilePath(
  projectName: string,
  experimentTitle: string,
  originalFilename: string
): FilePathResult {
  const experimentDir = getProjectExperimentDir(projectName, experimentTitle)
  
  // 确保目录存在
  if (!fs.existsSync(experimentDir)) {
    fs.mkdirSync(experimentDir, { recursive: true })
  }
  
  // 生成文件名：日期_原始文件名.扩展名
  const datePrefix = getDatePrefix()
  const ext = path.extname(originalFilename)
  const baseName = path.basename(originalFilename, ext)
  const safeBaseName = sanitizeName(baseName)
  const newFilename = `${datePrefix}_${safeBaseName}${ext}`
  
  // 处理文件名冲突
  const finalFilename = getUniqueFilename(experimentDir, newFilename)
  
  return {
    fullPath: path.join(experimentDir, finalFilename),
    relativePath: path.join(
      UPLOAD_ROOT,
      PROJECTS_DIR,
      sanitizeName(projectName),
      EXPERIMENTS_DIR,
      `${datePrefix}_${sanitizeName(experimentTitle)}`,
      finalFilename
    ).replace(/\\/g, '/'),
    directory: experimentDir
  }
}

// ==================== .link 引用文件 ====================

/**
 * 生成 .link 引用文件路径
 * 格式: upload/projects/{项目名称}/experiments/{实验ID}.link
 */
export function generateLinkFilePath(
  projectName: string,
  experimentId: string
): FilePathResult {
  const experimentsDir = getProjectExperimentsDir(projectName)
  
  // 确保目录存在
  if (!fs.existsSync(experimentsDir)) {
    fs.mkdirSync(experimentsDir, { recursive: true })
  }
  
  const filename = `${experimentId}.link`
  
  return {
    fullPath: path.join(experimentsDir, filename),
    relativePath: path.join(
      UPLOAD_ROOT,
      PROJECTS_DIR,
      sanitizeName(projectName),
      EXPERIMENTS_DIR,
      filename
    ).replace(/\\/g, '/'),
    directory: experimentsDir
  }
}

// ==================== 项目文档路径 ====================

/**
 * 生成项目文档文件路径
 * 格式: upload/projects/{项目名称}/documents/{日期}_{原始文件名}.{扩展名}
 */
export function generateProjectDocumentPath(
  projectName: string,
  originalFilename: string
): FilePathResult {
  const documentsDir = getProjectDocumentsDir(projectName)
  
  // 确保目录存在
  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true })
  }
  
  // 生成文件名：日期_原始文件名.扩展名
  const datePrefix = getDatePrefix()
  const ext = path.extname(originalFilename)
  const baseName = path.basename(originalFilename, ext)
  const safeBaseName = sanitizeName(baseName)
  const newFilename = `${datePrefix}_${safeBaseName}${ext}`
  
  // 处理文件名冲突
  const finalFilename = getUniqueFilename(documentsDir, newFilename)
  
  return {
    fullPath: path.join(documentsDir, finalFilename),
    relativePath: path.join(
      UPLOAD_ROOT,
      PROJECTS_DIR,
      sanitizeName(projectName),
      'documents',
      finalFilename
    ).replace(/\\/g, '/'),
    directory: documentsDir
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
 * 确保目录存在
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}
