// BioLab ELN - 实验文件迁移服务
// v3.3 暂存实验功能

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { AuditAction } from '@prisma/client'
import {
  generateDraftFilePath,
  generateProjectFilePath,
  generateLinkFilePath,
  createLinkFileContent,
  parseStorageLocation,
  cleanupEmptyDirectories,
  ensureDirectoryExists,
  getProjectExperimentDir,
  getProjectExperimentsDir
} from '@/lib/file-path'

// ==================== 类型定义 ====================

export interface MigrationResult {
  success: boolean
  fromPath: string
  toPath: string
  fileHashes: Record<string, string>
  error?: string
}

export interface FileHash {
  filename: string
  hash: string
  originalPath: string
  newPath: string
}

// ==================== 文件哈希计算 ====================

/**
 * 计算文件 SHA-256 哈希值
 */
export function calculateFileHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(fileBuffer).digest('hex')
}

/**
 * 批量计算文件哈希
 */
export function calculateFilesHash(filePaths: string[]): FileHash[] {
  return filePaths.map(filePath => {
    const hash = calculateFileHash(filePath)
    const filename = path.basename(filePath)
    return { filename, hash, originalPath: filePath, newPath: '' }
  })
}

// ==================== 文件迁移核心逻辑 ====================

/**
 * 迁移单个文件
 */
function migrateFile(
  sourcePath: string,
  targetPath: string,
  targetDir: string
): { success: boolean; error?: string } {
  try {
    // 确保目标目录存在
    ensureDirectoryExists(targetDir)
    
    // 复制文件到目标位置
    fs.copyFileSync(sourcePath, targetPath)
    
    // 验证文件完整性
    const sourceHash = calculateFileHash(sourcePath)
    const targetHash = calculateFileHash(targetPath)
    
    if (sourceHash !== targetHash) {
      // 哈希不匹配，删除复制的文件
      fs.unlinkSync(targetPath)
      return { success: false, error: '文件哈希验证失败' }
    }
    
    // 删除源文件
    fs.unlinkSync(sourcePath)
    
    return { success: true }
  } catch (error) {
    console.error('Migrate file error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '未知错误' 
    }
  }
}

/**
 * 迁移实验文件从暂存区到项目目录
 */
export async function migrateExperimentToProject(
  experimentId: string,
  projectId: string,
  userId: string
): Promise<MigrationResult> {
  try {
    // 获取实验信息
    const experiment = await db.experiment.findUnique({
      where: { id: experimentId },
      include: {
        attachments: true,
        experimentProjects: {
          include: { project: true }
        }
      }
    })
    
    if (!experiment) {
      return {
        success: false,
        fromPath: '',
        toPath: '',
        fileHashes: {},
        error: '实验不存在'
      }
    }
    
    // 获取目标项目信息
    const project = await db.project.findUnique({
      where: { id: projectId }
    })
    
    if (!project) {
      return {
        success: false,
        fromPath: '',
        toPath: '',
        fileHashes: {},
        error: '项目不存在'
      }
    }
    
    // 如果没有附件，只需更新数据库
    if (experiment.attachments.length === 0) {
      await db.experiment.update({
        where: { id: experimentId },
        data: {
          storageLocation: projectId,
          primaryProjectId: projectId
        }
      })
      
      return {
        success: true,
        fromPath: '',
        toPath: '',
        fileHashes: {}
      }
    }
    
    // 计算源目录（当前附件所在目录）
    const firstAttachment = experiment.attachments[0]
    const sourceDir = path.dirname(path.join(process.cwd(), firstAttachment.path))
    
    // 计算目标目录
    const targetDir = getProjectExperimentDir(project.name, experiment.title)
    
    // 记录文件哈希
    const fileHashes: Record<string, string> = {}
    
    // 在事务中执行迁移
    const result = await db.$transaction(async (tx) => {
      // 迁移每个附件
      for (const attachment of experiment.attachments) {
        const sourcePath = path.join(process.cwd(), attachment.path)
        const filename = path.basename(attachment.path)
        const targetPath = path.join(targetDir, filename)
        
        // 计算迁移前哈希
        const hash = calculateFileHash(sourcePath)
        fileHashes[filename] = hash
        
        // 迁移文件
        const result = migrateFile(sourcePath, targetPath, targetDir)
        if (!result.success) {
          throw new Error(`文件 ${filename} 迁移失败: ${result.error}`)
        }
        
        // 更新附件路径
        const newRelativePath = path.join(
          'upload',
          'projects',
          project.name,
          'experiments',
          path.basename(targetDir),
          filename
        ).replace(/\\/g, '/')
        
        await tx.attachment.update({
          where: { id: attachment.id },
          data: { path: newRelativePath }
        })
      }
      
      // 更新实验存储位置
      await tx.experiment.update({
        where: { id: experimentId },
        data: {
          storageLocation: projectId,
          primaryProjectId: projectId
        }
      })
      
      // 创建审计日志
      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE, // 使用 CREATE 因为没有 MIGRATE
          entityType: 'Experiment',
          entityId: experimentId,
          userId,
          details: JSON.stringify({
            action: 'MIGRATE',
            fromLocation: {
              type: 'USER_DRAFT',
              path: sourceDir
            },
            toLocation: {
              type: 'PROJECT',
              projectId,
              projectName: project.name,
              path: targetDir
            },
            fileHashes
          })
        }
      })
      
      return { sourceDir, targetDir }
    })
    
    // 清理空目录
    cleanupEmptyDirectories(result.sourceDir)
    
    return {
      success: true,
      fromPath: result.sourceDir,
      toPath: result.targetDir,
      fileHashes
    }
  } catch (error) {
    console.error('Migration error:', error)
    return {
      success: false,
      fromPath: '',
      toPath: '',
      fileHashes: {},
      error: error instanceof Error ? error.message : '迁移失败'
    }
  }
}

