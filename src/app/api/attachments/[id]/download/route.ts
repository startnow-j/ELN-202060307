import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

// 下载附件
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params

    const attachment = await db.attachment.findUnique({
      where: { id }
    })

    if (!attachment) {
      return NextResponse.json({ error: '附件不存在' }, { status: 404 })
    }

    const filePath = path.join(process.cwd(), attachment.path)
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': attachment.type,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.name)}"`,
        'Content-Length': attachment.size.toString()
      }
    })

  } catch (error) {
    console.error('Download attachment error:', error)
    return NextResponse.json({ error: '下载失败' }, { status: 500 })
  }
}
