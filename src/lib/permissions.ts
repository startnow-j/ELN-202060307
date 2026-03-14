// BioLab ELN - 权限管理模块
// v3.3 超级管理员 + 项目角色权限体系
// 性能优化版本 - 减少N+1查询

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

// ==================== 请求上下文缓存 ====================

// 使用 AsyncLocalStorage 实现请求级缓存
// 这确保每个请求有独立的缓存，请求结束后自动清理
import { AsyncLocalStorage } from 'async_hooks'

interface PermissionCache {
  userRoles: Map<string, UserRole>
  projectRoles: Map<string, ProjectMemberRole | null>
}

const permissionCacheStorage = new AsyncLocalStorage<PermissionCache>()

/**
 * 获取当前请求的权限缓存（内部使用）
 */
function getCache(): PermissionCache {
  let cache = permissionCacheStorage.getStore()
  if (!cache) {
    cache = {
      userRoles: new Map(),
      projectRoles: new Map()
    }
  }
  return cache
}

/**
 * 在权限缓存上下文中执行函数
 * 用于包装 API 路由，确保每个请求有独立的缓存
 */
export async function withPermissionCache<T>(fn: () => Promise<T>): Promise<T> {
  const cache: PermissionCache = {
    userRoles: new Map(),
    projectRoles: new Map()
  }
  return permissionCacheStorage.run(cache, fn)
}

// ==================== 超级管理员权限检查 ====================

/**
 * 获取用户角色（带请求级缓存）
 */
async function getUserRole(userId: string): Promise<UserRole | null> {
  const cache = getCache()
  
  if (cache.userRoles.has(userId)) {
    return cache.userRoles.get(userId) || null
  }
  
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  const role = user?.role || null
  cache.userRoles.set(userId, role)
  return role
}

/**
 * 检查用户是否是超级管理员
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  return role === 'SUPER_ADMIN'
}

/**
 * 检查用户是否是管理员（包括超级管理员）
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  return role === 'SUPER_ADMIN' || role === 'ADMIN'
}

/**
 * 检查用户是否可以管理用户（超级管理员和管理员）
 */
export async function canManageUsers(userId: string): Promise<boolean> {
  return isAdmin(userId)
}

/**
 * 检查用户是否可以管理 SUPER_ADMIN 角色（仅超级管理员）
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
 * 获取用户在项目中的角色（带请求级缓存）
 * 项目创建者自动拥有 PROJECT_LEAD 权限
 */
export async function getProjectRole(userId: string, projectId: string): Promise<ProjectMemberRole | null> {
  const cache = getCache()
  const cacheKey = `${userId}:${projectId}`
  
  if (cache.projectRoles.has(cacheKey)) {
    return cache.projectRoles.get(cacheKey) || null
  }
  
  // 检查是否为项目创建者
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true }
  })
  
  if (project?.ownerId === userId) {
    cache.projectRoles.set(cacheKey, ProjectMemberRole.PROJECT_LEAD)
    return ProjectMemberRole.PROJECT_LEAD
  }
  
  // 检查项目成员表
  const membership = await db.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId }
    }
  })
  
  const role = membership?.role || null
  cache.projectRoles.set(cacheKey, role)
  return role
}

/**
 * 批量获取用户在多个项目中的角色（优化N+1查询）
 * 这是最关键的优化函数，将多次查询合并为一次
 */
export async function getProjectRolesBatch(
  userId: string, 
  projectIds: string[]
): Promise<Map<string, ProjectMemberRole | null>> {
  if (projectIds.length === 0) {
    return new Map()
  }
  
  const cache = getCache()
  const result = new Map<string, ProjectMemberRole | null>()
  const uncachedIds: string[] = []
  
  // 先从缓存获取
  for (const projectId of projectIds) {
    const cacheKey = `${userId}:${projectId}`
    if (cache.projectRoles.has(cacheKey)) {
      result.set(projectId, cache.projectRoles.get(cacheKey) || null)
    } else {
      uncachedIds.push(projectId)
    }
  }
  
  // 如果全部命中缓存，直接返回
  if (uncachedIds.length === 0) {
    return result
  }
  
  // 批量查询项目owner（一次查询）
  const projects = await db.project.findMany({
    where: { id: { in: uncachedIds } },
    select: { id: true, ownerId: true }
  })
  
  const projectOwnerMap = new Map(projects.map(p => [p.id, p.ownerId]))
  
  // 批量查询项目成员（一次查询）
  const memberships = await db.projectMember.findMany({
    where: {
      projectId: { in: uncachedIds },
      userId
    }
  })
  
  const membershipMap = new Map(memberships.map(m => [m.projectId, m.role]))
  
  // 合并结果并更新缓存
  for (const projectId of uncachedIds) {
    const cacheKey = `${userId}:${projectId}`
    let role: ProjectMemberRole | null = null
    
    if (projectOwnerMap.get(projectId) === userId) {
      role = ProjectMemberRole.PROJECT_LEAD
    } else {
      role = membershipMap.get(projectId) || null
    }
    
    result.set(projectId, role)
    cache.projectRoles.set(cacheKey, role)
  }
  
  return result
}

