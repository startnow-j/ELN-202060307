# 权限系统技术文档

## 概述

ELN系统采用基于角色的访问控制(RBAC)，结合项目角色实现细粒度的权限管理。

## 角色体系

### 系统角色

```typescript
enum UserRole {
  SUPER_ADMIN   // 超级管理员 - 最高权限
  ADMIN         // 管理员 - 可管理实验和用户
  RESEARCHER    // 研究员 - 基础用户
}
```

### 项目角色

```typescript
enum ProjectMemberRole {
  PROJECT_LEAD  // 项目负责人 - 可管理成员、审核实验
  MEMBER        // 成员 - 可创建实验
  VIEWER        // 观察者 - 仅查看
}
```

## 权限矩阵

| 权限 | RESEARCHER | ADMIN | SUPER_ADMIN |
|------|------------|-------|-------------|
| 创建自己的实验 | ✅ | ✅ | ✅ |
| 编辑自己的实验 | ✅ | ✅ | ✅ |
| 编辑他人实验 | ❌ | ✅ | ✅ |
| 删除自己的实验 | ✅ | ✅ | ✅ |
| 删除他人实验 | ❌ | ❌ | ✅ |
| 审核实验 | ❌ | ✅ | ✅ |
| 解锁实验 | ❌ | ✅ | ✅ |
| 全局视角 | ❌ | ✅ | ✅ |
| 用户管理 | ❌ | ✅* | ✅ |
| 项目删除 | ❌ | ❌ | ✅ |
| AI配置 | ❌ | ❌ | ✅ |

> *管理员不能管理超级管理员

## 核心实现

### 文件结构

```
src/lib/permissions.ts
```

### 权限检查函数

```typescript
// 检查是否为超级管理员
export async function isSuperAdmin(userId: string): Promise<boolean>

// 检查是否为管理员（包括超级管理员）
export async function isAdmin(userId: string): Promise<boolean>

// 检查项目权限
export async function hasProjectPermission(
  userId: string,
  projectId: string,
  permission: ProjectPermission
): Promise<boolean>

// 检查实验编辑权限
export async function canEditExperiment(
  userId: string,
  experimentId: string
): Promise<boolean>

// 检查实验审核权限
export async function canReviewExperiment(
  userId: string,
  experimentId: string
): Promise<boolean>
```

### 性能优化

使用 AsyncLocalStorage 实现请求级缓存：

```typescript
import { AsyncLocalStorage } from 'async_hooks'

interface PermissionCache {
  userRoles: Map<string, UserRole>
  projectRoles: Map<string, ProjectMemberRole | null>
}

const permissionCacheStorage = new AsyncLocalStorage<PermissionCache>()

// 在API路由中使用
export async function withPermissionCache<T>(fn: () => Promise<T>): Promise<T> {
  const cache: PermissionCache = {
    userRoles: new Map(),
    projectRoles: new Map()
  }
  return permissionCacheStorage.run(cache, fn)
}
```

### 批量查询优化

避免 N+1 查询问题：

```typescript
export async function getProjectRolesBatch(
  userId: string,
  projectIds: string[]
): Promise<Map<string, ProjectMemberRole | null>>
```

## 前端权限控制

### 角色判断 Hook

```typescript
// src/hooks/api/useAuth.ts
export function useUserRole() {
  const { data: user } = useAuth()
  return {
    role: user?.role,
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
    isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
    isResearcher: user?.role === 'RESEARCHER',
  }
}
```

### 组件级权限控制

```tsx
// 仅超级管理员可见
{isSuperAdmin && <AIConfigMenu />}

// 管理员及以上可见
{isAdmin && <UserManagementMenu />}
```

## 全局视角

管理员和超级管理员可切换视角：

- **默认视角**: 仅显示自己参与的实验
- **全局视角**: 显示所有实验

### 视角切换机制

```typescript
// API请求时传递视角参数
const viewMode = state.viewMode // 'default' | 'global'
const res = await authFetch(`/api/experiments?viewMode=${viewMode}`)
```

### 技术实现详解

#### 前端状态管理

