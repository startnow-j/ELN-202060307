# 云端开发备份与恢复指南

> 本文档用于云端沙箱开发环境的项目备份、恢复和持续开发。

---

## 📦 远程仓库信息

| 项目 | 值 |
|------|-----|
| 仓库类型 | 公开仓库 (Public) |
| 仓库 URL | https://github.com/startnow-j/test-ELN-dev.git |
| 克隆命令 | `git clone https://github.com/startnow-j/test-ELN-dev.git` |
| 当前版本标签 | v3.3 |

### 认证说明

| 操作 | 是否需要认证 |
|------|-------------|
| 克隆/拉取 | ❌ 不需要（公开仓库） |
| 推送 | ✅ 需要 GitHub Personal Access Token |

> ⚠️ **推送需要认证**：即使是公开仓库，推送代码也需要您的 GitHub PAT Token。

---

## 🔄 工作流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    每次新会话开始时                               │
│                                                                 │
│   1. AI 阅读本文档 → 了解仓库信息                                 │
│   2. 执行【恢复操作】克隆最新代码                                  │
│   3. 继续开发...                                                 │
│   4. 开发完成后执行【备份操作】推送到远程仓库                        │
│   5. 重要版本创建【版本标签】                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏷️ 版本标签管理

### 当前已创建的标签

| 标签 | 提交 | 日期 | 说明 |
|------|------|------|------|
| v3.3 | 4748df8 | 2025-02-28 | BioLab ELN v3.3 - 项目管理模块完整功能 |

### 创建新版本标签

```bash
# 创建带注释的标签
git tag -a v3.4 -m "版本说明内容"

# 推送标签到远程
git push https://YOUR_TOKEN@github.com/startnow-j/test-ELN-dev.git v3.4
```

### 查看所有标签

```bash
# 本地标签
git tag -l

# 远程标签
git ls-remote --tags https://github.com/startnow-j/test-ELN-dev.git
```

### 标签命名规范

| 标签类型 | 示例 | 用途 |
|---------|------|------|
| 主版本 | v1.0, v2.0 | 重大架构更新 |
| 次版本 | v3.1, v3.2 | 新功能添加 |
| 修复版 | v3.3.1, v3.3.2 | Bug 修复 |

---

## 🔒 分支保护规则

### 当前保护状态

| 保护项 | 状态 | 作用 |
|--------|------|------|
| 禁止强制推送 | ✅ 已启用 | 防止 `--force` 覆盖历史 |
| 禁止删除分支 | ✅ 已启用 | 防止 master 分支被误删 |

### 查看保护规则

```bash
curl -s -H "Authorization: token YOUR_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/startnow-j/test-ELN-dev/branches/master/protection
```

### 设置保护规则（需要管理员权限）

```bash
curl -X PUT \
  -H "Authorization: token YOUR_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/startnow-j/test-ELN-dev/branches/master/protection \
  -d '{
    "required_status_checks": null,
    "enforce_admins": false,
    "required_pull_request_reviews": null,
    "restrictions": null,
    "allow_force_pushes": false,
    "allow_deletions": false
  }'
```

---

## 📥 恢复操作（每次新会话开始时执行）

### 方式一：完整克隆（推荐）

```bash
# 1. 备份当前环境的关键文件（如果有需要保留的）
cp -r /home/z/my-project/src /tmp/backup_src 2>/dev/null || true

# 2. 克隆远程仓库到临时目录
cd /tmp && rm -rf test-ELN-dev
git clone https://github.com/startnow-j/test-ELN-dev.git

# 3. 将代码复制到工作目录（保留 node_modules 等）
cd /home/z/my-project
rm -rf src prisma public 2>/dev/null || true
cp -r /tmp/test-ELN-dev/src . 2>/dev/null || true
cp -r /tmp/test-ELN-dev/prisma . 2>/dev/null || true
cp -r /tmp/test-ELN-dev/public . 2>/dev/null || true

# 4. 复制其他配置文件（如果存在）
cp /tmp/test-ELN-dev/package.json . 2>/dev/null || true
cp /tmp/test-ELN-dev/tsconfig.json . 2>/dev/null || true
cp /tmp/test-ELN-dev/tailwind.config.ts . 2>/dev/null || true
cp /tmp/test-ELN-dev/next.config.ts . 2>/dev/null || true
cp /tmp/test-ELN-dev/components.json . 2>/dev/null || true
cp /tmp/test-ELN-dev/postcss.config.mjs . 2>/dev/null || true
cp /tmp/test-ELN-dev/eslint.config.mjs . 2>/dev/null || true

# 5. 安装依赖
bun install

# 6. 同步数据库（如果使用 Prisma）
bun run db:push 2>/dev/null || true
```

### 方式二：恢复到特定版本

```bash
# 克隆仓库
git clone https://github.com/startnow-j/test-ELN-dev.git /tmp/test-ELN-dev

# 切换到特定标签
cd /tmp/test-ELN-dev
git checkout v3.3

# 复制到工作目录
cd /home/z/my-project
cp -r /tmp/test-ELN-dev/src .
cp -r /tmp/test-ELN-dev/prisma .
# ... 其他文件

# 安装依赖
bun install
bun run db:push
```

