# BioLab ELN 待办事项

> 最后更新: 2025-03-09 (v3.3.8)
> 下次会话继续开发参考

---

## 一、当前开发状态

### ✅ 已完成功能

| 模块 | 功能 | 完成日期 |
|------|------|----------|
| 用户认证 | 登录/注册/登出 | v1.0 |
| 项目管理 | 项目CRUD、成员管理、文档管理 | v3.3 |
| 项目管理 | 项目关系标记（我创建/我负责/我参与） | v3.3.5 |
| 项目管理 | 全局视角切换（管理员） | v3.3.5 |
| 实验记录 | 富文本编辑器、附件管理 | v2.0 |
| 实验记录 | AI智能提取（支持.doc/.docx/.pdf） | v3.3 |
| 实验记录 | 完整度评分系统（满分100分） | v3.3 |
| 实验记录 | 全局视角切换（管理员） | v3.3.5 |
| 审核管理 | 提交审核、审核通过、要求修改 | v3.3 |
| 审核管理 | 指定审核人、转交审核 | v3.3 |
| **审核管理** | **审核历史卡片化重构** | **v3.3.7 (2025-03-07)** |
| **审核管理** | **批注附件上传与下载** | **v3.3.7 (2025-03-07)** |
| **解锁功能** | **解锁申请Tab** | **v3.3.7 (2025-03-08)** |
| **解锁功能** | **批准/拒绝解锁并记录到审核历史** | **v3.3.7 (2025-03-08)** |
| **解锁功能** | **枚举值修复（Prisma类型安全）** | **v3.3.7 (2025-03-08)** |
| **文件管理** | **孤立文件清理功能完善** | **v3.3.8 (2025-03-09)** |
| **文件管理** | **附件删除物理文件修复** | **v3.3.8 (2025-03-09)** |
| **审核管理** | **审核权限检查修复(projectMembers)** | **v3.3.8 (2025-03-09)** |
| 我的任务 | 四大Tab + 解锁申请Tab | v3.3.7 |
| 我的任务 | 全局视角切换 | v3.3.5 |

### 🔧 待修复功能

| 编号 | 模块 | 问题描述 | 优先级 | 状态 |
|------|------|----------|--------|------|
| ~~BUG-001~~ | ~~审核历史~~ | ~~审核历史界面还需要修改和优化~~ | ~~中~~ | ✅ 已完成 |
| ~~BUG-002~~ | ~~文件管理~~ | ~~审核过程中删除的文件，在文件管理中似乎没有完全删除~~ | ~~高~~ | ✅ 已修复 |

### 📋 待开发功能

| 模块 | 功能 | 优先级 | 状态 |
|------|------|--------|------|
| 锁定PDF | 审核通过后生成标准化PDF | 中 | 待开发 |
| AI项目汇总 | 多选PDF分析汇总 | 低 | 待开发 |
| 项目管理 | 分页/虚拟滚动优化 | 低 | 待开发 |

---

## 二、下次开发任务

### 2.1 高优先级任务

#### 任务1: 审核历史界面优化 (BUG-001)

**测试点**:
- [ ] 卡片布局是否美观
- [ ] 时间箭头指示是否清晰
- [ ] 批注附件下载是否正常
- [ ] 目标审核人显示是否正确
- [ ] 锁定信息显示是否完整

**优化方向**:
- 可考虑添加筛选功能
- 可考虑添加导出功能

#### 任务2: 文件删除问题排查 (BUG-002)

**测试步骤**:
1. 创建实验记录，上传附件
2. 提交审核，审核人上传批注附件
3. 删除实验记录或附件
4. 检查文件管理模块是否还有残留文件
5. 检查 upload 目录实际文件

**相关文件**:
- `src/app/api/attachments/[id]/route.ts` - 删除API
- `src/app/api/experiments/[id]/route.ts` - 删除实验时的附件处理
- `src/components/admin/FileManager.tsx` - 文件管理组件

### 2.2 中优先级任务

#### 任务3: 锁定PDF功能

**功能描述**: 审核通过后自动生成标准化PDF

**包含内容**:
- 封面（项目信息、作者、日期）
- 元数据（摘要、关键词）
- AI提取信息（试剂、仪器、参数、步骤）
- 审核历史摘要

**技术方案**: 使用 `@react-pdf/renderer` 或 `puppeteer`

---

## 三、本次会话变更文件 (v3.3.8)

| 文件路径 | 变更类型 | 说明 |
|----------|---------|------|
| `src/app/api/experiments/[id]/review/route.ts` | 修复 | 审核权限检查：members改为projectMembers |
| `src/app/api/attachments/[id]/route.ts` | 修复 | 附件删除物理文件路径添加upload/前缀 |
| `src/app/api/admin/files/orphaned/route.ts` | 完善 | 添加项目目录孤立文件清理逻辑 |
| `docs/REVIEW_HISTORY_DEVELOPMENT_GUIDE.md` | 删除 | 合并到REVIEW_MODULE.md |
| `docs/REVIEW_WORKFLOW_DEVELOPMENT_GUIDE.md` | 删除 | 合并到REVIEW_MODULE.md |
| `docs/SYSTEM_FEATURES_v3.3.md` | 更新 | 版本号更新为v3.3.8 |
| `docs/PENDING_TASKS.md` | 更新 | BUG修复记录 |

---

## 四、历史变更文件 (v3.3.7)

| 文件路径 | 变更类型 | 说明 |
|----------|---------|------|
| `src/app/api/experiments/[id]/unlock-request/route.ts` | 修复 | 枚举值修复、查询结构优化 |
| `src/app/api/unlock-requests/route.ts` | 修复 | 枚举值修复 |
| `src/components/experiments/ReviewHistory.tsx` | 重构 | 卡片化设计、批注附件显示 |
| `src/app/api/experiments/route.ts` | 修改 | 返回所有reviewRequests和attachments |
| `src/app/api/attachments/route.ts` | 修复 | PDF提取错误处理、审核人权限 |
| `src/app/api/attachments/[id]/download/route.ts` | 修复 | 路径前缀处理 |
| `src/components/tasks/MyTasks.tsx` | 完善 | 解锁申请处理对话框 |

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
1. 阅读 /home/z/my-project/docs/WORK_RULES.md
2. 阅读 /home/z/my-project/docs/PENDING_TASKS.md 了解待办事项
3. 检查开发服务器状态
4. 开始处理待修复功能
```

---

*文档维护: AI Assistant*
