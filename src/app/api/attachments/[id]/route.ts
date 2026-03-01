import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserIdFromToken } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

// 删除附件
export async function DELETE(
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
      where: { id },
      include: { experiment: true }
    })

    if (!attachment) {
      return NextResponse.json({ error: '附件不存在' }, { status: 404 })
    }

    // 检查权限
    const user = await db.user.findUnique({ where: { id: userId } })
    if (attachment.experiment.authorId !== userId && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限删除此附件' }, { status: 403 })
    }

    // 检查实验状态
    if (attachment.experiment.reviewStatus === 'LOCKED') {
      return NextResponse.json({ error: '已锁定的实验记录不能删除附件' }, { status: 403 })
    }

    // 删除文件
    const filePath = path.join(process.cwd(), attachment.path)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    // 删除数据库记录
    await db.attachment.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete attachment error:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
