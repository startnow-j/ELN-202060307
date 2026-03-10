# Turbopack 缓存损坏问题解决方案

## 问题描述

在开发过程中，Turbopack 缓存可能会损坏，导致以下错误：

```
Failed to restore task data (corrupted database or bug)
Unable to open static sorted file
Another write batch or compaction is already active
```

## 原因分析

### 1. Turbopack 内部数据库问题
Turbopack 使用嵌入式数据库（类似 RocksDB）存储编译缓存，在以下情况下可能损坏：
- 服务器异常终止（非正常关闭）
- 并发写入冲突
- 磁盘 I/O 问题

### 2. Next.js 16 + Turbopack 还较新
Turbopack 在 Next.js 15+ 成为默认选项，但仍存在一些稳定性问题。

### 3. 频繁删除 .next 目录
这会加剧缓存问题，因为可能导致数据库处于不一致状态。

## 解决方案

### 方案一：切换到 Webpack 模式（推荐用于稳定性）

```bash
# 使用 webpack 模式运行开发服务器
bun run dev:webpack
```

优点：
- Webpack 更稳定，缓存机制更成熟
- 不容易出现缓存损坏问题

缺点：
- 编译速度稍慢（但差异不大）

### 方案二：修复 Turbopack 缓存

```bash
# 运行修复脚本
bash scripts/fix-turbopack.sh
```

### 方案三：安全清理缓存

```bash
# 只清理缓存目录，不删除整个 .next
rm -rf .next/dev/cache
touch next.config.ts  # 触发重启
```

### 方案四：完全重置（最后手段）

```bash
# 完全清理并重新安装
rm -rf .next node_modules
bun install
bun run dev
```

## 最佳实践

### 1. 避免频繁删除 .next
- 只在确实需要时清理缓存
- 优先使用 `rm -rf .next/dev/cache` 而不是 `rm -rf .next`

### 2. 正确重启服务器
- 使用 Ctrl+C 正常终止服务器
- 避免强制 kill 进程

### 3. 定期维护
```bash
# 每周运行一次清理
bun run clean:cache
```

### 4. 监控服务器状态
```bash
# 检查服务器是否响应
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
```

## 配置选项

### 在 next.config.ts 中配置 Turbopack

```typescript
// 如果想完全禁用 Turbopack
const nextConfig = {
  // ... 其他配置
  // 注意：Next.js 16 默认使用 Turbopack
  // 可以通过命令行参数 --webpack 切换
}
```

## 脚本说明

| 脚本 | 用途 |
|------|------|
| `bun run dev` | 使用 Turbopack 运行开发服务器 |
| `bun run dev:webpack` | 使用 Webpack 运行开发服务器（更稳定） |
| `bun run fix-cache` | 修复 Turbopack 缓存问题 |

## 故障排除

### 问题：服务器返回 500 错误
1. 检查 dev.log 中的错误信息
2. 如果看到 "corrupted database"，运行修复脚本
3. 如果问题持续，切换到 webpack 模式

### 问题：编译速度慢
1. 检查 .next 目录大小：`du -sh .next`
2. 如果超过 500MB，考虑清理缓存
3. 重启服务器

### 问题：HMR 不工作
1. 清理 .next/dev/cache
2. 重启服务器
3. 刷新浏览器

## 相关链接

- [Next.js Turbopack 文档](https://nextjs.org/docs/app/api-reference/next-config-js/turbo)
- [Turbopack 已知问题](https://github.com/vercel/turbo/issues)
