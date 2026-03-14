#!/bin/bash
# BioLab ELN 项目恢复脚本
# 在从 git 恢复后运行此脚本，确保项目能正常启动

set -e  # 遇到错误时退出

echo "========================================"
echo "BioLab ELN 项目恢复脚本"
echo "========================================"

# 1. 检查并创建 .env 文件
echo ""
echo "[1/5] 检查环境变量文件..."
if [ ! -f .env ]; then
    echo "创建 .env 文件..."
    cat > .env << 'EOF'
DATABASE_URL="file:./db/custom.db"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
NEXTAUTH_SECRET="your-nextauth-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
EOF
    echo "✅ .env 文件已创建"
else
    echo "✅ .env 文件已存在"
fi

# 2. 安装依赖
echo ""
echo "[2/5] 安装依赖..."
if [ ! -d "node_modules" ]; then
    echo "运行 bun install..."
    bun install
    echo "✅ 依赖安装完成"
else
    echo "✅ node_modules 已存在，跳过安装"
fi

# 3. 生成 Prisma 客户端
echo ""
echo "[3/5] 生成 Prisma 客户端..."
bunx prisma generate
echo "✅ Prisma 客户端生成完成"

# 4. 确保数据库 schema 同步
echo ""
echo "[4/5] 同步数据库 schema..."
bun run db:push
echo "✅ 数据库同步完成"

# 5. 清理可能的缓存问题
echo ""
echo "[5/5] 清理编译缓存..."
if [ -d ".next" ]; then
    rm -rf .next
    echo "✅ .next 缓存已清理"
else
    echo "✅ 无需清理"
fi

echo ""
echo "========================================"
echo "✅ 恢复完成！"
echo "========================================"
echo ""
echo "现在可以运行 'bun run dev' 启动开发服务器"
