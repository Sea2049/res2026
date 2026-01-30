import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 将字符串转换为 Uint8Array
 */
function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder()
  return encoder.encode(str)
}

/**
 * 将 ArrayBuffer 转换为十六进制字符串
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer)
  return Array.from(byteArray)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 使用 Web Crypto API 生成 HMAC-SHA256 签名
 */
async function hmacSha256(secret: string, message: string): Promise<string> {
  const keyData = stringToUint8Array(secret)
  const messageData = stringToUint8Array(message)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, messageData)
  return arrayBufferToHex(signature)
}

/**
 * 在 Edge Runtime 中验证签名 Token（使用 Web Crypto API）
 */
async function verifyTokenInEdge(token: string | undefined): Promise<boolean> {
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

  // 使用 Web Crypto API 验证签名
  const secret = process.env.INVITE_TOKEN_SECRET || 'reddit-insight-tool-default-secret-key-2026'
  const expectedSignature = await hmacSha256(secret, timestampStr)

  // 简单比较
  return providedSignature === expectedSignature
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 仅对首页进行验证
  if (pathname !== '/') {
    return NextResponse.next()
  }

  // 获取验证 Cookie
  const tokenValue = request.cookies.get('invite_verified')?.value

  // 验证签名 Token
  const isVerified = await verifyTokenInEdge(tokenValue)

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
