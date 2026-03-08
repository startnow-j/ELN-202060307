// BioLab ELN - 权限管理模块
// v3.3 超级管理员 + 项目角色权限体系
// Force recompile - SUPER_ADMIN support

import { db } from '@/lib/db'
import { ProjectMemberRole, UserRole } from '@prisma/client'

// ==================== 类型定义 ====================

export type ProjectPermission = 
  | 'view'          // 查看项目
  | 'edit_project'  // 编辑项目信息
  | 'manage_members' // 管理成员
  | 'create_experiment' // 创建实验
  | 'review'        // 审核实验
  | 'unlock'        // 解锁实验
  | 'manage_docs'   // 管理项目文档

// 权限矩阵：项目角色 -> 权限列表
const PROJECT_PERMISSIONS: Record<ProjectMemberRole, ProjectPermission[]> = {
  PROJECT_LEAD: ['view', 'edit_project', 'manage_members', 'create_experiment', 'review', 'unlock', 'manage_docs'],
  MEMBER: ['view', 'create_experiment'],
  VIEWER: ['view']
}

// ==================== 超级管理员权限检查 ====================

/**
 * 检查用户是否是超级管理员
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  return user?.role === 'SUPER_ADMIN'
}

/**
 * 检查用户是否是管理员（包括超级管理员）
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
}

/**
 * 检查用户是否可以管理用户（超级管理员和管理员）
 * ADMIN 和 SUPER_ADMIN 都可以管理用户
 */
export async function canManageUsers(userId: string): Promise<boolean> {
  return isAdmin(userId)
}

/**
 * 检查用户是否可以管理 SUPER_ADMIN 角色（仅超级管理员）
 * 只有 SUPER_ADMIN 可以创建/修改 SUPER_ADMIN 账号
 */
export async function canManageSuperAdminRole(userId: string): Promise<boolean> {
  return isSuperAdmin(userId)
}

/**
 * 检查用户是否可以删除项目（仅超级管理员）
 */
export async function canDeleteProject(userId: string): Promise<boolean> {
  return isSuperAdmin(userId)
}

/**
 * 检查用户是否可以恢复已归档项目（仅超级管理员）
 */
export async function canRestoreArchivedProject(userId: string): Promise<boolean> {
  return isSuperAdmin(userId)
}

/**
 * 检查用户是否可以清理暂存实验（仅超级管理员）
 */
export async function canCleanupDrafts(userId: string): Promise<boolean> {
  return isSuperAdmin(userId)
}

// ==================== 项目角色查询 ====================

/**
 * 获取用户在项目中的角色
 * 项目创建者自动拥有 PROJECT_LEAD 权限
 */
export async function getProjectRole(userId: string, projectId: string): Promise<ProjectMemberRole | null> {
  // 检查是否为项目创建者
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true }
  })
  
  if (project?.ownerId === userId) {
    return ProjectMemberRole.PROJECT_LEAD
  }
  
  // 检查项目成员表
  const membership = await db.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId }
    }
  })
  
  return membership?.role || null
}

/**
 * 获取项目的所有项目负责人（包括创建者）
 */
export async function getProjectLeads(projectId: string) {
  // 获取项目创建者
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true }
  })
  
  if (!project) return []
  
  // 获取 PROJECT_LEAD 角色的成员
  const projectLeads = await db.projectMember.findMany({
    where: {
      projectId,
      role: ProjectMemberRole.PROJECT_LEAD
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true }
      }
    }
  })
  
  // 获取项目创建者信息
  const owner = await db.user.findUnique({
    where: { id: project.ownerId },
    select: { id: true, name: true, email: true, avatar: true }
  })
  
  // 合并并去重
  const leads = projectLeads.map(pm => pm.user)
  if (owner && !leads.find(l => l.id === owner.id)) {
    leads.unshift(owner)
  }
  
  return leads
}

/**
 * 获取用户可访问的所有项目
 */
export async function getUserAccessibleProjects(userId: string) {
  // 获取用户创建的项目
  const ownedProjects = await db.project.findMany({
    where: { ownerId: userId }
  })
  
  // 获取用户参与的项目
  const memberProjects = await db.projectMember.findMany({
    where: { userId },
    include: { project: true }
  })
  
  // 合并并去重
  const allProjects = [...ownedProjects]
  for (const mp of memberProjects) {
    if (!allProjects.find(p => p.id === mp.project.id)) {
      allProjects.push(mp.project)
    }
  }
  
  return allProjects
}

