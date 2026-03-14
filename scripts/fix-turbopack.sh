#!/bin/bash
# BioLab ELN - Turbopack 缓存修复脚本
# 当出现 Turbopack 缓存损坏时运行此脚本

set -e

echo "=== Turbopack 缓存修复 ==="

# 1. 检查是否有 lock 文件残留
if [ -f ".next/dev/lock" ]; then
    echo "发现 lock 文件，检查是否有进程占用..."
    # lock 文件存在但无进程时可以删除
fi

# 2. 只清理有问题的缓存文件，不删除整个 .next 目录
if [ -d ".next/dev/cache" ]; then
    echo "清理 Turbopack 缓存..."
    rm -rf .next/dev/cache
    echo "✅ 缓存已清理"
fi

# 3. 清理可能损坏的数据库文件
find .next/dev -name "*.sst" -type f -delete 2>/dev/null || true
find .next/dev -name "*.meta" -type f -delete 2>/dev/null || true

# 4. 触发服务器重启
echo "触发服务器重启..."
touch next.config.ts

echo ""
echo "=== 修复完成 ==="
echo "请等待几秒钟让服务器重新编译"
