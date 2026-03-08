# BioLab ELN 待办事项

> 最后更新: 2025-03-05 (v3.3.5)
> 下次会话继续开发参考

---

## 一、当前开发状态

### ✅ 已完成功能

| 模块 | 功能 | 完成日期 |
|------|------|----------|
| 用户认证 | 登录/注册/登出 | v1.0 |
| 项目管理 | 项目CRUD | v1.0 |
| 项目管理 | 成员管理 | v3.3 |
| 项目管理 | 文档管理 | v3.3 |
| 项目管理 | 状态流转 | v3.3 |
| 项目管理 | 全局视角切换（简化为2种视角） | v3.3 (2025-02-28) |
| 项目管理 | 基本信息编辑 | v3.3 (2025-02-28) |
| 项目管理 | 项目主负责人字段 | v3.3 (2025-02-28) |
| 项目管理 | 成员数正确显示 | v3.3 (2025-02-28) |
| **项目管理** | **项目关系标记细分（我创建/我负责/我参与）** | **v3.3.5 (2025-03-05)** |
| 实验记录 | 富文本编辑器 | v2.0 |
| 实验记录 | 附件管理 | v3.0 |
| 实验记录 | AI智能提取（支持.doc/.docx） | v3.3 (2025-03-02) |
| 实验记录 | 审核流程 | v3.0 |
| 实验记录 | AI评分系统（满分100分） | v3.3 (2025-03-02) |
| **实验记录** | **全局视角切换（独立数据获取）** | **v3.3.5 (2025-03-05)** |
| 我的任务 | 四大Tab | v3.3 |
| 我的任务 | 审核管理功能合并 | v3.4 (2025-03-05) |
| **我的任务** | **全局视角切换（独立数据获取）** | **v3.3.5 (2025-03-05)** |
| **系统** | **管理员默认全局视角** | **v3.3.3 (2025-03-05)** |
| **项目管理** | **允许所有用户创建项目** | **v3.3.4 (2025-03-05)** |
| **系统** | **视角切换功能修复（API参数统一）** | **v3.3.5 (2025-03-05)** |
| 模板管理 | 模板CRUD | v1.0 |

### 🔧 待完成功能

| 模块 | 功能 | 优先级 | 状态 |
|------|------|--------|------|
| 锁定PDF | 审核通过后生成PDF | 中 | 待开发 |
| AI项目汇总 | 多选PDF分析 | 低 | 待开发 |
| 项目管理 | 分页/虚拟滚动 | 低 | 待优化 |

---

## 二、下次开发任务

### 2.1 高优先级任务

#### 任务1: 全局视角功能验证（v3.5新增）
- **状态**: 刚完成开发，需用户验证
- **测试点**:
  - [ ] 管理员在"我的任务"模块可看到视角切换按钮
  - [ ] 管理员在"实验记录"模块可看到视角切换按钮
  - [ ] 切换到全局视角后显示所有用户的数据
  - [ ] 普通用户不显示视角切换按钮
  - [ ] 全局视角下卡片显示作者信息
- **相关文件**:
  - `src/components/tasks/MyTasks.tsx`
  - `src/components/experiments/ExperimentList.tsx`

#### 任务2: 项目管理模块功能验证
- **状态**: 已开发完成，需用户验证
- **测试点**:
  - [x] 项目成员数是否正确显示
  - [x] 项目主负责人是否可以编辑保存
  - [x] 视角切换是否正常工作（管理员：全局/普通，普通用户：普通）
  - [ ] 创建新项目时主负责人是否正常保存
- **相关文件**:
  - `src/components/projects/ProjectList.tsx`
  - `src/components/projects/ProjectDetail.tsx`
  - `src/components/projects/CreateProjectDialog.tsx`

#### 任务3: 我的任务模块功能验证（v3.4）
- **状态**: 已完成合并，需用户验证
- **测试点**:
  - [x] 侧边栏不再显示"审核管理"入口
  - [x] "我的任务"入口正常工作
  - [ ] 所有审核功能正常（待我审核、待我修改、已锁定）
- **相关文件**:
  - `src/components/layout/Sidebar.tsx`
  - `src/components/tasks/MyTasks.tsx`
  - `src/app/page.tsx`