// ==================== 权限检查函数 ====================

/**
 * 检查用户是否有项目的特定权限
 */
export async function hasProjectPermission(
  userId: string, 
  projectId: string, 
  permission: ProjectPermission
): Promise<boolean> {
  // 系统管理员拥有所有权限
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return true
  
  // 获取项目角色
  const projectRole = await getProjectRole(userId, projectId)
  if (!projectRole) return false
  
  // 检查权限
  return PROJECT_PERMISSIONS[projectRole].includes(permission)
}

/**
 * 检查用户是否可以审核实验
 * 注意：实验作者不能审核自己的实验
 */
export async function canReviewExperiment(userId: string, experimentId: string): Promise<boolean> {
  // 获取实验信息
  const experiment = await db.experiment.findUnique({
    where: { id: experimentId },
    include: { experimentProjects: true }
  })
  
  if (!experiment) return false
  
  // 实验作者不能审核自己的实验
  if (experiment.authorId === userId) return false
  
  // 系统管理员可以审核（但不能审核自己的）
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return true
  
  // 检查是否为指定审核人
  const reviewRequest = await db.reviewRequest.findFirst({
    where: {
      experimentId,
      reviewerId: userId,
      status: 'PENDING'
    }
  })
  
  if (reviewRequest) return true
  
  // 检查是否为项目负责人的实验（但不能是作者）
  for (const ep of experiment.experimentProjects) {
    const role = await getProjectRole(userId, ep.projectId)
    if (role === ProjectMemberRole.PROJECT_LEAD) return true
  }
  
  return false
}

/**
 * 检查用户是否可以解锁实验
 */
export async function canUnlockExperiment(userId: string, experimentId: string): Promise<boolean> {
  // 系统管理员可以解锁
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return true
  
  // 检查是否为项目负责人的实验
  const experiment = await db.experiment.findUnique({
    where: { id: experimentId },
    include: { experimentProjects: true }
  })
  
  if (!experiment) return false
  
  for (const ep of experiment.experimentProjects) {
    const role = await getProjectRole(userId, ep.projectId)
    if (role === ProjectMemberRole.PROJECT_LEAD) return true
  }
  
  return false
}

/**
 * 检查用户是否可以管理项目成员
 */
export async function canManageMembers(userId: string, projectId: string): Promise<boolean> {
  return hasProjectPermission(userId, projectId, 'manage_members')
}

/**
 * 检查用户是否可以编辑实验
 */
export async function canEditExperiment(userId: string, experimentId: string): Promise<boolean> {
  const experiment = await db.experiment.findUnique({
    where: { id: experimentId },
    select: { authorId: true, reviewStatus: true }
  })
  
  if (!experiment) return false
  
  // 锁定状态不能编辑
  if (experiment.reviewStatus === 'LOCKED') return false
  
  // 作者可以编辑自己的实验
  if (experiment.authorId === userId) return true
  
  // 系统管理员可以编辑
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  return user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
}

/**
 * 检查用户是否可以查看实验
 */
export async function canViewExperiment(userId: string, experimentId: string): Promise<boolean> {
  // 系统管理员可以查看所有实验
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return true
  
  // 作者可以查看自己的实验
  const experiment = await db.experiment.findUnique({
    where: { id: experimentId },
    select: { authorId: true, experimentProjects: true }
  })
  
  if (!experiment) return false
  
  if (experiment.authorId === userId) return true
  
  // 检查是否为项目成员
  for (const ep of experiment.experimentProjects) {
    const role = await getProjectRole(userId, ep.projectId)
    if (role) return true
  }
  
  return false
}

/**
 * 检查用户是否可以上传附件
 */
export async function canUploadAttachment(userId: string, experimentId: string): Promise<boolean> {
  // 系统管理员可以上传
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return true
  
  // 获取实验信息
  const experiment = await db.experiment.findUnique({
    where: { id: experimentId },
    select: { authorId: true, reviewStatus: true, experimentProjects: true }
  })
  
  if (!experiment) return false
  
  // 锁定状态不能上传
  if (experiment.reviewStatus === 'LOCKED') return false
  
  // 作者可以上传
  if (experiment.authorId === userId) return true
  
  // 项目负责人可以上传
  for (const ep of experiment.experimentProjects) {
    const role = await getProjectRole(userId, ep.projectId)
    if (role === ProjectMemberRole.PROJECT_LEAD) return true
  }
  
  return false
}

