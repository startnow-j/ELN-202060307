# BioLab ELN 进展快照

> 保存日期: 2025-02-26
> 版本: v3.0 核心重构
> 
> **请将此文件保存到您的本地电脑，用于灾难恢复**

---

## 一、当前版本状态

### 已完成
- v1.0 MVP: 基础CRUD功能 ✅
- v2.0 富文本编辑器 ✅

### 待重建 (本次快照内容)
- v3.0 核心重构: AI提取 + 审核流程 + 轻量级预览

---

## 二、数据库模型变更

### 需要添加到 prisma/schema.prisma:

```prisma
// ==================== 新增枚举 ====================

// 审核状态
enum ReviewStatus {
  DRAFT           // 草稿（可编辑）
  PENDING_REVIEW  // 待审核
  NEEDS_REVISION  // 需要修改
  LOCKED          // 已锁定（审核通过）
}

// AI提取状态
enum ExtractionStatus {
  PENDING    // 待提取
  PROCESSING // 提取中
  COMPLETED  // 已完成
  FAILED     // 提取失败
}

// 审核操作
enum ReviewAction {
  APPROVE          // 通过
  REQUEST_REVISION // 要求修改
}

// 附件分类
enum AttachmentCategory {
  DOCUMENT   // 文档（Word, PDF, Markdown, LaTeX）
  DATA_FILE  // 数据文件（Excel, CSV）
  IMAGE      // 图片
  RAW_DATA   // 原始数据（仪器导出等）
  LOCKED_PDF // 锁定后生成的PDF
  OTHER      // 其他
}

// ==================== 修改 Experiment 模型 ====================
// 将原有 Experiment 模型替换为:

model Experiment {
  id          String          @id @default(cuid())
  title       String
  
  // 核心内容 - 简化为基础字段
  summary     String?         // 实验摘要（用户填写或AI生成）
  conclusion  String?         // 结论
  
  // AI提取的信息（JSON格式）
  extractedInfo   String?     // AI提取的结构化信息
  extractionStatus ExtractionStatus @default(PENDING)
  extractionError String?     // 提取失败原因
  
  // 审核相关
  reviewStatus    ReviewStatus @default(DRAFT)
  completenessScore Int       @default(0)  // 完整度评分 0-100
  
  // 元数据
  tags        String?         // 标签（逗号分隔）
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  submittedAt DateTime?       // 提交审核时间
  reviewedAt  DateTime?       // 审核时间
  
  // 关联
  authorId    String
  author      User            @relation(fields: [authorId], references: [id])
  experimentProjects ExperimentProject[]
  attachments Attachment[]
  reviewFeedbacks ReviewFeedback[]
  versions    ExperimentVersion[]

  @@map("experiments")
}

// ==================== 新增 ReviewFeedback 模型 ====================

model ReviewFeedback {
  id          String       @id @default(cuid())
  action      ReviewAction
  feedback    String?      // 审核意见
  createdAt   DateTime     @default(now())

  experimentId String
  experiment   Experiment  @relation(fields: [experimentId], references: [id], onDelete: Cascade)
  reviewerId   String
  reviewer     User        @relation(fields: [reviewerId], references: [id])

  @@map("review_feedbacks")
}

// ==================== 修改 Attachment 模型 ====================
// 将原有 Attachment 模型替换为:

model Attachment {
  id            String              @id @default(cuid())
  name          String            // 原始文件名
  type          String            // MIME类型
  size          Int               // 文件大小（字节）
  path          String            // 存储路径
  category      AttachmentCategory @default(DOCUMENT)  // 文件分类
  extractedText String?           // 轻量级预览数据（JSON）
  createdAt     DateTime          @default(now())

  experimentId  String
  experiment    Experiment @relation(fields: [experimentId], references: [id], onDelete: Cascade)

  uploaderId    String
  uploader      User      @relation(fields: [uploaderId], references: [id])

  @@map("attachments")
}

// ==================== 修改 User 模型 ====================
// 在 User 模型中添加:

  reviewFeedbacks ReviewFeedback[]  // 审核反馈
  // 并修改 AuditAction 枚举添加:

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  LOGIN
  LOGOUT
  SUBMIT_REVIEW   // 提交审核
  APPROVE         // 审核通过
  REQUEST_REVISION // 要求修改
}
```

---

## 三、核心工作流程（完整版）

