import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import { AttachmentCategory } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// 支持的文件类型
const ALLOWED_TYPES: Record<string, { category: AttachmentCategory; extensions: string[] }> = {
  DOCUMENT: { category: 'DOCUMENT', extensions: ['.doc', '.docx', '.pdf', '.txt', '.md', '.tex'] },
  DATA_FILE: { category: 'DATA_FILE', extensions: ['.xls', '.xlsx', '.csv'] },
  IMAGE: { category: 'IMAGE', extensions: ['.png', '.jpg', '.jpeg', '.gif', '.bmp'] },
}

// 预览数据结构类型
interface WordPreview {
  type: 'word'
  pages: number
  paragraphs: number
  chars: number
  summary: string
}

interface PDFPreview {
  type: 'pdf'
  pages: number
  chars: number
  summary: string
}

interface ExcelSheetPreview {
  name: string
  rows: number
  cols: number
  headers: string[]
  sampleData: string[][]
}

interface ExcelPreview {
  type: 'excel'
  sheets: ExcelSheetPreview[]
  totalSheets: number
}

interface MarkdownPreview {
  type: 'markdown'
  chars: number
  summary: string
}

type PreviewData = WordPreview | PDFPreview | ExcelPreview | MarkdownPreview | null

// 获取文件分类
function getFileCategory(filename: string): AttachmentCategory {
  const ext = path.extname(filename).toLowerCase()
  for (const [, config] of Object.entries(ALLOWED_TYPES)) {
    if (config.extensions.includes(ext)) {
      return config.category as AttachmentCategory
    }
  }
  return 'OTHER'
}

// ========== 轻量级提取函数 ==========

// Word文档摘要提取
async function extractWordSummary(buffer: Buffer): Promise<WordPreview> {
  try {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value
    
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length
    const chars = text.length
    const pages = Math.max(1, Math.ceil(chars / 2000))
    const summary = text.slice(0, 500).trim()
    
    return {
      type: 'word',
      pages,
      paragraphs,
      chars,
      summary
    }
  } catch (error) {
    console.error('Word extraction error:', error)
    return {
      type: 'word',
      pages: 0,
      paragraphs: 0,
      chars: 0,
      summary: ''
    }
  }
}

// PDF摘要提取
async function extractPDFSummary(buffer: Buffer): Promise<PDFPreview> {
  try {
    // pdf-parse 动态导入方式
    // @ts-ignore - pdf-parse 模块的类型定义问题
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer, { max: 5 })
    
    const pages = data.numpages || 1
    const text = data.text || ''
    const chars = text.length
    const summary = text.slice(0, 500).trim()
    
    return {
      type: 'pdf',
      pages,
      chars,
      summary
    }
  } catch (error) {
    console.error('PDF extraction error:', error)
    return {
      type: 'pdf',
      pages: 1,
      chars: 0,
      summary: ''
    }
  }
}

// Excel摘要提取
async function extractExcelSummary(buffer: Buffer): Promise<ExcelPreview> {
  try {
    const xlsx = await import('xlsx')
    const workbook = xlsx.read(buffer, { type: 'buffer' })
    
    const sheets: ExcelSheetPreview[] = []
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const range = xlsx.utils.decode_range(sheet['!ref'] || 'A1')
      const rows = range.e.r - range.s.r + 1
      const cols = range.e.c - range.s.c + 1
      
      const headers: string[] = []
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[xlsx.utils.encode_cell({ r: range.s.r, c })]
        headers.push(cell?.v?.toString() || `列${c + 1}`)
      }
      
      const sampleData: string[][] = []
      for (let r = range.s.r + 1; r <= Math.min(range.s.r + 5, range.e.r); r++) {
        const row: string[] = []
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cell = sheet[xlsx.utils.encode_cell({ r, c })]
          row.push(cell?.v?.toString() || '')
        }
        sampleData.push(row)
      }
      
      sheets.push({
        name: sheetName,
        rows,
        cols,
        headers,
        sampleData
      })
    }
    
    return {
      type: 'excel',
      sheets,
      totalSheets: workbook.SheetNames.length
    }
  } catch (error) {
    console.error('Excel extraction error:', error)
    return {
      type: 'excel',
      sheets: [],
      totalSheets: 0
    }
  }
}