### 2.2 中优先级任务

#### 任务3: 锁定PDF功能
- **描述**: 审核通过后自动生成标准化PDF
- **包含内容**:
  - 封面（项目信息、作者、日期）
  - 元数据（摘要、关键词）
  - AI提取信息（试剂、仪器、参数、步骤）
  - 审核记录
- **技术方案**: 使用 `@react-pdf/renderer` 或 `puppeteer`

#### 任务4: 项目成员角色变更通知
- **描述**: 当成员角色变更时发送系统通知
- **待确认**: 是否需要邮件/站内通知

### 2.3 低优先级任务

#### 任务5: AI项目汇总功能
- **描述**: 选择多个已锁定PDF，AI汇总分析
- **技术方案**: 使用 z-ai-web-dev-sdk 的 LLM 能力

#### 任务6: 项目列表性能优化
- **描述**: 大量项目时的分页或虚拟滚动
- **触发条件**: 项目数量 > 50

---

## 三、已知问题

### 3.1 已修复问题

| 问题 | 原因 | 修复日期 |
|------|------|----------|
| **视角切换无效（项目管理）** | **API default视角未过滤管理员数据** | **2025-03-05 (v3.3.5)** |
| **视角切换无效（实验记录）** | **组件使用AppContext数据，无法根据视角变化** | **2025-03-05 (v3.3.5)** |
| **视角切换双重请求** | **useState初始值与useEffect触发切换冲突** | **2025-03-05 (v3.3.5)** |
| **API参数不一致** | **projects用viewMode，experiments用globalView** | **2025-03-05 (v3.3.5)** |
| **只有ADMIN/SUPER_ADMIN可创建项目** | **API和前端权限限制** | **2025-03-05 (v3.3.4)** |
| **superadmin和admin全局视角数据不一致** | **API默认返回用户参与项目的数据** | **2025-03-05 (v3.3.3)** |
| 添加成员按钮无效 | onClick未绑定 | 2025-02-28 |
| 项目描述不显示 | 条件渲染问题 | 2025-02-28 |
| 基本信息编辑保存失败 | npm包名错误 + API字段处理 | 2025-02-28 |
| 项目成员数始终为0 | 使用错误的数据源 | 2025-02-28 |
| 主负责人保存失败 | Prisma客户端缓存 | 2025-02-28 |
| AI提取无法处理.doc文件 | mammoth只支持.docx | 2025-03-02 |
| AI评分满分不是100分 | 评分项总和不正确 | 2025-03-02 |
| 保存后评分变化 | 后端使用旧数据计算 | 2025-03-02 |

### 3.2 待确认问题

| 问题 | 描述 | 状态 |
|------|------|------|
| 无 | - | - |

---

## 四、代码变更摘要

### 本次会话变更的文件 (2025-03-05) - v3.3.5 视角切换功能修复

| 文件路径 | 变更类型 | 说明 |
|----------|---------|------|
| `src/components/experiments/ExperimentList.tsx` | 重构 | 独立数据获取、视角切换逻辑修复、viewMode参数统一 |
| `src/app/api/experiments/route.ts` | 修改 | 统一viewMode参数、兼容旧globalView参数 |
| `src/components/projects/ProjectList.tsx` | 修改 | 修复初始化双重请求问题、使用函数初始值 |
| `src/components/tasks/MyTasks.tsx` | 重构 | 独立数据获取、视角切换逻辑修复、并行加载优化 |
| `src/app/api/projects/route.ts` | 修改 | 修复default视角过滤逻辑、正确区分全局/普通视角 |
| `docs/PENDING_TASKS.md` | 更新 | 记录本次变更 |
| `worklog.md` | 更新 | Task ID 19 视角切换修复记录 |

### 上次会话变更的文件 (2025-03-05) - v3.3.4 项目创建权限

| 文件路径 | 变更类型 | 说明 |
|----------|---------|------|
| `src/components/tasks/MyTasks.tsx` | 修改 | 添加全局视角切换功能、Tab标签动态显示、作者信息显示 |
| `src/components/experiments/ExperimentList.tsx` | 修改 | 添加全局视角切换功能、页面标题动态描述 |
| `docs/GLOBAL_VIEW_IMPLEMENTATION_PLAN.md` | 新建 | 全局视角实施计划和影响评估报告 |
| `docs/PENDING_TASKS.md` | 更新 | 记录本次变更 |

