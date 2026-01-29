import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 仅对首页进行验证
  if (pathname !== '/') {
    return NextResponse.next()
  }

  // 检查验证 Cookie
  const isVerified = request.cookies.get('invite_verified')?.value === 'true'

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
