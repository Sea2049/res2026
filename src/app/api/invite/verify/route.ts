/**
 * @swagger
 * /api/invite/verify:
 *   post:
 *     summary: 验证邀请码
 *     description: |
 *       验证邀请码有效性，成功后设置认证 Cookie。
 *       
 *       验证规则：
 *       - 邀请码格式：8位大写字母数字
 *       - 邀请码必须存在且已启用
 *       - 邀请码未过期
 *       - 使用次数未达上限
 *     tags: [Invite]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: 8位邀请码
 *                 pattern: ^[A-Z0-9]{8}$
 *                 example: ABCD1234
 *     responses:
 *       200:
 *         description: 验证成功，Cookie 已设置
 *         headers:
 *           Set-Cookie:
 *             description: invite_verified cookie（7天有效）
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: 邀请码格式无效
 *       401:
 *         description: 邀请码无效、已禁用、已过期或使用次数已满
 *       429:
 *         description: 请求过于频繁（5次/分钟，防暴力破解）
 *       500:
 *         description: 服务器错误
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateNonEmptyString } from '@/lib/validators'
import { generateVerificationToken } from '@/lib/auth-token'
import { inviteVerifyRateLimiter, checkRateLimit } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
  // 限流检查（防止暴力破解）
  const rateLimitResponse = checkRateLimit(inviteVerifyRateLimiter, request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

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
