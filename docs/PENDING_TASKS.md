# BioLab ELN 待办事项

> 最后更新: 2025-02-28
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
| 实验记录 | 富文本编辑器 | v2.0 |
| 实验记录 | 附件管理 | v3.0 |
| 实验记录 | AI智能提取 | v3.0 |
| 实验记录 | 审核流程 | v3.0 |
| 我的任务 | 四大Tab | v3.3 |
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

#### 任务1: 项目管理模块功能验证
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

### 2.2 中优先级任务

#### 任务2: 锁定PDF功能
- **描述**: 审核通过后自动生成标准化PDF
- **包含内容**:
  - 封面（项目信息、作者、日期）
  - 元数据（摘要、关键词）
  - AI提取信息（试剂、仪器、参数、步骤）
  - 审核记录
- **技术方案**: 使用 `@react-pdf/renderer` 或 `puppeteer`

#### 任务3: 项目成员角色变更通知
- **描述**: 当成员角色变更时发送系统通知
- **待确认**: 是否需要邮件/站内通知

### 2.3 低优先级任务

#### 任务4: AI项目汇总功能
- **描述**: 选择多个已锁定PDF，AI汇总分析
- **技术方案**: 使用 z-ai-web-dev-sdk 的 LLM 能力

#### 任务5: 项目列表性能优化
- **描述**: 大量项目时的分页或虚拟滚动
- **触发条件**: 项目数量 > 50

---

## 三、已知问题

### 3.1 已修复问题

| 问题 | 原因 | 修复日期 |
|------|------|----------|
| 添加成员按钮无效 | onClick未绑定 | 2025-02-28 |
| 项目描述不显示 | 条件渲染问题 | 2025-02-28 |
| 基本信息编辑保存失败 | npm包名错误 + API字段处理 | 2025-02-28 |
| 项目成员数始终为0 | 使用错误的数据源 | 2025-02-28 |
| 主负责人保存失败 | Prisma客户端缓存 | 2025-02-28 |

### 3.2 待确认问题

| 问题 | 描述 | 状态 |
|------|------|------|
| 无 | - | - |

---

## 四、代码变更摘要

### 本次会话变更的文件

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

## 五、测试账户

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

## 六、下次会话启动指令

```
请帮我执行项目恢复：
1. 阅读 /home/z/my-project/BACKUP_RESTORE.md
2. 从 https://github.com/startnow-j/test-ELN-dev.git 克隆代码
3. 安装依赖并准备好开发环境
4. 阅读 /home/z/my-project/docs/PENDING_TASKS.md 了解待办事项
```

---

*文档维护: AI Assistant*
