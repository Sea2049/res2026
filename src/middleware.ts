import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createHmac } from 'crypto'

/**
 * 在 Edge Runtime 中验证签名 Token
 * 注意：Edge Runtime 支持 crypto 模块的基本功能
 */
function verifyTokenInEdge(token: string | undefined): boolean {
  if (!token || typeof token !== 'string') {
    return false
  }

  const parts = token.split('.')
  if (parts.length !== 2) {
    return false
  }

  const [timestampStr, providedSignature] = parts
  const timestamp = parseInt(timestampStr, 10)

  if (isNaN(timestamp)) {
    return false
  }

  // 检查 Token 是否过期
  const maxAgeSeconds = parseInt(process.env.INVITE_COOKIE_MAX_AGE || '604800', 10)
  const maxAgeMs = maxAgeSeconds * 1000
  const now = Date.now()
  const age = now - timestamp

  if (age < 0 || age > maxAgeMs) {
    return false
  }

  // 验证签名
  const secret = process.env.INVITE_TOKEN_SECRET || 'reddit-insight-tool-default-secret-key-2026'
  const expectedSignature = createHmac('sha256', secret)
    .update(timestampStr)
    .digest('hex')

  // 简单比较（Edge Runtime 中 timingSafeEqual 可能不可用）
  return providedSignature === expectedSignature
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 仅对首页进行验证
  if (pathname !== '/') {
    return NextResponse.next()
  }

  // 获取验证 Cookie
  const tokenValue = request.cookies.get('invite_verified')?.value

  // 验证签名 Token
  const isVerified = verifyTokenInEdge(tokenValue)

  if (!isVerified) {
    // 重定向到邀请码输入页面
    return NextResponse.redirect(new URL('/invite', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // 匹配首页
    '/',
  ],
}