/**
 * 获取项目的所有项目负责人（包括创建者）
 */
export async function getProjectLeads(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true }
  })
  
  if (!project) return []
  
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
  
  const owner = await db.user.findUnique({
    where: { id: project.ownerId },
    select: { id: true, name: true, email: true, avatar: true }
  })
  
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
  const ownedProjects = await db.project.findMany({
    where: { ownerId: userId }
  })
  
  const memberProjects = await db.projectMember.findMany({
    where: { userId },
    include: { project: true }
  })
  
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
  const role = await getUserRole(userId)
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true
  
  // 获取项目角色
  const projectRole = await getProjectRole(userId, projectId)
  if (!projectRole) return false
  
  // 检查权限
  return PROJECT_PERMISSIONS[projectRole].includes(permission)
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
  const role = await getUserRole(userId)
  return role === 'SUPER_ADMIN' || role === 'ADMIN'
}

/**
 * 检查用户是否可以查看实验
 */
export async function canViewExperiment(userId: string, experimentId: string): Promise<boolean> {
  // 系统管理员可以查看所有实验
  const role = await getUserRole(userId)
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true
  
  // 获取实验信息
  const experiment = await db.experiment.findUnique({
    where: { id: experimentId },
    select: { authorId: true, experimentProjects: true }
  })
  
  if (!experiment) return false
  
  // 作者可以查看自己的实验
  if (experiment.authorId === userId) return true
  
  // 批量获取用户在所有相关项目中的角色（优化：避免N+1）
  const projectIds = experiment.experimentProjects.map(ep => ep.projectId)
  const rolesMap = await getProjectRolesBatch(userId, projectIds)
  
  // 检查是否为项目成员
  for (const projectId of projectIds) {
    if (rolesMap.get(projectId) !== null) {
      return true
    }
  }
  
  return false
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
  const role = await getUserRole(userId)
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true
  
  // 检查是否为指定审核人
  const reviewRequest = await db.reviewRequest.findFirst({
    where: {
      experimentId,
      reviewerId: userId,
      status: 'PENDING'
    }
  })
  
  if (reviewRequest) return true
  
  // 批量获取用户在所有相关项目中的角色（优化：避免N+1）
  const projectIds = experiment.experimentProjects.map(ep => ep.projectId)
  const rolesMap = await getProjectRolesBatch(userId, projectIds)
  
  // 检查是否为项目负责人
  for (const projectId of projectIds) {
    if (rolesMap.get(projectId) === ProjectMemberRole.PROJECT_LEAD) {
      return true
    }
  }
  
  return false
}

/**
 * 检查用户是否可以解锁实验
 */
export async function canUnlockExperiment(userId: string, experimentId: string): Promise<boolean> {
  // 系统管理员可以解锁
  const role = await getUserRole(userId)
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true
  
  // 获取实验信息
  const experiment = await db.experiment.findUnique({
    where: { id: experimentId },
    include: { experimentProjects: true }
  })
  
  if (!experiment) return false
  
  // 批量获取用户在所有相关项目中的角色（优化：避免N+1）
  const projectIds = experiment.experimentProjects.map(ep => ep.projectId)
  const rolesMap = await getProjectRolesBatch(userId, projectIds)
  
  // 检查是否为项目负责人
  for (const projectId of projectIds) {
    if (rolesMap.get(projectId) === ProjectMemberRole.PROJECT_LEAD) {
      return true
    }
  }
  
  return false
}

/**
 * 检查用户是否可以上传附件
 */
