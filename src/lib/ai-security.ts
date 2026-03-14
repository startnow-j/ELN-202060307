/**
 * AI API 安全调用模块
 * 
 * 功能：
 * 1. API密钥加密存储
 * 2. 安全的API调用封装
 * 3. 敏感信息脱敏
 * 4. 调用限流控制
 * 5. 审计日志
 */

import crypto from 'crypto'
import { db } from '@/lib/db'
import { AuditAction } from '@prisma/client'

// ============================================================
// 第一部分：密钥加密管理
// ============================================================

/**
 * 从环境变量获取主密钥
 * 主密钥用于加密存储在数据库中的API密钥
 */
function getMasterKey(): Buffer {
  const masterKeyHex = process.env.AI_MASTER_KEY
  
  if (!masterKeyHex) {
    throw new Error('AI_MASTER_KEY not configured. Please set it in environment variables.')
  }
  
  // 主密钥应该是64字符的十六进制字符串（32字节 = 256位）
  if (masterKeyHex.length !== 64) {
    throw new Error('AI_MASTER_KEY must be a 64-character hex string (32 bytes)')
  }
  
  return Buffer.from(masterKeyHex, 'hex')
}

/**
 * 加密API密钥
 * 使用AES-256-GCM算法
 */
export function encryptApiKey(plainApiKey: string): string {
  const masterKey = getMasterKey()
  
  // 生成随机IV（初始化向量）
  const iv = crypto.randomBytes(12) // GCM推荐使用12字节IV
  
  // 创建加密器
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv)
  
  // 加密
  const encrypted = Buffer.concat([
    cipher.update(plainApiKey, 'utf8'),
    cipher.final()
  ])
  
  // 获取认证标签
  const authTag = cipher.getAuthTag()
  
  // 组合：IV + 认证标签 + 加密数据（Base64编码）
  const combined = Buffer.concat([iv, authTag, encrypted])
  return combined.toString('base64')
}

/**
 * 解密API密钥
 */
export function decryptApiKey(encryptedApiKey: string): string {
  const masterKey = getMasterKey()
  
  // Base64解码
  const combined = Buffer.from(encryptedApiKey, 'base64')
  
  // 提取各部分
  const iv = combined.subarray(0, 12)
  const authTag = combined.subarray(12, 28)
  const encrypted = combined.subarray(28)
  
  // 创建解密器
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv)
  decipher.setAuthTag(authTag)
  
  // 解密
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ])
  
  return decrypted.toString('utf8')
}

// ============================================================
// 第二部分：敏感信息脱敏
// ============================================================

interface SensitivePattern {
  pattern: RegExp
  replacement: string
  description: string
}

/**
 * 敏感信息脱敏规则
 */
const SENSITIVE_PATTERNS: SensitivePattern[] = [
  // 身份证号
  {
    pattern: /身份证\s*[号号码：:]*\s*[\dXx]{15,18}/g,
    replacement: '身份证号：***已脱敏***',
    description: '身份证号'
  },
  // 手机号
  {
    pattern: /手机\s*[号码：:]*\s*1[3-9]\d{9}/g,
    replacement: '手机号：***已脱敏***',
    description: '手机号'
  },
  // 邮箱
  {
    pattern: /[\w.-]+@[\w.-]+\.\w{2,}/g,
    replacement: '***@***.***',
    description: '邮箱地址'
  },
  // 密码
  {
    pattern: /密码\s*[：:]*\s*\S+/g,
    replacement: '密码：***已脱敏***',
    description: '密码'
  },
  // API密钥格式
  {
    pattern: /sk-[a-zA-Z0-9]{20,}/g,
    replacement: 'sk-***已脱敏***',
    description: 'API密钥'
  },
  // 银行卡号
  {
    pattern: /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g,
    replacement: '****-****-****-****',
    description: '银行卡号'
  },
]

/**
 * 对输入内容进行脱敏处理
 */
export function sanitizeInput(content: string): {
  sanitized: string
  sanitizedItems: string[]
} {
  let sanitized = content
  const sanitizedItems: string[] = []
  
  for (const rule of SENSITIVE_PATTERNS) {
    const matches = content.match(rule.pattern)
    if (matches && matches.length > 0) {
      sanitized = sanitized.replace(rule.pattern, rule.replacement)
      sanitizedItems.push(`${rule.description}: ${matches.length}处`)
    }
  }
  
  return { sanitized, sanitizedItems }
}

// ============================================================
// 第三部分：调用限流控制
// ============================================================

interface RateLimitConfig {
  userLimit: number      // 用户每小时限制
  systemLimit: number    // 系统每日限制
  tokenLimit: number     // 每日Token限制
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  userLimit: 20,         // 每用户每小时20次
  systemLimit: 1000,     // 系统每日1000次
  tokenLimit: 100000,    // 每日100K tokens
}

/**
 * 检查是否超过调用限制
 */
export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): Promise<{
  allowed: boolean
  reason?: string
  remaining?: { user: number; system: number }
}> {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // 检查用户级限流
  const userCalls = await db.auditLog.count({
    where: {
      userId,
      action: AuditAction.AI_CALL,
      createdAt: { gte: oneHourAgo }
    }
  })
  
  if (userCalls >= config.userLimit) {
    return {
      allowed: false,
      reason: `用户调用次数超限（每小时${config.userLimit}次）`
    }
  }
  
  // 检查系统级限流
  const systemCalls = await db.auditLog.count({
    where: {
      action: AuditAction.AI_CALL,
      createdAt: { gte: todayStart }
    }
  })
  
  if (systemCalls >= config.systemLimit) {
    return {
      allowed: false,
      reason: `系统调用次数超限（每日${config.systemLimit}次）`
    }
  }
  
  return {
    allowed: true,
    remaining: {
      user: config.userLimit - userCalls,
      system: config.systemLimit - systemCalls
    }
  }
}