/**
 * 为多项目关联创建 .link 文件
 */
export async function createCrossProjectLink(
  experimentId: string,
  projectId: string,
  userId: string
): Promise<{ success: boolean; linkPath?: string; error?: string }> {
  try {
    // 获取实验信息
    const experiment = await db.experiment.findUnique({
      where: { id: experimentId },
      include: {
        experimentProjects: {
          include: { project: true }
        }
      }
    })
    
    if (!experiment) {
      return { success: false, error: '实验不存在' }
    }
    
    // 获取主存储项目
    const primaryProject = experiment.experimentProjects.find(
      ep => ep.projectId === experiment.primaryProjectId
    )?.project || experiment.experimentProjects[0]?.project
    
    if (!primaryProject) {
      return { success: false, error: '实验没有关联项目' }
    }
    
    // 获取要创建链接的项目
    const linkProject = await db.project.findUnique({
      where: { id: projectId }
    })
    
    if (!linkProject) {
      return { success: false, error: '目标项目不存在' }
    }
    
    // 不为自己的项目创建链接
    if (linkProject.id === primaryProject.id) {
      return { success: true }  // 不需要创建链接
    }
    
    // 获取用户信息
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true }
    })
    
    // 创建 .link 文件
    const { fullPath, relativePath } = generateLinkFilePath(
      linkProject.name,
      experimentId
    )
    
    // 获取主存储路径
    const primaryPath = path.join(
      'upload',
      'projects',
      primaryProject.name,
      'experiments',
      `${path.basename(getProjectExperimentDir(primaryProject.name, experiment.title))}`
    ).replace(/\\/g, '/')
    
    // 写入链接文件
    const content = createLinkFileContent(
      experimentId,
      experiment.title,
      primaryProject.id,
      primaryProject.name,
      primaryPath,
      user?.name || userId
    )
    
    fs.writeFileSync(fullPath, content, 'utf-8')
    
    // 审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entityType: 'Experiment',
        entityId: experimentId,
        userId,
        details: JSON.stringify({
          action: 'CREATE_LINK',
          linkProjectId: projectId,
          linkProjectName: linkProject.name,
          primaryProjectId: primaryProject.id,
          primaryProjectName: primaryProject.name
        })
      }
    })
    
    return { success: true, linkPath: relativePath }
  } catch (error) {
    console.error('Create link error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '创建链接失败'
    }
  }
}

/**
 * 删除跨项目链接
 */
export async function deleteCrossProjectLink(
  experimentId: string,
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 获取项目信息
    const project = await db.project.findUnique({
      where: { id: projectId }
    })
    
    if (!project) {
      return { success: false, error: '项目不存在' }
    }
    
    // 删除 .link 文件
    const { fullPath } = generateLinkFilePath(project.name, experimentId)
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }
    
    return { success: true }
  } catch (error) {
    console.error('Delete link error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '删除链接失败'
    }
  }
}

/**
 * 检查实验是否需要迁移
 */
export function shouldMigrateExperiment(
  currentStorageLocation: string | null,
  newProjectIds: string[]
): {
  needsMigration: boolean
  migrationType: 'none' | 'draft-to-project' | 'project-to-project'
} {
  if (newProjectIds.length === 0) {
    return { needsMigration: false, migrationType: 'none' }
  }
  
  // 当前在暂存区
  if (currentStorageLocation === 'draft' || !currentStorageLocation) {
    return { needsMigration: true, migrationType: 'draft-to-project' }
  }
  
  // 当前在项目区，不需要迁移文件
  return { needsMigration: false, migrationType: 'none' }
}