export async function canUploadAttachment(userId: string, experimentId: string): Promise<boolean> {
  // 系统管理员可以上传
  const role = await getUserRole(userId)
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true
  
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
  
  // 批量获取用户在所有相关项目中的角色（优化：避免N+1）
  const projectIds = experiment.experimentProjects.map(ep => ep.projectId)
  const rolesMap = await getProjectRolesBatch(userId, projectIds)
  
  // 项目负责人可以上传
  for (const projectId of projectIds) {
    if (rolesMap.get(projectId) === ProjectMemberRole.PROJECT_LEAD) {
      return true
    }
  }
  
  return false
}

/**
 * 检查用户是否可以下载附件
 */
export async function canDownloadAttachment(userId: string, attachmentId: string): Promise<boolean> {
  // 系统管理员可以下载所有附件
  const role = await getUserRole(userId)
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true
  
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
 */
export async function isUserProjectLead(userId: string): Promise<boolean> {
  // 系统管理员总是有审核权限
  const role = await getUserRole(userId)
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true
  
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
 */
export async function canCreateExperimentInProject(userId: string, projectId: string): Promise<{
  allowed: boolean
  reason?: string
}> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { status: true, ownerId: true }
  })
  
  if (!project) {
    return { allowed: false, reason: '项目不存在' }
  }
  
  if (project.status !== 'ACTIVE') {
    return { 
      allowed: false, 
      reason: project.status === 'COMPLETED' 
        ? '项目已完成，不能创建新实验' 
        : '项目已归档，不能创建新实验'
    }
  }
  
  // 管理员可以创建
  const role = await getUserRole(userId)
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    return { allowed: true }
  }
  
  // 项目创建者可以创建
  if (project.ownerId === userId) {
    return { allowed: true }
  }
  
  // 检查项目成员权限
  const projectRole = await getProjectRole(userId, projectId)
  if (projectRole === ProjectMemberRole.PROJECT_LEAD || projectRole === ProjectMemberRole.MEMBER) {
    return { allowed: true }
  }
  
  return { allowed: false, reason: '您不是此项目的成员' }
}

/**
 * 检查用户是否可以创建实验（全局）
 */
