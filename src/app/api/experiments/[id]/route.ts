import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { AuditAction } from '@prisma/client'
import { hasProjectPermission, isAdmin, canEditExperimentByProjectStatus, canDeleteExperimentByProjectStatus } from '@/lib/permissions'
import {
  migrateExperimentToProject,
  createCrossProjectLink,
  deleteCrossProjectLink,
  shouldMigrateExperiment
} from '@/lib/experiment-migration'
import { calculateCompletenessScore } from '@/lib/completenessScore'
import fs from 'fs'
import path from 'path'

// 获取单个实验记录
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params

    const experiment = await db.experiment.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true, avatar: true }
        },
        experimentProjects: {
          include: {
            project: {
              include: {
                owner: {
                  select: { id: true, name: true, email: true, role: true, avatar: true }
                },
                members: {
                  select: { id: true, name: true, email: true, role: true, avatar: true }
                },
                projectMembers: {
                  select: { userId: true, role: true }
                }
              }
            }
          }
        },
        attachments: true,
        reviewFeedbacks: {
          include: {
            reviewer: {
              select: { id: true, name: true, email: true, role: true, avatar: true }
            },
            attachments: true
          },
          orderBy: { createdAt: 'desc' }
        },
        reviewRequests: {
          include: {
            reviewer: {
              select: { id: true, name: true, email: true, role: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        unlockRequests: {
          include: {
            requester: {
              select: { id: true, name: true, email: true, role: true, avatar: true }
            },
            processor: {
              select: { id: true, name: true, email: true, role: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!experiment) {
      return NextResponse.json({ error: '实验记录不存在' }, { status: 404 })
    }

    // 构建项目角色映射表：userId -> 项目角色（优先 PROJECT_LEAD > MEMBER > VIEWER）
    const projectRoleMap: Record<string, string> = {}
    for (const ep of experiment.experimentProjects) {
      for (const pm of ep.project.projectMembers) {
        const existingRole = projectRoleMap[pm.userId]
        const rolePriority = { PROJECT_LEAD: 3, MEMBER: 2, VIEWER: 1 }
        if (!existingRole || (rolePriority[pm.role as keyof typeof rolePriority] || 0) > (rolePriority[existingRole as keyof typeof rolePriority] || 0)) {
          projectRoleMap[pm.userId] = pm.role
        }
      }
      // 项目owner默认是负责人
      if (ep.project.ownerId && !projectRoleMap[ep.project.ownerId]) {
        projectRoleMap[ep.project.ownerId] = 'PROJECT_LEAD'
      } else if (ep.project.ownerId) {
        // owner优先级最高
        projectRoleMap[ep.project.ownerId] = 'PROJECT_LEAD'
      }
    }

    // 辅助函数：为用户添加项目角色
    const getUserWithProjectRole = (user: { id: string; name: string; email: string; role: string; avatar?: string | null } | null) => {
      if (!user) return null
      return {
        ...user,
        projectRole: projectRoleMap[user.id] || null
      }
    }

    // 获取当前用户在项目中的角色
    const currentUserProjectRole = projectRoleMap[userId] || null

    return NextResponse.json({
      id: experiment.id,
      title: experiment.title,
      summary: experiment.summary,
      conclusion: experiment.conclusion,
      extractedInfo: experiment.extractedInfo ? JSON.parse(experiment.extractedInfo) : null,
      extractionStatus: experiment.extractionStatus,
      extractionError: experiment.extractionError,
      reviewStatus: experiment.reviewStatus,
      completenessScore: experiment.completenessScore,
      tags: experiment.tags,
      authorId: experiment.authorId,
      author: getUserWithProjectRole(experiment.author),
      storageLocation: experiment.storageLocation,
      primaryProjectId: experiment.primaryProjectId,
      projects: experiment.experimentProjects.map(ep => {
        // 获取当前用户在此项目中的角色
        const myRoleInProject = ep.project.projectMembers.find(pm => pm.userId === userId)?.role || null
        return {
          id: ep.project.id,
          name: ep.project.name,
          description: ep.project.description,
          status: ep.project.status,
          startDate: ep.project.startDate,
          endDate: ep.project.endDate,
          ownerId: ep.project.ownerId,
          owner: ep.project.owner,
          members: ep.project.members,
          myRole: myRoleInProject || currentUserProjectRole,
          createdAt: ep.project.createdAt.toISOString()
        }
      }),
      attachments: experiment.attachments.map(att => ({
        id: att.id,
        name: att.name,
        type: att.type,
        size: att.size,
        path: att.path,
        category: att.category,
        previewData: att.extractedText ? JSON.parse(att.extractedText) : null,
        createdAt: att.createdAt.toISOString()
      })),
      reviewFeedbacks: experiment.reviewFeedbacks.map(rf => ({
        id: rf.id,
        action: rf.action,
        feedback: rf.feedback,
        createdAt: rf.createdAt.toISOString(),
        reviewerId: rf.reviewerId,
        reviewer: getUserWithProjectRole(rf.reviewer),
        attachments: rf.attachments?.map(att => ({
          id: att.id,
          name: att.name,
          type: att.type,
          size: att.size,
          createdAt: att.createdAt.toISOString()
        })) || []
      })),
      reviewRequests: experiment.reviewRequests.map(rr => ({
        id: rr.id,
        status: rr.status,
        note: rr.note,
        createdAt: rr.createdAt.toISOString(),
        updatedAt: rr.updatedAt.toISOString(),
        reviewerId: rr.reviewerId,
        reviewer: getUserWithProjectRole(rr.reviewer)
      })),
      unlockRequests: experiment.unlockRequests.map(ur => ({
        id: ur.id,
        reason: ur.reason,
        status: ur.status,
        response: ur.response,
        createdAt: ur.createdAt.toISOString(),
        processedAt: ur.processedAt?.toISOString() || null,
        requesterId: ur.requesterId,
        requester: getUserWithProjectRole(ur.requester),
        processorId: ur.processorId,
        processor: getUserWithProjectRole(ur.processor)
      })),
      createdAt: experiment.createdAt.toISOString(),
      updatedAt: experiment.updatedAt.toISOString(),
      submittedAt: experiment.submittedAt?.toISOString() || null,
      reviewedAt: experiment.reviewedAt?.toISOString() || null
    })
  } catch (error) {
    console.error('Get experiment error:', error)
    return NextResponse.json({ error: '获取实验记录失败' }, { status: 500 })
  }
}

// 更新实验记录
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, summary, conclusion, extractedInfo, tags, projectIds } = body

    // 检查权限
    const experiment = await db.experiment.findUnique({
      where: { id },
      include: {
        attachments: true,
        experimentProjects: {
          include: { project: true }
        }
      }
    })

    if (!experiment) {
      return NextResponse.json({ error: '实验记录不存在' }, { status: 404 })
    }

    // 检查是否可以编辑（只有DRAFT和NEEDS_REVISION状态可编辑）
    if (experiment.reviewStatus !== 'DRAFT' && experiment.reviewStatus !== 'NEEDS_REVISION') {
      return NextResponse.json({ error: '当前状态不允许编辑' }, { status: 403 })
    }

    // 检查项目状态是否允许编辑
    const projectStatusCheck = await canEditExperimentByProjectStatus(id)
    if (!projectStatusCheck.canEdit) {
      return NextResponse.json({ error: projectStatusCheck.reason }, { status: 403 })
    }

    const adminCheck = await isAdmin(userId)
    if (experiment.authorId !== userId && !adminCheck) {
      return NextResponse.json({ error: '无权限编辑此实验记录' }, { status: 403 })
    }

    // 处理项目关联变更
    let newStorageLocation = experiment.storageLocation
    let newPrimaryProjectId = experiment.primaryProjectId
    let updatedExperimentProjects = experiment.experimentProjects
    
    if (projectIds !== undefined) {
      // 获取当前项目ID列表
      const currentProjectIds = experiment.experimentProjects.map(ep => ep.projectId)
      const newProjectIds = projectIds as string[]
      
      // 检查用户是否有权限在新项目中添加实验
      for (const projectId of newProjectIds) {
        if (!currentProjectIds.includes(projectId)) {
          const canCreate = await hasProjectPermission(userId, projectId, 'create_experiment')
          if (!canCreate) {
            const project = await db.project.findUnique({
              where: { id: projectId },
              select: { name: true }
            })
            return NextResponse.json({ 
              error: `您没有权限将实验关联到项目「${project?.name || projectId}」` 
            }, { status: 403 })
          }
        }
      }
      
      // 检查是否需要迁移
      const migrationCheck = shouldMigrateExperiment(experiment.storageLocation, newProjectIds)
      
      if (migrationCheck.migrationType === 'draft-to-project' && newProjectIds.length > 0) {
        // 从暂存区迁移到项目
        const migrationResult = await migrateExperimentToProject(id, newProjectIds[0], userId)
        
        if (!migrationResult.success) {
          return NextResponse.json({ 
            error: `文件迁移失败: ${migrationResult.error}` 
          }, { status: 500 })
        }
        
        newStorageLocation = newProjectIds[0]
        newPrimaryProjectId = newProjectIds[0]
        
        // 如果关联多个项目，为其他项目创建链接文件
        for (let i = 1; i < newProjectIds.length; i++) {
          await createCrossProjectLink(id, newProjectIds[i], userId)
        }
      } else {
        // 项目关联变更，不迁移文件
        const addedProjectIds = newProjectIds.filter(pid => !currentProjectIds.includes(pid))
        const removedProjectIds = currentProjectIds.filter(pid => !newProjectIds.includes(pid))
        
        // 为新增的项目创建链接文件
        for (const projectId of addedProjectIds) {
          await createCrossProjectLink(id, projectId, userId)
        }
        
        // 删除移除项目的链接文件
        for (const projectId of removedProjectIds) {
          await deleteCrossProjectLink(id, projectId)
        }
        
        // 更新存储位置（如果有新的主项目）
        if (newProjectIds.length > 0 && !newPrimaryProjectId) {
          newPrimaryProjectId = newProjectIds[0]
          newStorageLocation = newProjectIds[0]
        }
      }
      
      // 更新项目关联
      await db.experimentProject.deleteMany({
        where: { experimentId: id }
      })
      if (newProjectIds.length > 0) {
        await db.experimentProject.createMany({
          data: newProjectIds.map((projectId: string) => ({
            experimentId: id,
            projectId
          }))
        })
      }
      
      // 更新后的项目关联列表用于评分计算
      updatedExperimentProjects = newProjectIds.map(pid => ({ projectId: pid }))
    }

    // 创建版本历史
    await db.experimentVersion.create({
      data: {
        title: experiment.title,
        summary: experiment.summary,
        conclusion: experiment.conclusion,
        extractedInfo: experiment.extractedInfo,
        experimentId: id,
        versionNote: '自动保存的版本'
      }
    })

    // 重新获取最新的附件列表（确保评分计算使用最新数据）
    const latestAttachments = await db.attachment.findMany({
      where: { experimentId: id }
    })

    // 计算完整度评分（使用最新数据）
    const score = calculateCompletenessScore({
      title,
      summary,
      conclusion,
      extractedInfo,
      tags,
      attachments: latestAttachments,
      experimentProjects: updatedExperimentProjects
    })

    // 更新实验
    const updated = await db.experiment.update({
      where: { id },
      data: {
        title,
        summary,
        conclusion,
        extractedInfo: extractedInfo ? JSON.stringify(extractedInfo) : null,
        tags,
        completenessScore: score,
        storageLocation: newStorageLocation,
        primaryProjectId: newPrimaryProjectId
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true, avatar: true }
        },
        experimentProjects: {
          include: {
            project: {
              include: {
                owner: {
                  select: { id: true, name: true, email: true, role: true, avatar: true }
                },
                members: {
                  select: { id: true, name: true, email: true, role: true, avatar: true }
                }
              }
            }
          }
        },
        attachments: true
      }
    })

    // 审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'Experiment',
        entityId: id,
        userId,
        details: JSON.stringify({ 
          title: updated.title,
          storageLocation: newStorageLocation,
          primaryProjectId: newPrimaryProjectId
        })
      }
    })

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      summary: updated.summary,
      conclusion: updated.conclusion,
      extractedInfo: updated.extractedInfo ? JSON.parse(updated.extractedInfo) : null,
      extractionStatus: updated.extractionStatus,
      extractionError: updated.extractionError,
      reviewStatus: updated.reviewStatus,
      completenessScore: updated.completenessScore,
      tags: updated.tags,
      authorId: updated.authorId,
      author: updated.author,
      storageLocation: updated.storageLocation,
      primaryProjectId: updated.primaryProjectId,
      projects: updated.experimentProjects.map(ep => ({
        id: ep.project.id,
        name: ep.project.name,
        description: ep.project.description,
        status: ep.project.status,
        startDate: ep.project.startDate,
        endDate: ep.project.endDate,
        ownerId: ep.project.ownerId,
        owner: ep.project.owner,
        members: ep.project.members,
        createdAt: ep.project.createdAt.toISOString()
      })),
      attachments: updated.attachments.map(att => ({
        id: att.id,
        name: att.name,
        type: att.type,
        size: att.size,
        path: att.path,
        category: att.category,
        previewData: att.extractedText ? JSON.parse(att.extractedText) : null,
        createdAt: att.createdAt.toISOString()
      })),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      submittedAt: updated.submittedAt?.toISOString() || null,
      reviewedAt: updated.reviewedAt?.toISOString() || null
    })
  } catch (error) {
    console.error('Update experiment error:', error)
    return NextResponse.json({ error: '更新实验记录失败' }, { status: 500 })
  }
}

