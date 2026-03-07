# 全局视角功能实施计划

> 版本：v3.5
> 创建日期：2025-03-05
> 状态：待实施

---

## 一、需求背景

管理员和超级管理员在以下模块需要全局视角切换功能：

1. **项目管理模块** - ✅ 已实现
2. **我的任务模块** - ❌ 待实现
3. **实验记录模块** - ⚠️ API已支持，前端待实现

---

## 二、当前状态分析

### 2.1 项目管理模块（参考实现）

**实现方式：**
- 视角类型：`default`（普通）| `global`（全局）
- API参数：`viewMode=default|global`
- 返回数据：带 `_relation` 标记（CREATED | JOINED | GLOBAL）

**关键代码：**
```typescript
// ProjectList.tsx
const [viewMode, setViewMode] = useState<ViewMode>('default')

// API调用
const res = await fetch(`/api/projects?viewMode=${mode}`)

// 视角配置
const viewModeConfig = {
  default: { label: '普通视角', description: '显示我创建和参与的项目', icon: <User /> },
  global: { label: '全局视角', description: '显示所有项目（管理员）', icon: <Globe /> },
}
```

### 2.2 我的任务模块（待实现）

**当前行为：**
| Tab | 数据来源 |
|-----|---------|
| 我的草稿 | `e.authorId === currentUser.id && e.reviewStatus === 'DRAFT'` |
| 待我审核 | 作为项目负责人的项目内的待审核实验 |
| 待我修改 | `e.reviewStatus === 'NEEDS_REVISION' && e.authorId === currentUser.id` |
| 已锁定 | `e.reviewStatus === 'LOCKED' && e.authorId === currentUser.id` |

**全局视角需求：**
| Tab | 普通视角 | 全局视角 |
|-----|---------|---------|
| 我的草稿 | 自己的草稿 | 所有用户的草稿 |
| 待我审核 | 自己负责项目的待审核 | 所有待审核实验 |
| 待我修改 | 自己被要求修改的 | 所有被要求修改的 |
| 已锁定 | 自己的已锁定 | 所有已锁定实验 |

### 2.3 实验记录模块（API已支持）

**API已支持的参数：**
```typescript
// GET /api/experiments
const globalView = searchParams.get('globalView') === 'true'
const useGlobalView = (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && globalView
```

**前端需要添加：**
- 视角切换UI
- 调用API时传递 `globalView=true` 参数

---

## 三、实施计划

### 3.1 我的任务模块

#### 3.1.1 前端修改

**文件：** `src/components/tasks/MyTasks.tsx`

**变更内容：**

1. **添加视角状态**
```typescript
type ViewMode = 'default' | 'global'
const [viewMode, setViewMode] = useState<ViewMode>('default')
const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN'
```

2. **添加视角切换UI**（在页面标题右侧）
```tsx
{isAdmin && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" className="gap-2">
        {viewMode === 'global' ? <Globe className="w-4 h-4" /> : <User className="w-4 h-4" />}
        {viewMode === 'global' ? '全局视角' : '普通视角'}
        <ChevronDown className="w-4 h-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={() => setViewMode('default')}>
        普通视角 - 显示我的任务
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setViewMode('global')}>
        全局视角 - 显示所有任务（管理员）
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)}
```

3. **修改数据过滤逻辑**
```typescript
// 我的草稿
const myDrafts = viewMode === 'global' && isAdmin
  ? experiments.filter(e => e.reviewStatus === 'DRAFT')
  : experiments.filter(e => e.reviewStatus === 'DRAFT' && e.authorId === currentUser?.id)

// 待我审核
const pendingMyReview = viewMode === 'global' && isAdmin
  ? experiments.filter(e => e.reviewStatus === 'PENDING_REVIEW')
  : experiments.filter(e => {
      if (e.reviewStatus !== 'PENDING_REVIEW') return false
      return e.projects.some(p => myProjectsAsLead.some(mp => mp.id === p.id))
    })

// 待我修改
const needsMyRevision = viewMode === 'global' && isAdmin
  ? experiments.filter(e => e.reviewStatus === 'NEEDS_REVISION')
  : experiments.filter(e => e.reviewStatus === 'NEEDS_REVISION' && e.authorId === currentUser?.id)

// 已锁定
const myLockedRecords = viewMode === 'global' && isAdmin
  ? experiments.filter(e => e.reviewStatus === 'LOCKED')
  : experiments.filter(e => e.reviewStatus === 'LOCKED' && e.authorId === currentUser?.id)
```

4. **添加作者信息显示**（全局视角下需要显示实验作者）
```tsx
{viewMode === 'global' && (
  <span>作者: {experiment.author.name}</span>
)}
```

#### 3.1.2 数据获取优化

