import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'
import { 
  validateCUID, 
  validatePositiveInteger, 
  validateBoolean,
  validateNonEmptyString 
} from '@/lib/validators'
import { adminRateLimiter, checkRateLimit } from '@/lib/rate-limiter'

// 限流检查包装函数
function withRateLimit(request: NextRequest): Response | null {
  return checkRateLimit(adminRateLimiter, request)
}

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
  // 限流检查
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

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
  // 限流检查
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  if (!verifyAdminPassword(request)) {
    return unauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { maxUses = 1, expiresInDays, note } = body

    // 验证 maxUses
    if (maxUses !== undefined) {
      const parsedMaxUses = typeof maxUses === 'string' ? parseInt(maxUses, 10) : maxUses
      if (!validatePositiveInteger(parsedMaxUses, 1, 10000)) {
        return NextResponse.json(
          { success: false, error: 'maxUses 必须是 1 到 10000 之间的正整数' },
          { status: 400 }
        )
      }
    }

    // 验证 expiresInDays
    if (expiresInDays !== undefined && expiresInDays !== null) {
      const parsedDays = typeof expiresInDays === 'string' ? parseInt(expiresInDays, 10) : expiresInDays
      if (!validatePositiveInteger(parsedDays, 1, 365)) {
        return NextResponse.json(
          { success: false, error: 'expiresInDays 必须是 1 到 365 之间的正整数' },
          { status: 400 }
        )
      }
    }

    // 验证 note
    if (note !== undefined && note !== null && !validateNonEmptyString(note, 500)) {
      return NextResponse.json(
        { success: false, error: '备注长度不能超过 500 字符' },
        { status: 400 }
      )
    }

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
  // 限流检查
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

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

    // 验证 ID 格式（CUID）
    if (!validateCUID(id)) {
      return NextResponse.json(
        { success: false, error: 'ID 格式无效' },
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
  // 限流检查
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

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

    // 验证 ID 格式（CUID）
    if (!validateCUID(id)) {
      return NextResponse.json(
        { success: false, error: 'ID 格式无效' },
        { status: 400 }
      )
    }

    if (!validateBoolean(enabled)) {
      return NextResponse.json(
        { success: false, error: 'enabled 参数必须是布尔值' },
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
