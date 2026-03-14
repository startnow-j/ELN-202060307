# 文件管理模块技术文档

## 概述

文件管理模块是管理员专用的系统维护工具，用于查看服务器文件存储情况、管理上传文件、清理临时文件等。

## 权限要求

| 角色 | 可访问 |
|------|--------|
| 超级管理员 | ✅ |
| 管理员 | ✅ |
| 研究员 | ❌ |

## 功能结构

```
文件管理
├── 存储概览
│   ├── 总文件数
│   ├── 总存储大小
│   ├── 各类型文件统计
│   └── 磁盘使用率
├── 文件列表
│   ├── 按类型筛选
│   ├── 按大小排序
│   └── 搜索文件
└── 清理工具
    ├── 清理临时文件
    ├── 清理孤立文件
    └── 导出文件列表
```

## 存储结构

```
/home/z/my-project/
├── uploads/                    # 用户上传文件
│   ├── documents/             # 文档类
│   ├── images/                # 图片类
│   ├── data/                  # 数据文件
│   └── temp/                  # 临时文件
├── db/
│   └── custom.db              # SQLite数据库
└── .next/                      # Next.js编译产物（不计入）
```

## 数据模型

文件信息存储在 Attachment 表：

```prisma
model Attachment {
  id               String             @id @default(cuid())
  name             String             // 原始文件名
  type             String             // MIME类型
  size             Int                // 文件大小(字节)
  path             String             // 存储路径
  category         AttachmentCategory // 文件分类
  extractedText    String?            // 提取的文本(用于搜索)
  createdAt        DateTime           @default(now())
  
  experimentId     String             // 关联实验
  uploaderId       String             // 上传者
  reviewFeedbackId String?            // 审核附件
  
  experiment       Experiment         @relation(...)
  uploader         User               @relation(...)
  reviewFeedback   ReviewFeedback?    @relation(...)
}

enum AttachmentCategory {
  DOCUMENT      // 文档
  DATA_FILE     // 数据文件
  IMAGE         // 图片
  RAW_DATA      // 原始数据
  LOCKED_PDF    // 锁定PDF
  OTHER         // 其他
}
```

## API端点

### 获取存储统计

```
GET /api/files/stats
```

**响应**
```json
{
  "totalFiles": 150,
  "totalSize": 524288000,
  "totalSizeFormatted": "500 MB",
  "byCategory": {
    "DOCUMENT": { "count": 50, "size": 209715200 },
    "IMAGE": { "count": 30, "size": 104857600 },
    "DATA_FILE": { "count": 70, "size": 209715200 }
  },
  "diskUsage": {
    "total": 107374182400,
    "used": 52428800000,
    "free": 54945408512,
    "percentUsed": 48.8
  }
}
```

### 获取文件列表

```
GET /api/files
```

**查询参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| category | string | 按类型筛选 |
| minSize | number | 最小文件大小 |
| maxSize | number | 最大文件大小 |
| search | string | 搜索文件名 |
| sort | string | 排序字段 (size/createdAt) |
| order | string | 升序/降序 (asc/desc) |

### 清理临时文件

```
POST /api/files/cleanup
```

**请求体**
```json
{
  "action": "cleanTemp" | "cleanOrphans" | "cleanOldVersions"
}
```

## 前端组件

**文件**: `src/components/admin/FileManager.tsx`

```tsx
export function FileManager() {
  const { data: stats } = useFileStats()
  const { data: files } = useFiles()
  
  return (
    <div className="space-y-6">
      {/* 存储概览卡片 */}
      <StorageOverview stats={stats} />
      
      {/* 文件类型分布图 */}
      <FileTypeChart data={stats?.byCategory} />
      
      {/* 文件列表 */}
      <FileList files={files} />
      
      {/* 清理工具 */}
      <CleanupTools />
    </div>
  )
}
```

## 存储统计实现

```typescript
// src/app/api/files/stats/route.ts
export async function GET(request: NextRequest) {
  // 权限检查
  const userId = await getUserIdFromToken(request)
  if (!await isAdmin(userId)) {
    return NextResponse.json({ error: '权限不足' }, { status: 403 })
  }
  
  // 统计各类型文件
  const byCategory = await db.attachment.groupBy({
    by: ['category'],
    _count: { id: true },
    _sum: { size: true }
  })
  
  // 总计
  const total = await db.attachment.aggregate({
    _count: { id: true },
    _sum: { size: true }
  })
  
  // 磁盘使用（Node.js）
  const diskUsage = await getDiskUsage()
  
  return NextResponse.json({
    totalFiles: total._count.id,
    totalSize: total._sum.size,
    byCategory: formatCategoryStats(byCategory),
    diskUsage
  })
}
```

## 清理功能实现

### 清理临时文件

```typescript
async function cleanTempFiles() {
  const tempDir = path.join(process.cwd(), 'uploads', 'temp')
  
  // 删除超过24小时的临时文件
  const files = await fs.readdir(tempDir)
  const now = Date.now()
  const oneDayMs = 24 * 60 * 60 * 1000
  
  let cleaned = 0
  for (const file of files) {
    const filePath = path.join(tempDir, file)
    const stat = await fs.stat(filePath)
    
    if (now - stat.mtimeMs > oneDayMs) {
      await fs.unlink(filePath)
      cleaned++
    }
  }
  
  return { cleaned }
}
```

### 清理孤立文件

```typescript
async function cleanOrphanFiles() {
  // 查找数据库中没有记录的文件
  const uploadsDir = path.join(process.cwd(), 'uploads')
  const dbFiles = await db.attachment.findMany({
    select: { path: true }
  })
  const dbPaths = new Set(dbFiles.map(f => f.path))
  
  const physicalFiles = await getAllFiles(uploadsDir)
  
  const orphans = physicalFiles.filter(f => !dbPaths.has(f))
  
  // 删除孤立文件
  for (const file of orphans) {
    await fs.unlink(file)
  }
  
  return { cleaned: orphans.length }
}
```

## 安全考虑

1. **权限控制**: 仅管理员可访问
2. **操作审计**: 清理操作记录审计日志
3. **确认机制**: 批量删除需二次确认
4. **保护机制**: 不删除关联实验的文件

## 文件上传流程

```
用户上传 ──▶ 临时目录 ──▶ 验证文件 ──▶ 移动到永久目录 ──▶ 创建数据库记录
                │
                └── 定期清理（24小时后）
```

## 导出功能

支持导出文件清单：

```typescript
// 导出为CSV
async function exportFileList() {
  const files = await db.attachment.findMany({
    include: {
      experiment: { select: { title: true } },
      uploader: { select: { name: true } }
    }
  })
  
  const csv = files.map(f => 
    `${f.name},${f.type},${formatSize(f.size)},${f.experiment.title},${f.uploader.name},${f.createdAt}`
  ).join('\n')
  
  return csv
}
```

## 监控告警（可选扩展）

可配置存储告警：

```typescript
// 检查磁盘使用率
if (diskUsage.percentUsed > 80) {
  // 发送告警通知
  await sendAlert({
    type: 'storage_warning',
    message: `磁盘使用率已达 ${diskUsage.percentUsed}%`
  })
}
```
