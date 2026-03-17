/**
 * 请求限流工具库
 * 基于滑动窗口算法的内存限流器
 */

// ==================== 类型定义 ====================

export interface RateLimitConfig {
  /** 时间窗口（毫秒） */
  windowMs: number
  /** 窗口内最大请求数 */
  maxRequests: number
  /** 限流器名称（用于日志） */
  name?: string
}

export interface RateLimitResult {
  /** 是否允许请求 */
  allowed: boolean
  /** 当前窗口内的请求数 */
  current: number
  /** 最大允许请求数 */
  limit: number
  /** 剩余可用请求数 */
  remaining: number
  /** 窗口重置时间（毫秒时间戳） */
  resetAt: number
  /** 需要等待的时间（毫秒），仅当 allowed=false 时有值 */
  retryAfter?: number
}

interface RequestRecord {
  /** 请求时间戳列表 */
  timestamps: number[]
  /** 最后清理时间 */
  lastCleanup: number
}

// ==================== 限流器类 ====================

/**
 * 滑动窗口限流器
 * 使用内存存储，适用于单实例部署
 */
export class RateLimiter {
  private config: Required<RateLimitConfig>
  private records: Map<string, RequestRecord> = new Map()
  private cleanupInterval: number = 60000 // 每分钟清理一次过期记录

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      name: config.name || 'default',
    }
  }

  /**
   * 检查并记录请求
   * @param key 限流键（通常是 IP 地址或用户 ID）
   * @returns 限流结果
   */
  check(key: string): RateLimitResult {
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    // 获取或创建记录
    let record = this.records.get(key)
    if (!record) {
      record = { timestamps: [], lastCleanup: now }
      this.records.set(key, record)
    }

    // 清理过期的时间戳
    record.timestamps = record.timestamps.filter(ts => ts > windowStart)

    // 计算当前请求数
    const current = record.timestamps.length
    const remaining = Math.max(0, this.config.maxRequests - current)
    const allowed = current < this.config.maxRequests

    // 计算重置时间
    const oldestTimestamp = record.timestamps[0] || now
    const resetAt = oldestTimestamp + this.config.windowMs

    // 如果允许，记录这次请求
    if (allowed) {
      record.timestamps.push(now)
    }

    // 定期清理全局记录
    if (now - record.lastCleanup > this.cleanupInterval) {
      this.cleanup()
      record.lastCleanup = now
    }

    return {
      allowed,
      current: allowed ? current + 1 : current,
      limit: this.config.maxRequests,
      remaining: allowed ? remaining - 1 : remaining,
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil((resetAt - now) / 1000),
    }
  }

  /**
   * 清理过期记录
   */
  private cleanup(): void {
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    for (const [key, record] of this.records.entries()) {
      // 移除所有过期时间戳
      record.timestamps = record.timestamps.filter(ts => ts > windowStart)
      // 如果记录为空，删除整个条目
      if (record.timestamps.length === 0) {
        this.records.delete(key)
      }
    }
  }

  /**
   * 重置指定键的限流记录
   */
  reset(key: string): void {
    this.records.delete(key)
  }

  /**
   * 清空所有限流记录
   */
  clear(): void {
    this.records.clear()
  }

  /**
   * 获取当前记录数（用于监控）
   */
  get size(): number {
    return this.records.size
  }
}

// ==================== 预配置限流器 ====================

/** Reddit API 限流器：30次/分钟 */
export const redditRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  name: 'reddit-api',
})

/** AI 分析限流器：10次/分钟 */
export const aiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  name: 'ai-api',
})

/** 导出功能限流器：20次/分钟 */
export const exportRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  name: 'export-api',
})

/** 分析功能限流器：20次/分钟 */
export const analysisRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  name: 'analysis-api',
})

/** Jobs 轮询限流器（GET 状态/结果查询）：60次/分钟，滑动窗口 */
export const jobsPollingRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  name: 'jobs-polling',
})

/** Jobs 创建限流器（POST 提交任务）：10次/分钟 */
export const jobsCreateRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  name: 'jobs-create',
})

// ==================== 工具函数 ====================

/**
 * 从请求中提取客户端 IP
 * 支持各种代理头部
 *
 * 桌面版（Electron）部署说明：
 * 系统默认通过 Clash 代理（127.0.0.1:7897）发出请求，
 * 此时不存在 XFF 头，getClientIP 返回 'unknown'。
 * 限流器在桌面版下主要保护 Reddit API 配额，XFF 处理仅在 Web 部署场景下生效。
 */
export function getClientIP(request: Request): string {
  const headers = request.headers

  // Cloudflare（可信：由 CF 边缘节点设置，不可被客户端伪造）
  const cfConnectingIP = headers.get('cf-connecting-ip')
  if (cfConnectingIP) return cfConnectingIP

  // Nginx 代理（可信：由反向代理设置）
  const xRealIP = headers.get('x-real-ip')
  if (xRealIP) return xRealIP

  // X-Forwarded-For：取最后一个非本地 IP（最近可信代理添加的）
  const xForwardedFor = headers.get('x-forwarded-for')
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map(ip => ip.trim()).filter(Boolean)
    for (let i = ips.length - 1; i >= 0; i--) {
      const ip = ips[i]
      if (ip !== '127.0.0.1' && ip !== '::1' && ip !== 'unknown') {
        return ip
      }
    }
    if (ips.length > 0) return ips[0]
  }

  return 'unknown'
}

/**
 * 创建限流响应
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: `请求过于频繁，请在 ${result.retryAfter} 秒后重试`,
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetAt.toString(),
        'Retry-After': (result.retryAfter || 60).toString(),
      },
    }
  )
}

/**
 * 限流检查辅助函数
 * 如果被限流，返回 Response；否则返回 null
 */
export function checkRateLimit(
  limiter: RateLimiter,
  request: Request
): Response | null {
  const clientIP = getClientIP(request)
  const result = limiter.check(clientIP)

  if (!result.allowed) {
    return createRateLimitResponse(result)
  }

  return null
}