export async function canCreateExperiment(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true
  
  const ownedProjects = await db.project.count({
    where: { ownerId: userId, status: 'ACTIVE' }
  })
  
  if (ownedProjects > 0) return true
  
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
 */
export async function canCompleteProject(userId: string, projectId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true
  
  const projectRole = await getProjectRole(userId, projectId)
  return projectRole === ProjectMemberRole.PROJECT_LEAD
}

/**
 * 检查用户是否可以解锁已结束的项目
 */
export async function canUnlockCompletedProject(userId: string, projectId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true
  
  const projectRole = await getProjectRole(userId, projectId)
  return projectRole === ProjectMemberRole.PROJECT_LEAD
}

/**
 * 检查用户是否可以归档项目
 */
export async function canArchiveProject(userId: string, projectId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true
  
  const projectRole = await getProjectRole(userId, projectId)
  return projectRole === ProjectMemberRole.PROJECT_LEAD
}

/**
 * 检查用户是否可以解锁已归档的项目
 */
export async function canUnlockArchivedProject(userId: string): Promise<boolean> {
  return isSuperAdmin(userId)
}

/**
 * 检查用户是否可以变更项目状态
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
  const projectRole = await getProjectRole(userId, projectId)
  const isProjectLeadUser = projectRole === ProjectMemberRole.PROJECT_LEAD
  const canChange = isSuperAdminUser || isAdminUser || isProjectLeadUser
  
  if (!canChange) {
    return { currentStatus: project.status, availableActions: [] }
  }
  
  switch (project.status) {
    case 'ACTIVE':
      availableActions.push({
        action: 'complete',
        label: '结束项目',
        description: '项目结束后的影响：所有实验记录将被锁定，记录真实结束时间'
      })
      break
      
    case 'COMPLETED':
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

// ==================== 项目状态与实验权限检查 ====================

/**
 * 检查实验是否可编辑（基于项目状态）
 */
export async function canEditExperimentByProjectStatus(
  experimentId: string
): Promise<{ canEdit: boolean; reason?: string }> {
  const experiment = await db.experiment.findUnique({
    where: { id: experimentId },
    include: {
      experimentProjects: {
        include: {
          project: {
            select: { id: true, name: true, status: true }
          }
        }
      }
    }
  })

  if (!experiment) {
    return { canEdit: false, reason: '实验不存在' }
  }

  for (const ep of experiment.experimentProjects) {
    if (ep.project.status === 'COMPLETED') {
      return { 
        canEdit: false, 
        reason: `项目「${ep.project.name}」已完成，实验不可编辑` 
      }
    }
    if (ep.project.status === 'ARCHIVED') {
      return { 
        canEdit: false, 
        reason: `项目「${ep.project.name}」已归档，实验不可编辑` 
      }
    }
  }

  return { canEdit: true }
}

/**
 * 检查是否可申请解锁（基于项目状态）
 */
export async function canRequestUnlockByProjectStatus(
  experimentId: string
): Promise<{ canRequest: boolean; reason?: string }> {
  const experiment = await db.experiment.findUnique({
    where: { id: experimentId },
    include: {
      experimentProjects: {
        include: {
          project: {
            select: { id: true, name: true, status: true }
          }
        }
      }
    }
  })

  if (!experiment) {
    return { canRequest: false, reason: '实验不存在' }
  }

  for (const ep of experiment.experimentProjects) {
    if (ep.project.status === 'COMPLETED') {
      return { 
        canRequest: false, 
        reason: `项目「${ep.project.name}」已完成，不可申请解锁` 
      }
    }
    if (ep.project.status === 'ARCHIVED') {
      return { 
        canRequest: false, 
        reason: `项目「${ep.project.name}」已归档，不可申请解锁` 
      }
    }
  }

  return { canRequest: true }
}

/**
 * 检查是否可提交审核（基于项目状态）
 */
export async function canSubmitReviewByProjectStatus(
  experimentId: string
): Promise<{ canSubmit: boolean; reason?: string }> {
  const experiment = await db.experiment.findUnique({
    where: { id: experimentId },
    include: {
      experimentProjects: {
        include: {
          project: {
            select: { id: true, name: true, status: true }
          }
        }
      }
    }
  })

  if (!experiment) {
    return { canSubmit: false, reason: '实验不存在' }
  }

  for (const ep of experiment.experimentProjects) {
    if (ep.project.status === 'COMPLETED') {
      return { 
        canSubmit: false, 
        reason: `项目「${ep.project.name}」已完成，不可提交审核` 
      }
    }
    if (ep.project.status === 'ARCHIVED') {
      return { 
        canSubmit: false, 
        reason: `项目「${ep.project.name}」已归档，不可提交审核` 
      }
    }
  }

  return { canSubmit: true }
}

/**
 * 检查用户是否可访问已归档项目
 */
export async function canAccessArchivedProject(
  userId: string,
  projectId: string
): Promise<{ 
  canAccess: boolean
  accessLevel: 'full' | 'readonly' | 'none'
  reason?: string 
}> {
  const role = await getUserRole(userId)

  if (!role) {
    return { canAccess: false, accessLevel: 'none', reason: '用户不存在' }
  }

  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    return { canAccess: true, accessLevel: 'full' }
  }

  const projectRole = await getProjectRole(userId, projectId)

  if (projectRole) {
    return { canAccess: true, accessLevel: 'readonly' }
  }

  return { 
    canAccess: false, 
    accessLevel: 'none', 
    reason: '已归档项目仅对项目成员可见' 
  }
}

/**
 * 检查是否可删除实验（基于项目状态）
 */
export async function canDeleteExperimentByProjectStatus(
  experimentId: string
): Promise<{ canDelete: boolean; reason?: string }> {
  const experiment = await db.experiment.findUnique({
    where: { id: experimentId },
    include: {
      experimentProjects: {
        include: {
          project: {
            select: { id: true, name: true, status: true }
          }
        }
      }
    }
  })

  if (!experiment) {
    return { canDelete: false, reason: '实验不存在' }
  }

  for (const ep of experiment.experimentProjects) {
    if (ep.project.status === 'COMPLETED') {
      return { 
        canDelete: false, 
        reason: `项目「${ep.project.name}」已完成，实验不可删除` 
      }
    }
    if (ep.project.status === 'ARCHIVED') {
      return { 
        canDelete: false, 
        reason: `项目「${ep.project.name}」已归档，实验不可删除` 
      }
    }
  }

  return { canDelete: true }
}
