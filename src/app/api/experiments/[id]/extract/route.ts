import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'
import { extractText } from '@/lib/fileParser'

// AI提取信息结构
interface ExtractedInfo {
  reagents?: Array<{
    name: string
    specification?: string
    batch?: string
    manufacturer?: string
    amount?: string
  }>
  instruments?: Array<{
    name: string
    model?: string
    equipmentId?: string
  }>
  parameters?: Array<{
    name: string
    value: string
    unit?: string
  }>
  steps?: string[]
  safetyNotes?: string[]
  rawSummary?: string
  conclusion?: string
}

// AI提取提示词
const EXTRACTION_PROMPT = `你是一个专业的生物实验室数据提取助手。请从以下实验记录内容中提取关键信息。

请按以下JSON格式返回提取结果（不要添加任何其他文字，只返回JSON）：
{
  "reagents": [{"name": "试剂名称", "specification": "规格", "batch": "批号", "manufacturer": "厂家", "amount": "用量"}],
  "instruments": [{"name": "仪器名称", "model": "型号", "equipmentId": "设备编号"}],
  "parameters": [{"name": "参数名称", "value": "数值", "unit": "单位"}],
  "steps": ["步骤1", "步骤2", ...],
  "safetyNotes": ["安全注意事项1", "安全注意事项2", ...],
  "rawSummary": "实验目的和方法的简要总结(用于摘要字段)",
  "conclusion": "实验结论和分析总结(用于结论字段)"
}

实验记录内容：
`

// AI提取接口
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { attachmentIds } = body

    // 获取实验记录
    const experiment = await db.experiment.findUnique({
      where: { id },
      include: {
        attachments: true,
        author: true
      }
    })

    if (!experiment) {
      return NextResponse.json({ error: '实验记录不存在' }, { status: 404 })
    }

    // 检查权限
    const user = await db.user.findUnique({ where: { id: userId } })
    if (experiment.authorId !== userId && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    // 筛选要提取的附件
    let targetAttachments = experiment.attachments
    if (attachmentIds && Array.isArray(attachmentIds) && attachmentIds.length > 0) {
      targetAttachments = experiment.attachments.filter(a => attachmentIds.includes(a.id))
    } else {
      // 如果没有指定，则提取所有文档和数据文件
      targetAttachments = experiment.attachments.filter(
        a => a.category === 'DOCUMENT' || a.category === 'DATA_FILE'
      )
    }

    if (targetAttachments.length === 0) {
      return NextResponse.json({ error: '没有可提取的附件' }, { status: 400 })
    }

    // 更新状态为处理中
    await db.experiment.update({
      where: { id },
      data: { extractionStatus: 'PROCESSING' }
    })

    try {
      // 提取所有附件文本
      const texts: string[] = []
      for (const attachment of targetAttachments) {
        try {
          console.log(`[Extract] Processing ${attachment.name}...`)
          const text = await extractText(attachment.path, attachment.type)
          if (text.trim()) {
            texts.push(`【${attachment.name}】\n${text}`)
          }
        } catch (err) {
          console.error(`[Extract] Failed to extract from ${attachment.name}:`, err)
        }
      }

      const combinedText = texts.join('\n\n---\n\n')

      if (!combinedText.trim()) {
        throw new Error('无法从附件中提取文本内容')
      }

      // 限制文本长度（避免超出token限制）
      const maxChars = 10000
      const truncatedText = combinedText.length > maxChars 
        ? combinedText.slice(0, maxChars) + '...(内容已截断)'
        : combinedText

      console.log(`[AI Extract] Combined text length: ${combinedText.length}, truncated: ${truncatedText.length}`)

      // 调用AI进行提取
      const zai = await ZAI.create()
      
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: `你是一个专业的实验室记录分析助手。请从实验记录中提取关键信息。
请严格按照以下JSON格式返回，不要添加任何其他文字：
{
  "reagents": [{"name": "试剂名称", "specification": "规格", "batch": "批号", "manufacturer": "厂家", "amount": "用量"}],
  "instruments": [{"name": "仪器名称", "model": "型号", "equipmentId": "设备编号"}],
  "parameters": [{"name": "参数名称", "value": "参数值", "unit": "单位"}],
  "steps": ["步骤1", "步骤2"],
  "safetyNotes": ["安全注意事项"],
  "rawSummary": "实验目的和方法的简要总结(用于摘要字段)",
  "conclusion": "实验结论和分析总结(用于结论字段)"
}`
          },
          {
            role: 'user',
            content: EXTRACTION_PROMPT + truncatedText
          }
        ],
        thinking: { type: 'disabled' }
      })

      const responseText = completion.choices[0]?.message?.content

      if (!responseText) {
        throw new Error('AI未返回结果')
      }

      console.log(`[AI Extract] Response length: ${responseText.length}`)

      // 解析JSON
      let extractedInfo: ExtractedInfo
      try {
        // 尝试提取JSON部分
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          extractedInfo = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('无法解析AI返回的JSON')
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        // 如果解析失败，创建一个基本的结构
        extractedInfo = {
          rawSummary: responseText.slice(0, 500)
        }
      }

      // 更新实验记录
      const updated = await db.experiment.update({
        where: { id },
        data: {
          extractedInfo: JSON.stringify(extractedInfo),
          extractionStatus: 'COMPLETED',
          extractionError: null
        },
        include: {
          author: {
            select: { id: true, name: true, email: true, role: true, avatar: true }
          },
          experimentProjects: {
            include: {
              project: {
                include: {
                  owner: { select: { id: true, name: true, email: true, role: true, avatar: true } },
                  members: { select: { id: true, name: true, email: true, role: true, avatar: true } }
                }
              }
            }
          },
          attachments: true
        }
      })

      // 返回更新后的实验记录
      return NextResponse.json({
        id: updated.id,
        title: updated.title,
        summary: updated.summary,
        conclusion: updated.conclusion,
        extractedInfo: updated.extractedInfo ? JSON.parse(updated.extractedInfo) : null,
        extractionStatus: updated.extractionStatus,
        extractionError: updated.extractionError,
        reviewStatus: updated.reviewStatus,
        completenessScore: updated.completenessScore,
        tags: updated.tags,
        authorId: updated.authorId,
        author: updated.author,
        projects: updated.experimentProjects.map(ep => ({
          id: ep.project.id,
          name: ep.project.name,
          description: ep.project.description,
          status: ep.project.status,
          startDate: ep.project.startDate,
          endDate: ep.project.endDate,
          ownerId: ep.project.ownerId,
          owner: ep.project.owner,
          members: ep.project.members,
          createdAt: ep.project.createdAt.toISOString()
        })),
        attachments: updated.attachments.map(att => ({
          id: att.id,
          name: att.name,
          type: att.type,
          size: att.size,
          path: att.path,
          category: att.category,
          previewData: att.extractedText ? JSON.parse(att.extractedText) : null,
          createdAt: att.createdAt.toISOString()
        })),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        submittedAt: updated.submittedAt?.toISOString() || null,
        reviewedAt: updated.reviewedAt?.toISOString() || null
      })

    } catch (extractError) {
      console.error('Extraction error:', extractError)
      
      // 更新状态为失败
      await db.experiment.update({
        where: { id },
        data: {
          extractionStatus: 'FAILED',
          extractionError: extractError instanceof Error ? extractError.message : '提取失败'
        }
      })

      return NextResponse.json({ 
        error: extractError instanceof Error ? extractError.message : 'AI提取失败' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Extract API error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