// Markdown摘要提取
async function extractMarkdownSummary(buffer: Buffer): Promise<{ type: 'markdown'; chars: number; summary: string }> {
  const text = buffer.toString('utf-8')
  return {
    type: 'markdown',
    chars: text.length,
    summary: text.slice(0, 500).trim()
  }
}

// 主提取函数
async function extractPreviewData(filename: string, buffer: Buffer): Promise<PreviewData> {
  const ext = path.extname(filename).toLowerCase()
  
  if (ext === '.docx') {
    return await extractWordSummary(buffer)
  } else if (ext === '.pdf') {
    return await extractPDFSummary(buffer)
  } else if (ext === '.xlsx' || ext === '.xls') {
    return await extractExcelSummary(buffer)
  } else if (ext === '.md' || ext === '.tex' || ext === '.txt') {
    return await extractMarkdownSummary(buffer)
  }
  
  return null
}

// ========== API路由 ==========

// 上传附件
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const experimentId = formData.get('experimentId') as string

    if (!file || !experimentId) {
      return NextResponse.json({ error: '缺少文件或实验ID' }, { status: 400 })
    }

    // 检查文件大小（最大 50MB）
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过50MB' }, { status: 400 })
    }

    // 检查实验是否存在
    const experiment = await db.experiment.findUnique({
      where: { id: experimentId }
    })

    if (!experiment) {
      return NextResponse.json({ error: '实验记录不存在' }, { status: 404 })
    }

    // 检查权限
    const user = await db.user.findUnique({ where: { id: userId } })
    if (experiment.authorId !== userId && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限上传附件' }, { status: 403 })
    }

    // 检查实验状态
    if (experiment.reviewStatus === 'LOCKED') {
      return NextResponse.json({ error: '已锁定的实验记录不能上传附件' }, { status: 403 })
    }

    // 生成文件名
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const ext = path.extname(file.name)
    const newFilename = `${timestamp}_${randomStr}${ext}`
    
    // 确保目录存在
    const uploadDir = path.join(process.cwd(), 'upload', 'files')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // 保存文件
    const filePath = path.join(uploadDir, newFilename)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    fs.writeFileSync(filePath, buffer)

    // 提取轻量级预览数据
    const previewData = await extractPreviewData(file.name, buffer)
    
    // 创建附件记录
    const attachment = await db.attachment.create({
      data: {
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        path: `/upload/files/${newFilename}`,
        category: getFileCategory(file.name),
        extractedText: previewData ? JSON.stringify(previewData) : null,
        experimentId,
        uploaderId: userId
      }
    })

    return NextResponse.json({
      id: attachment.id,
      name: attachment.name,
      type: attachment.type,
      size: attachment.size,
      path: attachment.path,
      category: attachment.category,
      previewData: previewData,
      createdAt: attachment.createdAt.toISOString()
    })

  } catch (error) {
    console.error('Upload attachment error:', error)
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
}

// 获取附件列表
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const experimentId = searchParams.get('experimentId')

    if (!experimentId) {
      return NextResponse.json({ error: '缺少实验ID' }, { status: 400 })
    }

    const attachments = await db.attachment.findMany({
      where: { experimentId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(attachments.map(att => ({
      id: att.id,
      name: att.name,
      type: att.type,
      size: att.size,
      path: att.path,
      category: att.category,
      previewData: att.extractedText ? JSON.parse(att.extractedText) : null,
      createdAt: att.createdAt.toISOString()
    })))

  } catch (error) {
    console.error('Get attachments error:', error)
    return NextResponse.json({ error: '获取附件列表失败' }, { status: 500 })
  }
}
