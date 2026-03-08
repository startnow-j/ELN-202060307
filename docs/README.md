# BioLab ELN 文档目录

> **当前版本**: v3.3
> **最后整理**: 2025-02-28

---

## 文档索引

### 📋 规划文档

| 文件 | 说明 | 用途 |
|------|------|------|
| [DEV_PLAN_v3.3.md](./DEV_PLAN_v3.3.md) | v3.3开发计划 | 当前版本开发任务和进度 |
| [SYSTEM_FEATURES_v3.3.md](./SYSTEM_FEATURES_v3.3.md) | 系统功能规划 | 功能架构和版本规划 |
| [PENDING_TASKS.md](./PENDING_TASKS.md) | 待办事项 | 开发进度追踪 |

### 📚 模块文档

| 文件 | 说明 | 包含内容 |
|------|------|----------|
| [USER_MANAGEMENT_MODULE.md](./USER_MANAGEMENT_MODULE.md) | 用户管理模块 | 角色体系、权限矩阵、API端点 |
| [PROJECT_MODULE.md](./PROJECT_MODULE.md) | 项目管理模块 | 数据模型、状态流转、成员管理 |
| [EXPERIMENT_MODULE.md](./EXPERIMENT_MODULE.md) | 实验记录模块 | 创建编辑、审核流程、完整度评分 |
| [REVIEW_MODULE.md](./REVIEW_MODULE.md) | 审核管理模块 | 审核状态、权限控制、审计日志 |
| [FILE_MANAGEMENT_MODULE.md](./FILE_MANAGEMENT_MODULE.md) | 文件管理模块 | 存储结构、权限控制、孤立文件处理 |
| [MY_TASKS_MODULE.md](./MY_TASKS_MODULE.md) | 我的任务模块 | 任务分类、界面设计、操作功能 |

### 🔧 运维文档

| 文件 | 说明 | 用途 |
|------|------|------|
| [WORK_RULES.md](./WORK_RULES.md) | 开发工作规则（详细版） | 会话启动、影响评估、进度保存等规则 |
| [RULES_QUICK_REF.md](./RULES_QUICK_REF.md) | 核心规则速查表（极简版） | 快速回顾，关键操作前查阅 |
| [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) | 备份恢复指南 | GitHub推送、版本标签、历史恢复 |
| [TEST_ACCOUNTS.md](./TEST_ACCOUNTS.md) | 测试账户汇总 | 各角色测试账号信息 |

### 📝 开发日志

| 文件 | 说明 | 用途 |
|------|------|------|
| [worklog.md](./worklog.md) | 项目开发记录 | 历史开发过程和决策记录 |

---

## 快速导航

### 新会话开始时
1. **阅读 [WORK_RULES.md](./WORK_RULES.md)** - 了解开发工作规则
2. 阅读 [PENDING_TASKS.md](./PENDING_TASKS.md) 了解当前进度
3. 阅读 [DEV_PLAN_v3.3.md](./DEV_PLAN_v3.3.md) 了解开发计划
4. 阅读 [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) 了解如何恢复项目

### 关键操作前（快速回顾）
- 阅读 [RULES_QUICK_REF.md](./RULES_QUICK_REF.md) - 核心规则速查

### 开发模块时
- 用户相关 → [USER_MANAGEMENT_MODULE.md](./USER_MANAGEMENT_MODULE.md)
- 项目相关 → [PROJECT_MODULE.md](./PROJECT_MODULE.md)
- 实验相关 → [EXPERIMENT_MODULE.md](./EXPERIMENT_MODULE.md)
- 审核相关 → [REVIEW_MODULE.md](./REVIEW_MODULE.md)
- 文件相关 → [FILE_MANAGEMENT_MODULE.md](./FILE_MANAGEMENT_MODULE.md)
- 任务相关 → [MY_TASKS_MODULE.md](./MY_TASKS_MODULE.md)

### 测试时
- 测试账号 → [TEST_ACCOUNTS.md](./TEST_ACCOUNTS.md)

### 备份时
- 推送流程 → [BACKUP_RESTORE.md](./BACKUP_RESTORE.md)

---

## 文档维护规则

1. **新会话开始时**：首先阅读 WORK_RULES.md 了解工作规则
2. **关键操作前**：阅读 RULES_QUICK_REF.md 快速回顾
3. **版本更新时**：更新 DEV_PLAN 和 SYSTEM_FEATURES 中的版本信息
4. **功能变更时**：更新对应模块文档的变更记录
5. **完成功能时**：更新 PENDING_TASKS 中的状态
6. **新会话结束前**：更新 worklog.md 记录开发过程
7. **工作规则优化**：发现更优工作方式时更新 WORK_RULES.md

---

## 用户提醒指令

当 AI 偏离规则时，可使用以下指令：
- **"回顾规则"** → AI 重新阅读 RULES_QUICK_REF.md
- **"检查清单"** → AI 输出当前操作的检查清单
- **"你现在应该做什么"** → AI 回顾当前阶段应执行的规则

---

*文档整理日期: 2025-02-28*
