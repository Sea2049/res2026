import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

// 验证管理员密码
function verifyAdminPassword(request: NextRequest): boolean {
  const password = request.headers.get('x-admin-password')
  const adminPassword = process.env.ADMIN_PASSWORD
  
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD 环境变量未设置')
    return false
  }
  
  return password === adminPassword
}

// 返回未授权响应
function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: '管理员密码错误' },
    { status: 401 }
  )
}

// GET: 获取邀请码列表
export async function GET(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return unauthorizedResponse()
  }

  try {
    const inviteCodes = await prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: inviteCodes,
    })
  } catch (error) {
    console.error('获取邀请码列表失败:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

// POST: 生成新邀请码
export async function POST(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { maxUses = 1, expiresInDays, note } = body

    // 生成随机邀请码（8位大写字母数字）
    const code = nanoid(8).toUpperCase()

    // 计算过期时间
    let expiresAt: Date | null = null
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)
    }

    const inviteCode = await prisma.inviteCode.create({
      data: {
        code,
        maxUses: Math.max(1, maxUses),
        expiresAt,
        note: note || null,
      },
    })

    return NextResponse.json({
      success: true,
      data: inviteCode,
    })
  } catch (error) {
    console.error('创建邀请码失败:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

// DELETE: 删除邀请码
export async function DELETE(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return unauthorizedResponse()
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少邀请码 ID' },
        { status: 400 }
      )
    }

    await prisma.inviteCode.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除邀请码失败:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

// PATCH: 启用/禁用邀请码
export async function PATCH(request: NextRequest) {
  if (!verifyAdminPassword(request)) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { id, enabled } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少邀请码 ID' },
        { status: 400 }
      )
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: '缺少 enabled 参数' },
        { status: 400 }
      )
    }

    const inviteCode = await prisma.inviteCode.update({
      where: { id },
      data: { enabled },
    })

    return NextResponse.json({
      success: true,
      data: inviteCode,
    })
  } catch (error) {
    console.error('更新邀请码失败:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}
