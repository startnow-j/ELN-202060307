import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'

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

// 从附件提取文本
async function extractTextFromAttachment(attachment: {
  path: string
  name: string
  type: string
}): Promise<string> {
  const filePath = path.join(process.cwd(), attachment.path)
  
  if (!fs.existsSync(filePath)) {
    throw new Error('文件不存在')
  }
  
  const buffer = fs.readFileSync(filePath)
  const ext = path.extname(attachment.name).toLowerCase()
  
  if (ext === '.docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } else if (ext === '.pdf') {
    // @ts-ignore - pdf-parse 模块的类型定义问题
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return data.text || ''
  } else if (ext === '.xlsx' || ext === '.xls') {
    const xlsx = await import('xlsx')
    const workbook = xlsx.read(buffer, { type: 'buffer' })
    let text = ''
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      text += `工作表: ${sheetName}\n`
      text += xlsx.utils.sheet_to_csv(sheet) + '\n\n'
    }
    return text
  } else if (ext === '.md' || ext === '.tex' || ext === '.txt') {
    return buffer.toString('utf-8')
  }
  
  return ''
}

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
      // 提取选定附件的文本
      let allText = ''
      for (const attachment of targetAttachments) {
        try {
          const text = await extractTextFromAttachment(attachment)
          allText += `【文件: ${attachment.name}】\n${text}\n\n`
        } catch (err) {
          console.error(`Failed to extract from ${attachment.name}:`, err)
        }
      }

      if (!allText.trim()) {
        throw new Error('无法从附件中提取文本内容')
      }

      // 限制文本长度（避免超出token限制）
      const maxChars = 10000
      const truncatedText = allText.length > maxChars 
        ? allText.slice(0, maxChars) + '...(内容已截断)'
        : allText

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
            content: `请分析以下实验记录内容，提取关键信息：

${truncatedText}`
          }
        ],
        thinking: { type: 'disabled' }
      })

      const responseText = completion.choices[0]?.message?.content

      if (!responseText) {
        throw new Error('AI未返回结果')
      }

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
