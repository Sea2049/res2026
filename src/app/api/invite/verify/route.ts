import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateNonEmptyString } from '@/lib/validators'
import { generateVerificationToken } from '@/lib/auth-token'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    // 输入验证
    if (!validateNonEmptyString(code, 20)) {
      return NextResponse.json(
        { success: false, error: '请输入有效的邀请码' },
        { status: 400 }
      )
    }

    // 邀请码格式验证（8位大写字母数字）
    const normalizedCode = code.trim().toUpperCase()
    const codeRegex = /^[A-Z0-9]{8}$/
    if (!codeRegex.test(normalizedCode)) {
      return NextResponse.json(
        { success: false, error: '邀请码格式无效' },
        { status: 400 }
      )
    }

    // 查找邀请码
    const inviteCode = await prisma.inviteCode.findUnique({
      where: { code: normalizedCode },
    })

    // 邀请码不存在
    if (!inviteCode) {
      return NextResponse.json(
        { success: false, error: '邀请码无效' },
        { status: 401 }
      )
    }

    // 邀请码已禁用
    if (!inviteCode.enabled) {
      return NextResponse.json(
        { success: false, error: '邀请码已被禁用' },
        { status: 401 }
      )
    }

    // 邀请码已过期
    if (inviteCode.expiresAt && new Date() > inviteCode.expiresAt) {
      return NextResponse.json(
        { success: false, error: '邀请码已过期' },
        { status: 401 }
      )
    }

    // 邀请码使用次数已满
    if (inviteCode.usedCount >= inviteCode.maxUses) {
      return NextResponse.json(
        { success: false, error: '邀请码使用次数已达上限' },
        { status: 401 }
      )
    }

    // 更新使用次数
    await prisma.inviteCode.update({
      where: { id: inviteCode.id },
      data: {
        usedCount: { increment: 1 },
        usedAt: new Date(),
      },
    })

    // 生成签名 Token 并设置 Cookie
    const cookieMaxAge = parseInt(process.env.INVITE_COOKIE_MAX_AGE || '604800', 10) // 默认 7 天
    const verificationToken = generateVerificationToken()
    const response = NextResponse.json({ success: true })
    
    response.cookies.set('invite_verified', verificationToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('验证邀请码失败:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
