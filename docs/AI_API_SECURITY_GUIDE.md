# AI API 安全调用指南

## 概述

本文档描述内网部署的ELN系统如何安全地调用外部AI大模型API。

## 一、安全架构

```
┌────────────────────────────────────────────────────────────────────────┐
│                        内网安全架构                                      │
│                                                                         │
│   ┌──────────┐      ┌───────────────┐      ┌───────────────────────┐   │
│   │ 内网用户  │ ──── │  ELN服务器     │ ──── │  外部AI API服务        │   │
│   │          │      │  (内网IP)      │      │  (OpenAI/Azure/其他)  │   │
│   └──────────┘      └───────┬───────┘      └───────────────────────┘   │
│                             │                                           │
│                    ┌────────▼────────┐                                  │
│                    │  安全控制层      │                                  │
│                    │  - 密钥加密存储   │                                  │
│                    │  - 请求审计日志   │                                  │
│                    │  - 内容脱敏      │                                  │
│                    │  - 调用限流      │                                  │
│                    └─────────────────┘                                  │
└────────────────────────────────────────────────────────────────────────┘
```

## 二、安全控制措施

### 2.1 API密钥管理

#### 方案对比

| 方案 | 安全等级 | 实现复杂度 | 推荐场景 |
|------|---------|-----------|---------|
| 环境变量 | ⭐⭐⭐ | 低 | 小型团队 |
| 数据库加密存储 | ⭐⭐⭐⭐ | 中 | 中型团队（推荐） |
| 专用密钥管理服务 | ⭐⭐⭐⭐⭐ | 高 | 企业级 |

#### 推荐方案：数据库加密存储

```sql
-- AI配置表
CREATE TABLE ai_config (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,        -- 'openai' | 'azure' | 'deepseek' | 'zhipu'
  api_key_encrypted TEXT NOT NULL, -- 加密后的API密钥
  api_endpoint TEXT,             -- 自定义API端点
  model_name TEXT NOT NULL,      -- 模型名称
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 数据传输安全

| 措施 | 说明 |
|------|------|
| HTTPS强制 | 所有API调用必须使用HTTPS |
| 证书验证 | 启用SSL证书验证，防止中间人攻击 |
| 请求签名 | 可选：对请求内容进行签名验证 |

### 2.3 数据隐私保护

#### 敏感信息脱敏规则

```typescript
// 发送到AI API前，自动脱敏敏感信息
const SENSITIVE_PATTERNS = [
  { pattern: /身份证号[：:]\s*\d{15,18}/g, replacement: '身份证号：***已脱敏***' },
  { pattern: /手机号[：:]\s*1[3-9]\d{9}/g, replacement: '手机号：***已脱敏***' },
  { pattern: /密码[：:]\s*\S+/g, replacement: '密码：***已脱敏***' },
  { pattern: /API[ _]?密钥[：:]\s*\S+/gi, replacement: 'API密钥：***已脱敏***' },
]
```

### 2.4 调用控制

#### 限流策略

| 控制维度 | 推荐值 | 说明 |
|---------|-------|------|
| 用户级限流 | 20次/小时 | 单用户调用频率限制 |
| 系统级限流 | 1000次/天 | 系统总调用次数限制 |
| Token限制 | 100K tokens/天 | Token消耗限制 |

#### 调用审批（可选）

```
高敏感操作 ────▶ 需要管理员审批 ────▶ 执行调用
普通操作 ────▶ 自动审批 ────▶ 执行调用
```

### 2.5 审计日志

#### 记录内容

```typescript
interface AIAuditLog {
  id: string
  userId: string           // 调用用户
  provider: string         // AI服务提供商
  model: string            // 使用的模型
  promptTokens: number     // 输入token数
  completionTokens: number // 输出token数
  requestTime: Date        // 请求时间
  responseTime: number     // 响应时间(ms)
  status: 'success' | 'failed' | 'timeout'
  errorMessage?: string    // 错误信息
  // 注意：不记录具体内容，仅记录元数据
}
```

## 三、具体实现

### 3.1 密钥加密存储

使用AES-256-GCM加密API密钥：

```typescript
// 加密
const encrypted = encrypt(apiKey, masterKey)

// 解密
const apiKey = decrypt(encrypted, masterKey)
```

### 3.2 API调用封装

```typescript
// 安全的AI调用封装
const result = await secureAICall({
  provider: 'openai',
  model: 'gpt-4',
  messages: [...],
  options: {
    sanitizeInput: true,    // 自动脱敏
    auditLog: true,         // 记录审计日志
    timeout: 30000,         // 超时控制
  }
})
```

## 四、配置管理

### 4.1 环境变量（主密钥）

```env
# .env - 主加密密钥（用于加密存储的API密钥）
AI_MASTER_KEY=your-256-bit-master-key-here
```

⚠️ **重要**：
1. 主密钥不要存储在代码库中
2. 定期轮换主密钥
3. 备份主密钥到安全位置

### 4.2 支持的AI服务

| 服务商 | API端点 | 模型示例 |
|-------|--------|---------|
| OpenAI | api.openai.com | gpt-4, gpt-4o |
| Azure OpenAI | your-resource.openai.azure.com | gpt-4 |
| DeepSeek | api.deepseek.com | deepseek-chat |
| 智谱AI | open.bigmodel.cn | glm-4 |
| 阿里云 | dashscope.aliyuncs.com | qwen-turbo |
| 百度文心 | aip.baidubce.com | ernie-bot |

## 五、安全检查清单

### 部署前检查

- [ ] API密钥已加密存储
- [ ] 主密钥已安全保存（不在代码库中）
- [ ] 启用HTTPS
- [ ] 配置调用限流
- [ ] 配置审计日志
- [ ] 敏感信息脱敏规则已启用

### 运维检查（定期）

- [ ] 检查API调用日志，确认无异常
- [ ] 检查Token消耗，确认无滥用
- [ ] 检查API密钥有效期
- [ ] 轮换主密钥（建议每季度）

## 六、应急响应

### 密钥泄露处理流程

1. **立即响应**：禁用泄露的API密钥
2. **生成新密钥**：在AI服务商控制台创建新密钥
3. **更新系统**：通过管理界面更新密钥
4. **审计追溯**：检查调用日志，确认泄露影响范围
5. **通知相关方**：如有数据泄露，按流程通知

---

*文档版本: v1.0*
*最后更新: 2024年*