/**
 * 检查用户是否可以下载附件
 */
export async function canDownloadAttachment(userId: string, attachmentId: string): Promise<boolean> {
  // 系统管理员可以下载所有附件
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return true
  
  // 获取附件关联的实验
  const attachment = await db.attachment.findUnique({
    where: { id: attachmentId },
    select: { 
      experimentId: true,
      uploaderId: true 
    }
  })
  
  if (!attachment) return false
  
  // 上传者可以下载
  if (attachment.uploaderId === userId) return true
  
  // 检查实验权限
  return canViewExperiment(userId, attachment.experimentId)
}

// ==================== 辅助函数 ====================

/**
 * 获取可用的审核人列表
 * 包括项目负责人和系统管理员
 */
export async function getAvailableReviewers(experimentId: string) {
  const experiment = await db.experiment.findUnique({
    where: { id: experimentId },
    include: { experimentProjects: true }
  })
  
  if (!experiment) return []
  
  // 收集所有项目负责人
  const leads: { id: string, name: string, email: string, avatar: string | null, isProjectLead: boolean, projectName?: string }[] = []
  
  for (const ep of experiment.experimentProjects) {
    const projectLeads = await getProjectLeads(ep.projectId)
    const project = await db.project.findUnique({
      where: { id: ep.projectId },
      select: { name: true }
    })
    
    for (const lead of projectLeads) {
      if (lead.id !== experiment.authorId && !leads.find(l => l.id === lead.id)) {
        leads.push({
          ...lead,
          isProjectLead: true,
          projectName: project?.name
        })
      }
    }
  }
  
  // 获取所有系统管理员和超级管理员
  const admins = await db.user.findMany({
    where: {
      role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      isActive: true
    },
    select: { id: true, name: true, email: true, avatar: true }
  })
  
  for (const admin of admins) {
    if (admin.id !== experiment.authorId && !leads.find(l => l.id === admin.id)) {
      leads.push({
        ...admin,
        isProjectLead: false
      })
    }
  }
  
  return leads
}

/**
 * 检查用户是否是任意项目的负责人
 * 用于判断是否显示审核菜单
 */
export async function isUserProjectLead(userId: string): Promise<boolean> {
  // 系统管理员总是有审核权限
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return true
  
  // 检查是否是项目创建者
  const ownedProjects = await db.project.count({
    where: { ownerId: userId }
  })
  
  if (ownedProjects > 0) return true
  
  // 检查是否是项目成员表中的PROJECT_LEAD
  const projectLeadMembership = await db.projectMember.count({
    where: {
      userId,
      role: ProjectMemberRole.PROJECT_LEAD
    }
  })
  
  return projectLeadMembership > 0
}

/**
 * 检查用户是否可以在项目中创建实验
 * 只有 ACTIVE 状态的项目才能创建实验
 */
export async function canCreateExperimentInProject(userId: string, projectId: string): Promise<{
  allowed: boolean
  reason?: string
}> {
  // 获取项目信息
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { status: true, ownerId: true }
  })
  
  if (!project) {
    return { allowed: false, reason: '项目不存在' }
  }
  
  // 检查项目状态
  if (project.status !== 'ACTIVE') {
    return { 
      allowed: false, 
      reason: project.status === 'COMPLETED' 
        ? '项目已完成，不能创建新实验' 
        : '项目已归档，不能创建新实验'
    }
  }
  
  // 检查用户权限
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  // 管理员可以创建
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') {
    return { allowed: true }
  }
  
  // 项目创建者可以创建
  if (project.ownerId === userId) {
    return { allowed: true }
  }
  
  // 检查项目成员权限
  const role = await getProjectRole(userId, projectId)
  if (role === ProjectMemberRole.PROJECT_LEAD || role === ProjectMemberRole.MEMBER) {
    return { allowed: true }
  }
  
  return { allowed: false, reason: '您不是此项目的成员' }
}

