/**
 * 实验完整度评分计算函数
 * v3.3 评分标准（满分100分）：
 * - 标题 10分 - 填写即得分
 * - 摘要 15分 - ≥20字符得满分，否则得10分
 * - 结论 15分 - ≥20字符得满分，否则得10分
 * - 关联项目 10分 - 关联即得分
 * - 附件 30分 - 基础15分 + 每个附件5分（最多15分额外）
 * - AI提取 10分 - 试剂/仪器/参数/步骤各2.5分
 * - 标签 10分 - 填写即得分
 * 
 * 总计：10+15+15+10+30+10+10 = 100分
 */

export interface CompletenessScoreInput {
  title?: string | null
  summary?: string | null
  conclusion?: string | null
  tags?: string | null
  extractedInfo?: string | null
  attachments?: unknown[]
  experimentProjects?: unknown[]
  hasAttachments?: boolean
  hasProjects?: boolean
}

export function calculateCompletenessScore(data: CompletenessScoreInput): number {
  let score = 0

  // 标题 (10分) - 填写即得分
  if (data.title && data.title.trim().length > 0) {
    score += 10
  }

  // 摘要 (15分) - ≥20字符得满分，否则得10分
  if (data.summary && data.summary.trim().length >= 20) {
    score += 15
  } else if (data.summary && data.summary.trim().length > 0) {
    score += 10
  }

  // 结论 (15分) - ≥20字符得满分，否则得10分
  if (data.conclusion && data.conclusion.trim().length >= 20) {
    score += 15
  } else if (data.conclusion && data.conclusion.trim().length > 0) {
    score += 10
  }

  // 关联项目 (10分) - 关联即得分
  const hasProjects = data.experimentProjects?.length > 0 || data.hasProjects
  if (hasProjects) {
    score += 10
  }

  // 附件 (30分) - 基础15分 + 每个附件5分（最多15分额外）
  const attachmentCount = data.attachments?.length || 0
  if (attachmentCount > 0 || data.hasAttachments) {
    score += 15 // 基础分
    if (attachmentCount > 0) {
      score += Math.min(15, attachmentCount * 5) // 每个附件5分，最多15分
    }
  }

  // AI提取信息 (10分) - 试剂/仪器/参数/步骤各2.5分
  if (data.extractedInfo) {
    try {
      const info = typeof data.extractedInfo === 'string' 
        ? JSON.parse(data.extractedInfo) 
        : data.extractedInfo
      if (info.reagents && info.reagents.length > 0) score += 2.5
      if (info.instruments && info.instruments.length > 0) score += 2.5
      if (info.parameters && info.parameters.length > 0) score += 2.5
      if (info.steps && info.steps.length > 0) score += 2.5
    } catch {
      // 解析失败，忽略
    }
  }

  // 标签 (10分) - 填写即得分
  if (data.tags && data.tags.trim().length > 0) {
    score += 10
  }

  return Math.min(100, Math.round(score))
}
