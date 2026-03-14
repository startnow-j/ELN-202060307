# BioLab ELN 内网部署指南

## 1. 部署环境要求

### 1.1 服务器要求

| 项目 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 2核 | 4核+ |
| 内存 | 4GB | 8GB+ |
| 磁盘 | 20GB | 50GB+ |
| 操作系统 | Linux (Ubuntu 20.04+) | Linux |

### 1.2 软件要求

| 软件 | 版本 |
|------|------|
| Node.js | 18.x+ 或 Bun |
| SQLite | 3.x |

### 1.3 网络要求

- 内网环境即可运行
- 如需使用AI功能，需能访问外部AI API（如OpenAI）

---

## 2. 安装步骤

### 2.1 安装 Bun（推荐）

```bash
# Linux/macOS
curl -fsSL https://bun.sh/install | bash

# 验证安装
bun --version
```

### 2.2 获取代码

```bash
# 克隆代码仓库
git clone https://github.com/your-org/eln.git
cd eln
```

### 2.3 安装依赖

```bash
bun install
```

### 2.4 配置环境变量

创建 `.env` 文件：

```env
# 数据库路径
DATABASE_URL=file:./db/custom.db

# JWT密钥（请生成随机字符串）
JWT_SECRET=your-random-jwt-secret-at-least-32-characters

# AI配置主密钥（64字符十六进制）
# 生成命令: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
AI_MASTER_KEY=your-64-character-hex-string-here
```

### 2.5 初始化数据库

```bash
bun run db:push
```

### 2.6 构建生产版本

```bash
bun run build
```

---

## 3. 启动服务

### 3.1 直接启动

```bash
bun run start
```

服务将在 `http://localhost:3000` 启动

### 3.2 使用 PM2 管理（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs eln
```

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'eln',
    script: '.next/standalone/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

### 3.3 开机自启动

```bash
pm2 startup
pm2 save
```

---

## 4. 反向代理配置

### 4.1 Nginx 配置

```nginx
server {
    listen 80;
    server_name eln.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 文件上传大小限制
        client_max_body_size 50M;
    }
}
```

### 4.2 Caddy 配置（自动HTTPS）

```
eln.your-domain.com {
    reverse_proxy localhost:3000
}
```

---

## 5. 数据备份

### 5.1 数据库备份

```bash
# 手动备份
cp db/custom.db backups/custom_$(date +%Y%m%d).db

# 定时备份（crontab）
0 2 * * * cp /path/to/eln/db/custom.db /path/to/backups/custom_$(date +\%Y\%m\%d).db
```

### 5.2 上传文件备份

```bash
# 备份上传目录
tar -czf uploads_$(date +%Y%m%d).tar.gz uploads/
```

### 5.3 完整备份脚本

创建 `scripts/backup.sh`：

```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
cp db/custom.db $BACKUP_DIR/db_$DATE.db

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz uploads/

# 删除30天前的备份
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

---

## 6. 系统更新

### 6.1 更新流程

```bash
# 1. 备份数据
./scripts/backup.sh

# 2. 拉取最新代码
git pull origin master

# 3. 安装依赖
bun install

# 4. 数据库迁移（如有）
bun run db:push

# 5. 重新构建
bun run build

# 6. 重启服务
pm2 restart eln
```

### 6.2 回滚流程

```bash
# 1. 停止服务
pm2 stop eln

# 2. 回滚代码
git checkout <previous-commit>

# 3. 恢复数据库
cp backups/custom_YYYYMMDD.db db/custom.db

# 4. 重新构建
bun install && bun run build

# 5. 重启服务
pm2 restart eln
```

---

## 7. 默认账号

首次部署后，系统会自动创建超级管理员账号：

| 字段 | 值 |
|------|------|
| 邮箱 | admin@biolab.com |
| 密码 | admin123 |

⚠️ **重要**：首次登录后请立即修改密码！

---

## 8. 安全建议

### 8.1 系统安全

- [ ] 修改默认管理员密码
- [ ] 配置防火墙，仅开放必要端口
- [ ] 启用 HTTPS（如果暴露到外网）
- [ ] 定期更新系统和依赖

### 8.2 数据安全

- [ ] 定期备份数据库和上传文件
- [ ] 备份文件存储到异地
- [ ] 定期测试备份恢复

### 8.3 访问控制

- [ ] 仅内网可访问
- [ ] 定期审查用户账号
- [ ] 及时禁用离职员工账号

---

## 9. AI功能配置（可选）

如需启用AI功能：

### 9.1 获取API密钥

根据选择的AI服务商，获取API密钥：
- OpenAI: https://platform.openai.com/api-keys
- DeepSeek: https://platform.deepseek.com/
- 智谱AI: https://open.bigmodel.cn/

### 9.2 配置AI服务

1. 使用超级管理员登录
2. 进入 "AI配置" 菜单
3. 添加服务商配置
4. 输入API密钥（系统自动加密存储）

### 9.3 网络要求

如果内网通过代理访问外网：

```env
# .env
HTTPS_PROXY=http://proxy.your-company.com:8080
HTTP_PROXY=http://proxy.your-company.com:8080
```

---

## 10. 常见问题

### Q: 启动报错 "Cannot find module"

```bash
# 重新安装依赖
rm -rf node_modules
bun install
```

### Q: 数据库锁定错误

```bash
# 检查是否有其他进程占用
lsof db/custom.db

# 如有，结束占用进程后重启
```

### Q: 端口被占用

```bash
# 查看端口占用
lsof -i :3000

# 结束占用进程
kill <PID>

# 或修改端口
PORT=3001 bun run start
```

---

## 11. 技术支持

- GitHub Issues: https://github.com/your-org/eln/issues
- 系统版本：v3.3.10