**方案A：前端过滤（推荐）**
- 使用AppContext中的experiments数据
- 在前端根据viewMode过滤
- 优点：实现简单，无需后端修改
- 缺点：需要确保AppContext中包含所有实验数据

**方案B：后端API**
- 创建新的API端点 `/api/tasks?viewMode=global`
- 优点：数据量可控
- 缺点：需要新增API

**决策：** 采用方案A，因为AppContext已经获取了所有实验数据（管理员可见全部）

### 3.2 实验记录模块

#### 3.2.1 前端修改

**文件：** `src/components/experiments/ExperimentList.tsx`

**变更内容：**

1. **添加视角状态**
```typescript
type ViewMode = 'default' | 'global'
const [viewMode, setViewMode] = useState<ViewMode>('default')
const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN'
```

2. **修改数据获取逻辑**
```typescript
// 添加API调用状态
const [experimentsData, setExperimentsData] = useState<Experiment[]>([])
const [isLoading, setIsLoading] = useState(true)

// 根据视角获取数据
const loadExperiments = useCallback(async (mode: ViewMode) => {
  setIsLoading(true)
  try {
    const params = new URLSearchParams()
    if (mode === 'global' && isAdmin) {
      params.set('globalView', 'true')
    } else if (activeTab === 'drafts') {
      params.set('draftsOnly', 'true')
    } else {
      params.set('projectRelated', 'true')
    }
    
    const res = await fetch(`/api/experiments?${params}`)
    if (res.ok) {
      const data = await res.json()
      setExperimentsData(data)
    }
  } finally {
    setIsLoading(false)
  }
}, [activeTab, isAdmin])
```

3. **添加视角切换UI**（与项目管理模块一致）

---

## 四、影响评估

### 4.1 影响范围

| 模块 | 影响文件 | 影响程度 |
|------|---------|---------|
| 我的任务 | `src/components/tasks/MyTasks.tsx` | 中等 |
| 实验记录 | `src/components/experiments/ExperimentList.tsx` | 中等 |
| API | 无需修改 | 无 |

### 4.2 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|---------|
| 性能问题（全局视角数据量大） | 低 | 中 | 分页/虚拟滚动（已规划） |
| 权限混淆 | 低 | 高 | 明确权限边界，仅管理员可切换 |
| UI一致性 | 低 | 低 | 参考项目管理模块实现 |

### 4.3 依赖关系

```
项目管理模块（已完成）
    ↓ 参考实现
我的任务模块全局视角
    ↓
实验记录模块全局视角
```

### 4.4 与待开发功能的关系

| 待开发功能 | 关系 |
|-----------|------|
| 锁定PDF功能 | 无依赖，可并行开发 |
| AI项目汇总功能 | 无依赖，可并行开发 |
| 项目列表性能优化 | 全局视角可能增加数据量，建议先优化 |

---

## 五、测试计划

### 5.1 功能测试

| 测试项 | 测试步骤 | 预期结果 |
|--------|---------|---------|
| 普通用户不显示视角切换 | 用researcher账户登录 | 不显示视角切换按钮 |
| 管理员默认视角 | 用admin账户登录 | 默认显示全局视角（参考项目管理） |
| 视角切换 | 点击切换视角 | 数据正确切换 |
| 全局视角数据完整性 | 切换到全局视角 | 显示所有相关实验 |

### 5.2 权限测试

| 角色 | 我的任务全局视角 | 实验记录全局视角 |
|------|-----------------|-----------------|
| SUPER_ADMIN | ✅ 可用 | ✅ 可用 |
| ADMIN | ✅ 可用 | ✅ 可用 |
| RESEARCHER | ❌ 不可见 | ❌ 不可见 |

---

## 六、实施步骤

### 阶段1：我的任务模块（预估2小时）

1. 修改 `MyTasks.tsx` 添加视角状态和UI
2. 修改数据过滤逻辑
3. 添加全局视角下的作者信息显示
4. 本地测试验证

### 阶段2：实验记录模块（预估1.5小时）

1. 修改 `ExperimentList.tsx` 添加视角状态和UI
2. 修改数据获取逻辑，调用API时传递参数
3. 本地测试验证

### 阶段3：文档更新（预估0.5小时）

1. 更新 `PENDING_TASKS.md`
2. 更新 `worklog.md`

---

## 七、验收标准

- [ ] 管理员和超级管理员可见视角切换按钮
- [ ] 普通用户不显示视角切换按钮
- [ ] 切换视角后数据正确显示
- [ ] 全局视角下显示作者信息
- [ ] UI风格与项目管理模块一致
- [ ] 无控制台错误

---

## 八、回滚方案

如果出现问题，可以：
1. 移除视角切换UI代码
2. 恢复原始数据过滤逻辑
3. Git回退到实施前版本

---

*文档维护: AI Assistant*