// ============================================================
// 第四部分：审计日志
// ============================================================

export interface AICallAuditParams {
  userId: string
  provider: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  responseTime: number
  status: 'success' | 'failed' | 'timeout'
  errorMessage?: string
  sanitizedItems?: string[]
}

/**
 * 记录AI调用审计日志
 */
export async function logAICall(params: AICallAuditParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: AuditAction.AI_CALL,
        entityType: 'AI_REQUEST',
        entityId: `${params.provider}-${params.model}-${Date.now()}`,
        details: JSON.stringify({
          provider: params.provider,
          model: params.model,
          promptTokens: params.promptTokens,
          completionTokens: params.completionTokens,
          totalTokens: params.totalTokens,
          responseTime: params.responseTime,
          status: params.status,
          errorMessage: params.errorMessage,
          sanitizedItems: params.sanitizedItems,
          // 注意：不记录具体内容，保护隐私
        })
      }
    })
  } catch (error) {
    console.error('Failed to log AI call audit:', error)
    // 审计日志失败不应影响主流程
  }
}

// ============================================================
// 第五部分：安全的AI调用封装
// ============================================================

export interface SecureAICallParams {
  userId: string
  provider: string      // 'openai' | 'azure' | 'deepseek' | 'zhipu'
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
    sanitizeInput?: boolean    // 是否脱敏输入，默认true
    timeout?: number           // 超时时间(ms)，默认30000
  }
}

export interface SecureAICallResult {
  success: boolean
  content?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  error?: string
  sanitizedItems?: string[]
}

/**
 * 获取AI配置
 */
async function getAIConfig(provider: string): Promise<{
  apiKey: string
  endpoint: string
  model: string
} | null> {
  // 查询数据库中的配置
  const config = await db.aIConfig.findFirst({
    where: {
      provider,
      isActive: true
    }
  })
  
  if (!config) {
    return null
  }
  
  return {
    apiKey: decryptApiKey(config.apiKeyEncrypted),
    endpoint: config.apiEndpoint || getDefaultEndpoint(provider),
    model: config.modelName
  }
}

/**
 * 获取默认API端点
 */
function getDefaultEndpoint(provider: string): string {
  const endpoints: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    deepseek: 'https://api.deepseek.com/v1',
    zhipu: 'https://open.bigmodel.cn/api/paas/v4',
    aliyun: 'https://dashscope.aliyuncs.com/api/v1',
  }
  return endpoints[provider] || ''
}

/**
 * 安全的AI API调用
 */
export async function secureAICall(params: SecureAICallParams): Promise<SecureAICallResult> {
  const startTime = Date.now()
  const { userId, provider, messages, options = {} } = params
  const {
    model: customModel,
    temperature = 0.7,
    maxTokens = 2000,
    sanitizeInput = true,
    timeout = 30000
  } = options
  
  let sanitizedItems: string[] = []
  
  try {
    // 1. 检查调用限制
    const rateLimit = await checkRateLimit(userId)
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: rateLimit.reason
      }
    }
    
    // 2. 获取AI配置
    const config = await getAIConfig(provider)
    if (!config) {
      return {
        success: false,
        error: `AI服务 "${provider}" 未配置或未激活`
      }
    }
    
    const model = customModel || config.model
    
    // 3. 敏感信息脱敏
    const processedMessages = sanitizeInput
      ? messages.map(msg => {
          const result = sanitizeInput(msg.content)
          if (result.sanitizedItems.length > 0) {
            sanitizedItems.push(...result.sanitizedItems)
          }
          return { ...msg, content: result.sanitized }
        })
      : messages
    
    // 4. 调用AI API
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(`${config.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: processedMessages,
        temperature,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    // 5. 处理响应
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `API错误: ${response.status}`
      
      await logAICall({
        userId,
        provider,
        model,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        responseTime: Date.now() - startTime,
        status: 'failed',
        errorMessage,
        sanitizedItems
      })
      
      return {
        success: false,
        error: errorMessage,
        sanitizedItems
      }
    }
    
    const data = await response.json()
    const usage = data.usage || {}
    
    // 6. 记录审计日志
    await logAICall({
      userId,
      provider,
      model,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      responseTime: Date.now() - startTime,
      status: 'success',
      sanitizedItems
    })
    
    return {
      success: true,
      content: data.choices?.[0]?.message?.content || '',
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0
      },
      sanitizedItems
    }
    
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError'
    
    await logAICall({
      userId,
      provider,
      model: customModel || 'unknown',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      responseTime: Date.now() - startTime,
      status: isTimeout ? 'timeout' : 'failed',
      errorMessage: error instanceof Error ? error.message : '未知错误',
      sanitizedItems
    })
    
    return {
      success: false,
      error: isTimeout ? '请求超时' : (error instanceof Error ? error.message : '调用失败'),
      sanitizedItems
    }
  }
}

// ============================================================
// 工具函数：生成主密钥
// ============================================================

/**
 * 生成新的主密钥（用于初始化配置）
 * 返回64字符的十六进制字符串
 */
export function generateMasterKey(): string {
  return crypto.randomBytes(32).toString('hex')
}