---

## 📤 备份操作（开发完成后执行）

### ⚠️ 前提条件

备份需要您的 **GitHub Personal Access Token (PAT)**。

**如何获取 PAT：**
1. 登录 GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 点击 "Generate new token (classic)"
3. 勾选 `repo` 权限
4. 生成并复制 token

### 推荐方式：直接提供 Token

```bash
# 将 YOUR_TOKEN 替换为实际 token
TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
REPO_URL="https://${TOKEN}@github.com/startnow-j/test-ELN-dev.git"

cd /home/z/my-project

# 添加更改
git add .

# 提交
git commit -m "Backup: $(date '+%Y-%m-%d %H:%M:%S')"

# 推送（如果远程有更新需要先 pull）
git push $REPO_URL master

# 如果需要强制推送（谨慎使用）
git push $REPO_URL master --force
```

### 处理推送冲突

```bash
# 如果远程有新提交，先拉取
git fetch $REPO_URL master

# 查看差异
git log HEAD..FETCH_HEAD --oneline

# 方式一：变基合并
git rebase FETCH_HEAD
git push $REPO_URL master

# 方式二：强制推送（会覆盖远程历史，谨慎使用）
git push $REPO_URL master --force
```

### 创建版本标签并推送

```bash
# 创建标签
git tag -a v3.4 -m "版本说明"

# 推送标签
git push $REPO_URL v3.4
```

---

## 🔙 历史版本恢复

### 通过标签恢复

```bash
# 查看所有标签
git tag -l

# 切换到特定标签
git checkout v3.3

# 从标签创建新分支（推荐，安全恢复）
git checkout -b recovery-v3.3 v3.3

# 推送恢复分支
git push $REPO_URL recovery-v3.3
```

### 通过提交哈希恢复

```bash
# 查看提交历史
git log --oneline -20

# 切换到特定提交
git checkout <commit-hash>

# 创建恢复分支
git checkout -b recovery-<commit-hash>
```

---

## 🚀 快速指令（给 AI 使用）

### 恢复项目
```
请帮我执行项目恢复：
1. 阅读 /home/z/my-project/docs/BACKUP_RESTORE.md
2. 从 https://github.com/startnow-j/test-ELN-dev.git 克隆代码
3. 安装依赖并准备好开发环境
```

### 备份项目
```
请帮我执行项目备份：
1. 阅读 /home/z/my-project/docs/BACKUP_RESTORE.md
2. 将当前代码推送到远程仓库
3. 创建版本标签 v3.x
```

---

## ⚠️ 重要提醒

### Token 安全
1. **Token 只显示一次**：生成后立即保存
2. **不要在公开场合分享**：包括聊天、代码、文档
3. **定期轮换**：建议每 30-90 天更换
4. **及时撤销**：泄露后立即删除并重新生成

### Git 操作
1. **敏感信息**：不要将 `.env`、API keys、密码等提交到仓库
2. **大文件**：避免提交 `node_modules`、`.next`、数据库文件等（已在 .gitignore 中）
3. **提交频率**：建议每次重要功能完成后都执行备份
4. **版本标签**：重要里程碑务必打标签保护

### 强制推送注意事项
- 已启用分支保护，默认禁止 `--force` 推送
- 如需强制推送，需临时关闭保护（需要管理员权限）
- 强制推送会覆盖远程历史，谨慎使用

---

## 📋 项目文件结构

```
/home/z/my-project/
├── src/                    # 源代码目录
│   ├── app/               # Next.js App Router
│   ├── components/        # React 组件
│   ├── hooks/             # 自定义 Hooks
│   └── lib/               # 工具函数
├── prisma/                 # 数据库 Schema
├── public/                 # 静态资源
├── docs/                   # 文档目录
│   └── BACKUP_RESTORE.md  # 本文档
├── package.json           # 依赖配置
├── tsconfig.json          # TypeScript 配置
├── tailwind.config.ts     # Tailwind CSS 配置
├── next.config.ts         # Next.js 配置
└── components.json        # shadcn/ui 配置
```

---

## 🔧 .gitignore 推荐配置

```gitignore
# Dependencies
node_modules/
bun.lock

# Build
.next/
out/
build/
dist/

# Database
*.db
*.db-journal
db/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
dev.log

# Cache
.cache/
.temp/
.tmp/

# Test
coverage/
.nyc_output/

# Upload folder
upload/
```

---

## 📅 维护记录

| 日期 | 操作 | 说明 |
|------|------|------|
| 2025-02-28 | 初始化 | 创建备份恢复文档 |
| 2025-02-28 | 版本标签 | 创建 v3.3 标签 |
| 2025-02-28 | 分支保护 | 启用 master 分支保护规则 |
| 2025-02-28 | 文档更新 | 根据实际实践更新文档内容 |

---

*最后更新：2025-02-28*
