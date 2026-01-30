/**
 * Token 签名和验证工具库
 * 用于生成和验证安全的邀请码验证 Token
 */

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * 默认 Token 密钥（生产环境应使用环境变量）
 */
const DEFAULT_SECRET = 'reddit-insight-tool-default-secret-key-2026';

/**
 * 获取 Token 密钥
 * @returns 密钥字符串
 */
function getSecret(): string {
  return process.env.INVITE_TOKEN_SECRET || DEFAULT_SECRET;
}

/**
 * 生成签名 Token
 * Token 格式: timestamp.signature
 * @param secret 可选的自定义密钥
 * @returns 签名 Token 字符串
 */
export function generateVerificationToken(secret?: string): string {
  const effectiveSecret = secret || getSecret();
  const timestamp = Date.now().toString();
  
  const signature = createHmac('sha256', effectiveSecret)
    .update(timestamp)
    .digest('hex');
  
  return `${timestamp}.${signature}`;
}

/**
 * 验证签名 Token
 * @param token Token 字符串
 * @param secret 可选的自定义密钥
 * @param maxAgeMs Token 最大有效期（毫秒），默认 7 天
 * @returns 验证结果
 */
export function verifyToken(
  token: string | null | undefined,
  secret?: string,
  maxAgeMs?: number
): VerificationResult {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'Token 不存在' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Token 格式无效' };
  }

  const [timestampStr, providedSignature] = parts;
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp)) {
    return { valid: false, reason: 'Token 时间戳无效' };
  }

  // 检查 Token 是否过期
  const effectiveMaxAge = maxAgeMs || getDefaultMaxAge();
  const now = Date.now();
  const age = now - timestamp;

  if (age < 0) {
    return { valid: false, reason: 'Token 时间戳异常（未来时间）' };
  }

  if (age > effectiveMaxAge) {
    return { valid: false, reason: 'Token 已过期' };
  }

  // 验证签名
  const effectiveSecret = secret || getSecret();
  const expectedSignature = createHmac('sha256', effectiveSecret)
    .update(timestampStr)
    .digest('hex');

  // 使用时间安全的比较函数防止时序攻击
  try {
    const providedBuffer = Buffer.from(providedSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (providedBuffer.length !== expectedBuffer.length) {
      return { valid: false, reason: 'Token 签名无效' };
    }

    const isValid = timingSafeEqual(providedBuffer, expectedBuffer);
    
    if (!isValid) {
      return { valid: false, reason: 'Token 签名无效' };
    }

    return { 
      valid: true, 
      timestamp,
      expiresAt: timestamp + effectiveMaxAge
    };
  } catch {
    return { valid: false, reason: 'Token 签名格式错误' };
  }
}

/**
 * 获取默认 Token 有效期
 * @returns 有效期（毫秒）
 */
function getDefaultMaxAge(): number {
  const envMaxAge = process.env.INVITE_COOKIE_MAX_AGE;
  if (envMaxAge) {
    const parsed = parseInt(envMaxAge, 10);
    if (!isNaN(parsed)) {
      return parsed * 1000; // 环境变量单位是秒，转为毫秒
    }
  }
  return 7 * 24 * 60 * 60 * 1000; // 默认 7 天
}

/**
 * 验证结果接口
 */
export interface VerificationResult {
  /**
   * 是否验证成功
   */
  valid: boolean;
  /**
   * 失败原因（仅在 valid=false 时存在）
   */
  reason?: string;
  /**
   * Token 创建时间戳（仅在 valid=true 时存在）
   */
  timestamp?: number;
  /**
   * Token 过期时间戳（仅在 valid=true 时存在）
   */
  expiresAt?: number;
}

/**
 * 检查是否需要刷新 Token
 * 如果 Token 剩余有效期不足总有效期的 1/3，建议刷新
 * @param token Token 字符串
 * @param secret 可选的自定义密钥
 * @returns 是否需要刷新
 */
export function shouldRefreshToken(
  token: string | null | undefined,
  secret?: string
): boolean {
  const result = verifyToken(token, secret);
  
  if (!result.valid || !result.timestamp || !result.expiresAt) {
    return true;
  }

  const now = Date.now();
  const totalAge = result.expiresAt - result.timestamp;
  const remainingAge = result.expiresAt - now;

  // 如果剩余有效期不足 1/3，建议刷新
  return remainingAge < totalAge / 3;
}

/**
 * 从请求 Cookie 中提取验证 Token
 * 用于 Edge Runtime（middleware）
 * @param cookieValue Cookie 值
 * @returns 验证结果
 */
export function verifyInviteCookie(cookieValue: string | undefined): VerificationResult {
  return verifyToken(cookieValue);
}