```
┌─────────────────────────────────────────────────────────────┐
│                    实验记录录入阶段                          │
├─────────────────────────────────────────────────────────────┤
│  1. 填写必填字段（标题、日期、实验类型、关联项目）             │
│  2. 添加附件                                                 │
│     ├── 主要文件（Word/PDF/Markdown/Excel/LaTeX）            │
│     └── 原始附件（其他格式）                                  │
│  3. 附件预览（仅特定格式支持轻量级预览）                       │
│  4. 保存草稿 → 附件保存到系统                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    AI智能提取阶段                            │
├─────────────────────────────────────────────────────────────┤
│  5. 用户选择特定附件 → 触发AI智能提取                         │
│  6. AI提取结果展示（试剂、仪器、参数等）                       │
│  7. 用户编辑确认 或 手动填写实验结论等信息                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      审核流程阶段                            │
├─────────────────────────────────────────────────────────────┤
│  8. 提交审核                                                 │
│  9. PI审核 → 反馈修改意见 / 通过                              │
│ 10. 如需修改 → 返回修改 → 重新提交                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     锁定归档阶段                             │
├─────────────────────────────────────────────────────────────┤
│  11. 审核通过 → 锁定 → 自动生成标准化PDF（含时间戳）           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    项目汇总分析阶段                          │
├─────────────────────────────────────────────────────────────┤
│  12. 项目内多选锁定PDF → AI汇总分析                           │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 附件预览规则

| 格式 | 预览方式 | 提取内容 |
|------|----------|----------|
| Word (.docx) | 轻量级预览 | 页数、段落数、字符数、前500字符摘要 |
| PDF (.pdf) | 轻量级预览 | 页数、字符数、前500字符摘要 |
| Excel (.xlsx) | 轻量级预览 | Sheet列表、行列数、表头、前5行数据 |
| Markdown (.md) | 轻量级预览 | 字符数、前500字符摘要 |
| LaTeX (.tex) | 轻量级预览 | 字符数、前500字符摘要 |
| 其他格式 | 仅显示基本信息 | 文件类型、大小 |

### 3.2 锁定PDF结构

```
锁定PDF结构
│
├── 封面页
│   ├── 实验记录标题
│   ├── 项目名称
│   ├── 实验日期
│   ├── 作者 + 审核人
│   └── 锁定时间戳（数字签名/水印）
│
├── 元数据页
│   ├── 实验目的
│   ├── 实验类型
│   ├── 结论
│   ├── 标签
│   └── 关联项目
│
├── AI提取信息页（如有）
│   ├── 试剂列表
│   ├── 仪器设备
│   ├── 关键参数
│   └── 实验步骤
│
├── 正文内容（合并关键文件）
│   ├── 实验记录正文 → PDF
│   ├── 数据表格 → PDF
│   └── 图片附录
│
├── 原始文件清单页
│   ├── 已合并文件列表
│   └── 未合并原始文件（仪器格式等）
│
└── 审核记录页
    ├── 提交时间
    ├── 审核时间
    └── 审核意见
```

---

## 四、AI提取信息结构

```typescript
interface ExtractedInfo {
  // 实验目的
  purpose?: string
  
  // 试剂列表
  reagents?: Array<{
    name: string          // 试剂名称
    specification?: string // 规格
    batch?: string        // 批号
    manufacturer?: string // 厂家
    amount?: string       // 用量
  }>
  
  // 仪器设备
  instruments?: Array<{
    name: string          // 仪器名称
    model?: string        // 型号
    equipmentId?: string  // 设备编号
  }>
  
  // 关键参数
  parameters?: Array<{
    name: string          // 参数名称
    value: string         // 参数值
    unit?: string         // 单位
  }>
  
  // 实验步骤
  steps?: string[]
  
  // 安全注意事项
  safetyNotes?: string[]
  
  // 实验结论
  conclusion?: string
  
  // 原始摘要
  rawSummary?: string
}
```

---

## 五、API路由设计

### 需要创建的API:

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/attachments` | GET | 获取附件列表 |
| `/api/attachments` | POST | 上传附件 + 轻量级预览提取 |
| `/api/attachments/[id]` | DELETE | 删除附件 |
| `/api/attachments/[id]/download` | GET | 下载附件 |
| `/api/experiments/[id]/extract` | POST | AI智能提取 |
| `/api/experiments/[id]/submit` | POST | 提交审核 |
| `/api/experiments/[id]/review` | POST | 审核操作 |

---

## 六、前端组件设计

### 需要创建的组件:

| 组件 | 文件路径 | 功能 |
|------|----------|------|
| AttachmentManager | src/components/attachments/AttachmentManager.tsx | 附件管理 + 上传入口 |
| FilePreviewDialog | src/components/attachments/FilePreviewDialog.tsx | 轻量级预览对话框 |
| ExtractedInfoPanel | src/components/experiments/ExtractedInfoPanel.tsx | AI提取结果展示/编辑 |
| ReviewList | src/components/experiments/ReviewList.tsx | 审核管理列表 |

### 需要修改的组件:

| 组件 | 修改内容 |
|------|----------|
| ExperimentEditor | 重构为极简录入 + 附件上传模式 |
| Sidebar | 添加审核管理入口 |
| AppContext | 添加新类型定义和方法 |

---

## 七、完整度评分规则

| 评分项 | 分值 | 评分标准 |
|--------|------|----------|
| 标题 | 10分 | 有内容即得分 |
| 实验日期 | 10分 | 已填写 |
| 实验类型 | 10分 | 已选择 |
| 关联项目 | 10分 | 已关联 |
| 摘要 | 15分 | ≥20字符得满分 |
| 结论 | 15分 | ≥20字符得满分 |
| AI提取信息 | 20分 | 试剂(5)+仪器(5)+参数(5)+步骤(5) |
| 附件 | 10分 | 至少一个附件 |

---

## 八、测试账户

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@example.com | admin123 |
| 项目负责人 | lead@example.com | lead123 |
| 研究员 | researcher@example.com | research123 |

---

## 九、依赖包

需要安装的包:
```bash
bun add mammoth xlsx pdf-parse
```

---

## 十、恢复指令

如果您看到此文件，说明发生了版本回退。恢复步骤：

1. 将此文件上传到对话中
2. AI将根据此快照重建:
   - 更新数据库模型
   - 创建API路由
   - 创建前端组件
   - 更新AppContext

---

*快照版本: v3.0-2025-02-26*
