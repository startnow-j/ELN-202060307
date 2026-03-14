# BioLab ELN 电子实验记录系统

## 项目简介

BioLab ELN (Electronic Lab Notebook) 是一个专业的生物实验室电子实验记录管理系统，支持实验记录的全生命周期管理、多人协作审核、项目管理等功能。

**当前版本**: v3.3.10

## 核心功能

- 📝 **实验记录管理** - 富文本编辑、附件上传、版本控制
- 🔄 **审核流程** - 提交审核、审核通过/退回、解锁申请
- 📁 **项目管理** - 项目创建、成员管理、状态跟踪
- 👥 **权限控制** - 三级角色体系（超级管理员/管理员/研究员）
- 📊 **仪表盘** - 数据统计、任务提醒
- 🔒 **安全审计** - 操作日志、数据追踪

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Next.js 16 + React 19 + TypeScript |
| UI组件 | shadcn/ui + Tailwind CSS 4 |
| 富文本编辑 | TipTap |
| 状态管理 | React Query + Zustand |
| 数据库 | Prisma ORM + SQLite |
| 运行时 | Bun |

## 快速开始

### 环境要求

- Node.js 18+ 或 Bun
- SQLite3

### 安装运行

```bash
# 安装依赖
bun install

# 初始化数据库
bun run db:push

# 启动开发服务器
bun run dev
```

### 默认账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 超级管理员 | admin@biolab.com | admin123 |

## 项目结构

```
src/
├── app/              # Next.js App Router
│   ├── page.tsx     # 主页面
│   └── api/         # API路由
├── components/       # React组件
│   ├── ui/          # 基础UI组件
│   ├── experiments/ # 实验相关组件
│   ├── projects/    # 项目相关组件
│   └── admin/       # 管理功能组件
├── lib/             # 核心库
├── hooks/           # 自定义Hooks
└── contexts/        # React Context
```

## 文档目录

| 文档 | 说明 |
|------|------|
| [系统架构](./ARCHITECTURE.md) | 技术架构和设计说明 |
| [用户手册](./USER_GUIDE.md) | 功能使用说明 |
| [部署指南](./DEPLOYMENT.md) | 系统部署说明 |
| [API文档](./API_REFERENCE.md) | API接口说明 |
| [更新日志](./CHANGELOG.md) | 版本更新记录 |

## 许可证

内部使用系统
