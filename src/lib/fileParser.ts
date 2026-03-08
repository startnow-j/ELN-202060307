/**
 * 文件解析库 - 从各种文件格式中提取文本内容
 * 支持: PDF, Word (.docx/.doc), Excel, Markdown, Text
 */

import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import mammoth from 'mammoth'
import * as xlsx from 'xlsx'

const execAsync = promisify(exec)

/**
 * 提取文件文本内容
 * @param filePath 文件路径（相对路径）
 * @param fileType 文件 MIME 类型
 * @returns 提取的文本内容
 */
export async function extractText(filePath: string, fileType: string): Promise<string> {
  const fullPath = path.join(process.cwd(), filePath)

  if (!fs.existsSync(fullPath)) {
    throw new Error(`文件不存在: ${filePath}`)
  }

  const buffer = fs.readFileSync(fullPath)
  const ext = path.extname(filePath).toLowerCase()

  switch (ext) {
    case '.pdf':
      return await extractPdfText(buffer)
    case '.docx':
      return await extractDocxText(buffer)
    case '.doc':
      return await extractDocText(fullPath)
    case '.xlsx':
    case '.xls':
      return await extractExcelText(buffer)
    case '.md':
    case '.tex':
    case '.txt':
      return buffer.toString('utf-8')
    case '.csv':
      return buffer.toString('utf-8')
    default:
      // 尝试作为文本读取
      try {
        return buffer.toString('utf-8')
      } catch {
        console.log(`不支持的文件类型: ${ext}`)
        return ''
      }
  }
}

/**
 * 提取 PDF 文本 - 使用 pdf2json
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  console.log('[PDF Extract] Starting extraction with pdf2json...')
  
  return new Promise((resolve, reject) => {
    // 动态导入 pdf2json
    import('pdf2json').then((PDFParserModule) => {
      const PDFParser = PDFParserModule.default || PDFParserModule
      
      const pdfParser = new (PDFParser as any)(null, 1)
      let allText = ''
      
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        console.error('[PDF Extract] pdf2json error:', errData.parserError)
        reject(new Error(`PDF 解析错误: ${errData.parserError?.toString() || '未知错误'}`))
      })
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        const pageCount = pdfData.Pages?.length || 0
        console.log(`[PDF Extract] pdf2json success, pages: ${pageCount}`)
        
        for (const page of pdfData.Pages || []) {
          for (const textItem of page.Texts || []) {
            // 解码 URL 编码的文本
            const decodedText = decodeURIComponent(textItem.R?.[0]?.T || '')
            allText += decodedText + ' '
          }
          allText += '\n'
        }
        
        resolve(allText.trim())
      })
      
      // 解析 Buffer
      pdfParser.parseBuffer(buffer)
    }).catch((error) => {
      console.error('[PDF Extract] Failed to load pdf2json:', error)
      reject(new Error('PDF 解析模块加载失败'))
    })
  })
}

/**
 * 提取 .docx 文档文本 - 使用 mammoth
 */
async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    console.log('[Word .docx] Extracting with mammoth...')
    const result = await mammoth.extractRawText({ buffer })
    console.log(`[Word .docx] Success, length: ${result.value?.length || 0}`)
    return result.value || ''
  } catch (error) {
    console.error('[Word .docx] Extraction failed:', error)
    throw new Error('Word 文档(.docx)解析失败')
  }
}

/**
 * 提取 .doc 文档文本 - 使用 antiword 命令行工具
 */
async function extractDocText(filePath: string): Promise<string> {
  try {
    console.log('[Word .doc] Extracting with antiword...')

    // 使用 antiword 提取文本
    const { stdout, stderr } = await execAsync(`antiword "${filePath}"`, {
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    })

    if (stderr && !stdout) {
      throw new Error(stderr)
    }

    console.log(`[Word .doc] Success, length: ${stdout?.length || 0}`)
    return stdout || ''
  } catch (error) {
    console.error('[Word .doc] Extraction failed:', error)

    // 如果 antiword 失败，提供友好的错误信息
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('not found') || errorMessage.includes('command not found')) {
      throw new Error('系统未安装 antiword 工具，无法解析 .doc 格式文件。请将文件转换为 .docx 格式后重试。')
    }

    throw new Error('Word 文档(.doc)解析失败，建议将文件转换为 .docx 格式后重试')
  }
}

/**
 * 提取 Excel 文档文本
 */
async function extractExcelText(buffer: Buffer): Promise<string> {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' })
    let text = ''
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      text += `【工作表: ${sheetName}】\n`
      text += xlsx.utils.sheet_to_csv(sheet) + '\n\n'
    }
    
    return text
  } catch (error) {
    console.error('[Excel] Extraction failed:', error)
    throw new Error('Excel 文档解析失败')
  }
}

/**
 * 获取 PDF 页数
 */
export async function getPdfPageCount(buffer: Buffer): Promise<number> {
  try {
    const PDFParser = (await import('pdf2json')).default || (await import('pdf2json'))
    
    return new Promise((resolve) => {
      const pdfParser = new (PDFParser as any)(null, 1)
      
      pdfParser.on('pdfParser_dataError', () => {
        resolve(1)
      })
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        resolve(pdfData.Pages?.length || 1)
      })
      
      pdfParser.parseBuffer(buffer)
    })
  } catch (error) {
    console.log('[PDF] Failed to get page count:', error)
    return 1
  }
}

/**
 * 获取 PDF 摘要（前 N 个字符）
 */
export async function getPdfSummary(buffer: Buffer, maxLength: number = 500): Promise<string> {
  const text = await extractPdfText(buffer)
  return text.slice(0, maxLength).trim()
}
