# Git 恢复后启动问题解决方案

## 问题分析

每次从 git 云端恢复后出现各种问题的根本原因：

### Git 不跟踪的文件/目录

| 文件/目录 | 说明 | 恢复后状态 |
|----------|------|-----------|
| `node_modules/` | 依赖包 | ❌ 缺失 |
| `.next/` | Next.js 编译缓存 | ❌ 缺失 |
| `.env` | 环境变量 | ❌ 缺失 |
| `dev.log` | 开发日志 | ❌ 缺失（无害） |

### Git 跟踪的文件

| 文件/目录 | 说明 |
|----------|------|
| `db/custom.db` | SQLite 数据库 ✅ |
| `package.json` | 依赖配置 ✅ |
| `bun.lock` | Bun 锁文件 ✅ |
| `prisma/schema.prisma` | 数据库模型 ✅ |

## 解决方案

### 方案一：快速恢复命令（推荐）

```bash
bun run check
```

这会自动执行：
1. `bun install` - 安装依赖
2. `prisma generate` - 生成 Prisma 客户端
3. `db:push` - 同步数据库 schema

### 方案二：完整恢复脚本

```bash
bun run restore
```

或手动执行：

```bash
bash scripts/restore.sh
```

### 方案三：手动恢复步骤

```bash
# 1. 创建环境变量文件（如果缺失）
cp .env.example .env

# 2. 安装依赖
bun install

# 3. 生成 Prisma 客户端
bunx prisma generate

# 4. 同步数据库
bun run db:push

# 5. 启动开发服务器
bun run dev
```

## 自动化机制

### postinstall 钩子

已在 `package.json` 中添加：

```json
"postinstall": "prisma generate"
```

这意味着执行 `bun install` 后会自动生成 Prisma 客户端。

## 常见问题

### Q: 为什么会出现 "Prisma Client not found" 错误？

A: Prisma 客户端代码是动态生成的，存放在 `node_modules/.prisma/client`。每次恢复后需要重新生成。

### Q: 为什么数据库数据还在？

A: `db/custom.db` 数据库文件已被 Git 跟踪，所以数据会保留。

### Q: 为什么环境变量会丢失？

A: `.env` 文件包含敏感信息，不应提交到 Git。使用 `.env.example` 作为模板。

## 最佳实践

1. **提交前**：确保 `package.json` 和 `prisma/schema.prisma` 是最新的
2. **恢复后**：运行 `bun run check` 确保环境正确
3. **定期备份**：重要数据定期导出备份

## 文件清单

| 文件 | 用途 |
|------|------|
| `scripts/restore.sh` | 完整恢复脚本 |
| `.env.example` | 环境变量模板 |
| `package.json` | 包含 postinstall 钩子 |