/**
 * 检查用户是否可以创建实验（全局）
 * 只要用户在任意项目中有创建权限，或者是管理员，就可以创建
 */
export async function canCreateExperiment(userId: string): Promise<boolean> {
  // 系统管理员可以创建
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return true
  
  // 检查是否是项目创建者
  const ownedProjects = await db.project.count({
    where: { ownerId: userId, status: 'ACTIVE' }
  })
  
  if (ownedProjects > 0) return true
  
  // 检查是否是项目成员表中的 PROJECT_LEAD 或 MEMBER
  const memberWithPermission = await db.projectMember.count({
    where: {
      userId,
      role: { in: [ProjectMemberRole.PROJECT_LEAD, ProjectMemberRole.MEMBER] }
    }
  })
  
  return memberWithPermission > 0
}

// ==================== 项目状态变更权限 ====================

/**
 * 检查用户是否可以结束项目
 * 超级管理员、管理员、项目负责人可以结束项目
 */
export async function canCompleteProject(userId: string, projectId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return true
  
  const role = await getProjectRole(userId, projectId)
  return role === ProjectMemberRole.PROJECT_LEAD
}

/**
 * 检查用户是否可以解锁已结束的项目
 * 超级管理员、管理员、项目负责人可以解锁
 */
export async function canUnlockCompletedProject(userId: string, projectId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return true
  
  const role = await getProjectRole(userId, projectId)
  return role === ProjectMemberRole.PROJECT_LEAD
}

/**
 * 检查用户是否可以归档项目
 * 超级管理员、管理员、项目负责人可以归档已结束的项目
 */
export async function canArchiveProject(userId: string, projectId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return true
  
  const role = await getProjectRole(userId, projectId)
  return role === ProjectMemberRole.PROJECT_LEAD
}

/**
 * 检查用户是否可以解锁已归档的项目
 * 只有超级管理员可以解锁已归档的项目
 */
export async function canUnlockArchivedProject(userId: string): Promise<boolean> {
  return isSuperAdmin(userId)
}

/**
 * 检查用户是否可以变更项目状态
 * 返回可执行的操作列表
 */
export async function getAvailableProjectStatusActions(
  userId: string, 
  projectId: string
): Promise<{
  currentStatus: string
  availableActions: Array<{
    action: 'complete' | 'reactivate' | 'archive' | 'unarchive'
    label: string
    description: string
  }>
}> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { status: true }
  })
  
  if (!project) {
    return { currentStatus: '', availableActions: [] }
  }
  
  const availableActions: Array<{
    action: 'complete' | 'reactivate' | 'archive' | 'unarchive'
    label: string
    description: string
  }> = []
  
  const isSuperAdminUser = await isSuperAdmin(userId)
  const isAdminUser = await isAdmin(userId)
  const isProjectLeadUser = (await getProjectRole(userId, projectId)) === ProjectMemberRole.PROJECT_LEAD
  const canChange = isSuperAdminUser || isAdminUser || isProjectLeadUser
  
  if (!canChange) {
    return { currentStatus: project.status, availableActions: [] }
  }
  
  switch (project.status) {
    case 'ACTIVE':
      // 进行中 -> 可结束
      availableActions.push({
        action: 'complete',
        label: '结束项目',
        description: '项目结束后的影响：所有实验记录将被锁定，记录真实结束时间'
      })
      break
      
    case 'COMPLETED':
      // 已结束 -> 可解锁（回到进行中），可归档
      availableActions.push({
        action: 'reactivate',
        label: '解锁项目',
        description: '项目将恢复到进行中状态，实验记录可以继续编辑'
      })
      availableActions.push({
        action: 'archive',
        label: '归档项目',
        description: '项目归档后，只有超级管理员才能解锁'
      })
      break
      
    case 'ARCHIVED':
      // 已归档 -> 只有超级管理员可解锁
      if (isSuperAdminUser) {
        availableActions.push({
          action: 'unarchive',
          label: '解除归档',
          description: '项目将恢复到已结束状态'
        })
      }
      break
  }
  
  return { currentStatus: project.status, availableActions }
}

/**
 * 检查用户是否可以管理项目文档
 */
export async function canManageProjectDocuments(userId: string, projectId: string): Promise<boolean> {
  return hasProjectPermission(userId, projectId, 'manage_docs')
}