```typescript
// src/contexts/AppContext.tsx
interface AppState {
  viewMode: 'default' | 'global'
  setViewMode: (mode: 'default' | 'global') => void
}

// 视角切换组件（Header右上角）
function ViewModeSwitch() {
  const { viewMode, setViewMode } = useApp()
  const { isAdmin } = useUserRole()
  
  if (!isAdmin) return null
  
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={viewMode === 'global'}
        onCheckedChange={(checked) => setViewMode(checked ? 'global' : 'default')}
      />
      <Label>全局视角</Label>
    </div>
  )
}
```

#### API层视角处理

```typescript
// src/app/api/experiments/route.ts
export async function GET(request: NextRequest) {
  const userId = await getUserIdFromToken(request)
  const { viewMode } = getQueryParams(request)
  
  // 验证视角权限
  const userRole = await getUserRole(userId)
  const canUseGlobal = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
  
  // 构建查询条件
  let where = {}
  
  if (viewMode === 'global' && canUseGlobal) {
    // 全局视角：无过滤
    where = {}
  } else {
    // 默认视角：仅用户参与的数据
    where = {
      OR: [
        { authorId: userId },
        {
          experimentProjects: {
            some: {
              project: {
                projectMembers: { some: { userId } }
              }
            }
          }
        }
      ]
    }
  }
  
  const experiments = await db.experiment.findMany({ where })
  return NextResponse.json(experiments)
}
```

#### React Query集成

```typescript
// src/hooks/api/useExperiments.ts
export function useExperiments(params?: { viewMode?: string }) {
  const { viewMode: contextViewMode } = useApp()
  
  // 优先使用传入的视角，否则使用上下文视角
  const effectiveViewMode = params?.viewMode ?? contextViewMode
  
  return useQuery({
    queryKey: ['experiments', effectiveViewMode],
    queryFn: () => authFetch(`/api/experiments?viewMode=${effectiveViewMode}`),
    // 视角切换时重新请求
    enabled: true,
  })
}
```

### 各模块视角过滤规则

| 模块 | 默认视角过滤条件 | 全局视角 |
|------|-----------------|---------|
| 实验记录 | authorId = userId OR 项目成员 | 无过滤 |
| 项目管理 | ownerId = userId OR 项目成员 | 无过滤 |
| 待审核 | 指定审核人 OR 项目负责人 | 无过滤（所有待审核） |
| 解锁申请 | requesterId = userId | 无过滤（所有待处理） |

### 视角与权限的关系

> **重要**: 视角只影响数据可见范围，不改变操作权限

**示例**：
- 全局视角下，管理员可以看到所有实验
- 但仍只能编辑自己有权限编辑的实验
- 不能编辑他人已锁定的实验

### 性能优化

```typescript
// 视角相关的查询可以缓存
const CACHE_KEY_PREFIX = 'viewmode:'

async function getCachedViewModeData(userId: string, viewMode: string) {
  const cacheKey = `${CACHE_KEY_PREFIX}${userId}:${viewMode}`
  // ... 缓存逻辑
}

// 视角切换时清除相关缓存
function clearViewModeCache(userId: string) {
  // 清除该用户所有视角相关的缓存
}
```

## 权限检查最佳实践

### API层

```typescript
// 每个API路由都应验证权限
export async function POST(request: NextRequest) {
  const userId = await getUserIdFromToken(request)
  
  // 1. 检查登录状态
  if (!userId) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }
  
  // 2. 检查操作权限
  const canDo = await canEditExperiment(userId, experimentId)
  if (!canDo) {
    return NextResponse.json({ error: '权限不足' }, { status: 403 })
  }
  
  // 3. 执行操作
  // ...
}
```

### 数据库查询

```typescript
// 根据视角过滤数据
if (viewMode === 'global' && (await isAdmin(userId))) {
  // 管理员全局视角：返回所有数据
  experiments = await db.experiment.findMany({ ... })
} else {
  // 默认视角：仅返回用户参与的项目的实验
  experiments = await db.experiment.findMany({
    where: {
      OR: [
        { authorId: userId },
        { experimentProjects: { some: { project: { ... } } } }
      ]
    }
  })
}
```

## 审计日志

敏感操作记录审计日志：

```typescript
await db.auditLog.create({
  data: {
    userId,
    action: AuditAction.APPROVE,
    entityType: 'Experiment',
    entityId: experimentId,
    details: JSON.stringify({ action: 'approve', feedback })
  }
})
```