// 删除实验记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params

    const experiment = await db.experiment.findUnique({
      where: { id },
      include: {
        attachments: true,
        experimentProjects: {
          include: { project: true }
        }
      }
    })

    if (!experiment) {
      return NextResponse.json({ error: '实验记录不存在' }, { status: 404 })
    }

    const adminCheck = await isAdmin(userId)
    if (experiment.authorId !== userId && !adminCheck) {
      return NextResponse.json({ error: '无权限删除此实验记录' }, { status: 403 })
    }

    // 不能删除已锁定的记录
    if (experiment.reviewStatus === 'LOCKED') {
      return NextResponse.json({ error: '已锁定的实验记录不能删除，请申请解锁' }, { status: 403 })
    }

    // 检查项目状态是否允许删除
    const projectStatusCheck = await canDeleteExperimentByProjectStatus(id)
    if (!projectStatusCheck.canDelete) {
      return NextResponse.json({ error: projectStatusCheck.reason }, { status: 403 })
    }

    // 删除关联的物理文件
    for (const attachment of experiment.attachments) {
      const filePath = path.join(process.cwd(), attachment.path)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }

    // 清理空目录
    if (experiment.attachments.length > 0) {
      const firstAttachment = experiment.attachments[0]
      const attachmentDir = path.dirname(path.join(process.cwd(), firstAttachment.path))
      cleanupEmptyDirectories(attachmentDir)
    }

    // 删除跨项目链接文件
    for (const ep of experiment.experimentProjects) {
      if (ep.projectId !== experiment.primaryProjectId) {
        await deleteCrossProjectLink(id, ep.projectId)
      }
    }

    // 删除实验（级联删除数据库记录）
    await db.experiment.delete({
      where: { id }
    })

    // 审计日志
    await db.auditLog.create({
      data: {
        action: AuditAction.DELETE,
        entityType: 'Experiment',
        entityId: id,
        userId,
        details: JSON.stringify({ 
          title: experiment.title,
          storageLocation: experiment.storageLocation,
          deletedFiles: experiment.attachments.length
        })
      }
    })

    return NextResponse.json({ success: true, message: '实验记录已删除' })
  } catch (error) {
    console.error('Delete experiment error:', error)
    return NextResponse.json({ error: '删除实验记录失败' }, { status: 500 })
  }
}

// 清理空目录（递归向上）
function cleanupEmptyDirectories(dirPath: string): void {
  try {
    const uploadRoot = path.join(process.cwd(), 'upload')
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
