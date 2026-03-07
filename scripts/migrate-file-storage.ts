/**
 * BioLab ELN - 文件存储结构迁移脚本
 * 
 * 功能：
 * 1. 将扁平存储的文件迁移到按项目/实验分层的目录结构
 * 2. 恢复原始文件名（添加日期前缀）
 * 3. 更新数据库中的路径记录
 * 
 * 目录结构：
 * - 有关联项目的实验: upload/projects/{项目名}/experiments/{日期}_{实验标题}/{文件}
 * - 无关联项目的实验: upload/users/{用户ID}/drafts/{日期}_{实验标题}/{文件}
 * 
 * 文件命名规则：
 * {日期}_{原始文件名}.{扩展名}
 * 例如: 20250227_立项报告.pdf
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

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
function getDatePrefix(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * 生成新的文件名（保留原始名称+日期前缀）
 */
function generateNewFilename(originalName: string, date: Date): string {
  const datePrefix = getDatePrefix(date)
  const ext = path.extname(originalName)
  const baseName = path.basename(originalName, ext)
  const safeBaseName = sanitizeName(baseName)
  return `${datePrefix}_${safeBaseName}${ext}`
}

/**
 * 确保目录存在
 */
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
    console.log(`  创建目录: ${dirPath}`)
  }
}

/**
 * 获取文件系统中实际的文件路径
 */
function getActualFilePath(dbPath: string): string {
  // 数据库路径格式: /upload/files/xxx 或 upload/files/xxx
  const normalized = dbPath.replace(/^\/+/, '')
  return path.join(process.cwd(), normalized)
}

// ==================== 迁移函数 ====================

interface MigrationResult {
  attachmentId: string
  oldPath: string
  newPath: string
  status: 'success' | 'skipped' | 'error'
  message?: string
}

async function migrateFiles() {
  console.log('====================================')
  console.log('BioLab ELN 文件存储结构迁移')
  console.log('====================================\n')

  const results: MigrationResult[] = []

  // 获取所有附件及其关联信息
  const attachments = await prisma.attachment.findMany({
    include: {
      experiment: {
        include: {
          experimentProjects: {
            include: { project: true }
          },
          author: { select: { id: true, name: true } }
        }
      }
    }
  })

  console.log(`共有 ${attachments.length} 个附件需要处理\n`)

  for (const attachment of attachments) {
    console.log(`处理附件: ${attachment.name}`)
    console.log(`  ID: ${attachment.id}`)
    
    const experiment = attachment.experiment
    if (!experiment) {
      console.log(`  ⚠️ 跳过: 附件没有关联实验`)
      results.push({
        attachmentId: attachment.id,
        oldPath: attachment.path,
        newPath: '',
        status: 'skipped',
        message: '附件没有关联实验'
      })
      continue
    }

    // 获取源文件路径
    const sourcePath = getActualFilePath(attachment.path)
    if (!fs.existsSync(sourcePath)) {
      console.log(`  ⚠️ 跳过: 源文件不存在 - ${sourcePath}`)
      results.push({
        attachmentId: attachment.id,
        oldPath: attachment.path,
        newPath: '',
        status: 'skipped',
        message: `源文件不存在: ${sourcePath}`
      })
      continue
    }

    // 确定目标目录
    let targetDir: string
    let relativeDir: string

    const primaryProject = experiment.experimentProjects[0]?.project
    const datePrefix = getDatePrefix(experiment.createdAt)
    const safeExpTitle = sanitizeName(experiment.title)

    if (primaryProject) {
      // 有关联项目 -> 项目存储区
      const safeProjectName = sanitizeName(primaryProject.name)
      targetDir = path.join(
        process.cwd(),
        'upload',
        'projects',
        safeProjectName,
        'experiments',
        `${datePrefix}_${safeExpTitle}`
      )
      relativeDir = `upload/projects/${safeProjectName}/experiments/${datePrefix}_${safeExpTitle}`
    } else {
      // 无关联项目 -> 用户暂存区
      targetDir = path.join(
        process.cwd(),
        'upload',
        'users',
        experiment.authorId,
        'drafts',
        `${datePrefix}_${safeExpTitle}`
      )
      relativeDir = `upload/users/${experiment.authorId}/drafts/${datePrefix}_${safeExpTitle}`
    }

    // 创建目标目录
    ensureDirectoryExists(targetDir)

    // 生成新文件名
    const newFilename = generateNewFilename(attachment.name, attachment.createdAt)
    const targetPath = path.join(targetDir, newFilename)
    const newRelativePath = `${relativeDir}/${newFilename}`

    // 检查目标文件是否已存在
    if (fs.existsSync(targetPath)) {
      console.log(`  ⚠️ 跳过: 目标文件已存在 - ${targetPath}`)
      results.push({
        attachmentId: attachment.id,
        oldPath: attachment.path,
        newPath: newRelativePath,
        status: 'skipped',
        message: '目标文件已存在'
      })
      continue
    }

    // 移动文件
    try {
      fs.copyFileSync(sourcePath, targetPath)
      console.log(`  ✅ 复制文件: ${targetPath}`)
      
      // 更新数据库
      await prisma.attachment.update({
        where: { id: attachment.id },
        data: { path: newRelativePath }
      })
      console.log(`  ✅ 更新数据库路径`)

      // 更新实验的 storageLocation
      if (primaryProject) {
        await prisma.experiment.update({
          where: { id: experiment.id },
          data: {
            storageLocation: primaryProject.id,
            primaryProjectId: primaryProject.id
          }
        })
      } else {
        await prisma.experiment.update({
          where: { id: experiment.id },
          data: { storageLocation: 'draft' }
        })
      }

      results.push({
        attachmentId: attachment.id,
        oldPath: attachment.path,
        newPath: newRelativePath,
        status: 'success'
      })
    } catch (error) {
      console.log(`  ❌ 错误: ${error}`)
      results.push({
        attachmentId: attachment.id,
        oldPath: attachment.path,
        newPath: newRelativePath,
        status: 'error',
        message: String(error)
      })
    }
  }

  // 输出迁移报告
  console.log('\n====================================')
  console.log('迁移报告')
  console.log('====================================\n')

  const successCount = results.filter(r => r.status === 'success').length
  const skippedCount = results.filter(r => r.status === 'skipped').length
  const errorCount = results.filter(r => r.status === 'error').length

  console.log(`成功: ${successCount}`)
  console.log(`跳过: ${skippedCount}`)
  console.log(`错误: ${errorCount}`)

  // 保存详细报告
  const reportPath = path.join(process.cwd(), 'docs', 'file-migration-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
  console.log(`\n详细报告已保存到: ${reportPath}`)

  return results
}

// 执行迁移
migrateFiles()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