### 上次会话变更的文件 (2025-03-05) - v3.4 模块合并

| 文件路径 | 变更类型 | 说明 |
|----------|---------|------|
| `src/components/layout/Sidebar.tsx` | 修改 | 移除"审核管理"入口 |
| `src/app/page.tsx` | 修改 | 移除 ReviewList 引用和 case 'review' 分支 |
| `src/components/experiments/ReviewList.tsx` | 废弃 | 标记为 @deprecated，保留但不再使用 |
| `docs/REVIEW_MODULE.md` | 更新 | 添加合并通知 |
| `docs/MY_TASKS_MODULE.md` | 更新 | 更新版本历史，说明合并内容 |

### 上次会话变更的文件 (2025-03-02)

| 文件路径 | 变更类型 | 说明 |
|----------|---------|------|
| `src/lib/fileParser.ts` | 修改 | 支持.doc文件解析（使用antiword） |
| `src/lib/completenessScore.ts` | 修改 | 修正评分标准为满分100分 |
| `src/app/api/attachments/route.ts` | 修改 | 支持.doc文件预览提取 |
| `src/app/api/experiments/[id]/route.ts` | 修改 | 保存时重新获取附件计算评分 |
| `src/components/experiments/ExperimentEditor.tsx` | 修改 | 更新前端评分计算逻辑 |
| `src/components/experiments/ExperimentDetail.tsx` | 修改 | 更新评分显示 |

### 上次会话变更的文件 (2025-02-28)

| 文件路径 | 变更类型 | 说明 |
|----------|---------|------|
| `prisma/schema.prisma` | 修改 | 新增 primaryLeader 字段 |
| `src/app/api/projects/route.ts` | 修改 | 新增 memberCount、primaryLeader 支持 |
| `src/app/api/projects/[id]/route.ts` | 修改 | 支持 primaryLeader 更新 |
| `src/components/projects/ProjectList.tsx` | 重构 | 简化视角切换，使用 memberCount |
| `src/components/projects/ProjectDetail.tsx` | 修改 | 新增主负责人编辑、成员数据立即获取 |
| `src/components/projects/CreateProjectDialog.tsx` | 修改 | 新增主负责人输入框 |
| `src/contexts/AppContext.tsx` | 修改 | Project 类型新增 primaryLeader、memberCount |

---

## 五、AI评分系统规则 (v3.3)

| 项目 | 分值 | 规则 |
|------|------|------|
| 标题 | 10分 | 填写即得分 |
| 摘要 | 15分 | ≥20字符得满分，否则得10分 |
| 结论 | 15分 | ≥20字符得满分，否则得10分 |
| 关联项目 | 10分 | 关联即得分，提交审核必须项 |
| 附件 | 30分 | 基础15分 + 每个附件5分（最多15分额外） |
| AI提取 | 10分 | 试剂/仪器/参数/步骤各2.5分 |
| 标签 | 10分 | 填写即得分 |
| **总计** | **100分** | ≥60分且关联项目可提交审核 |

---

## 六、测试账户

| 邮箱 | 密码 | 角色 |
|------|------|------|
| superadmin@example.com | SuperAdmin123! | SUPER_ADMIN |
| admin@example.com | admin123 | ADMIN |
| PI@example.com | PI123456! | ADMIN |
| lead@example.com | lead123 | RESEARCHER |
| researcher@example.com | Researcher123! | RESEARCHER |
| shiyan1@example.com | Shiyan1123! | RESEARCHER |
| shiyan2@example.com | Shiyan2123! | RESEARCHER |
| shiyan3@example.com | Shiyan3123! | RESEARCHER |

---

## 七、下次会话启动指令

```
请帮我执行项目恢复：
1. 阅读 /home/z/my-project/BACKUP_RESTORE.md
2. 从 https://github.com/startnow-j/test-ELN-dev.git 克隆代码
3. 安装依赖并准备好开发环境
4. 阅读 /home/z/my-project/docs/PENDING_TASKS.md 了解待办事项
```

---

*文档维护: AI Assistant*
