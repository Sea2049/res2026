import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: '请输入邀请码' },
        { status: 400 }
      )
    }

    // 查找邀请码
    const inviteCode = await prisma.inviteCode.findUnique({
      where: { code: code.trim() },
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

    // 设置验证 Cookie
    const cookieMaxAge = parseInt(process.env.INVITE_COOKIE_MAX_AGE || '604800', 10) // 默认 7 天
    const response = NextResponse.json({ success: true })
    
    response.cookies.set('invite_verified', 'true', {
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
