/**
 * 统一输入验证工具库
 * 为所有 API 路由提供标准化的参数验证
 */

// ==================== 正则表达式 ====================

/**
 * Subreddit 名称正则：1-50位字母、数字、下划线
 */
export const SUBREDDIT_REGEX = /^[a-zA-Z0-9_]{1,50}$/;

/**
 * Reddit Post ID 正则：1-10位字母数字（Base36 编码）
 */
export const POST_ID_REGEX = /^[a-zA-Z0-9]{1,10}$/;

/**
 * 邀请码正则：8位大写字母数字
 */
export const INVITE_CODE_REGEX = /^[A-Z0-9]{8}$/;

/**
 * UUID v4 正则
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * CUID 正则（Prisma 默认 ID 格式）
 */
export const CUID_REGEX = /^c[a-z0-9]{24,}$/i;

/**
 * 安全文件名正则：禁止路径遍历字符
 */
export const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9_\-\u4e00-\u9fa5.]+$/;

// ==================== 验证函数 ====================

/**
 * 验证 Subreddit 名称格式
 * @param subreddit Subreddit 名称
 * @returns 是否有效
 */
export function validateSubreddit(subreddit: string | null | undefined): boolean {
  if (!subreddit || typeof subreddit !== 'string') {
    return false;
  }
  return SUBREDDIT_REGEX.test(subreddit.trim());
}

/**
 * 验证 Reddit Post ID 格式
 * @param postId Post ID
 * @returns 是否有效
 */
export function validatePostId(postId: string | null | undefined): boolean {
  if (!postId || typeof postId !== 'string') {
    return false;
  }
  return POST_ID_REGEX.test(postId.trim());
}

/**
 * 验证并解析 limit 参数
 * @param limit limit 字符串
 * @param min 最小值
 * @param max 最大值
 * @param defaultValue 默认值
 * @returns 有效的数字或 null（无效时）
 */
export function validateLimit(
  limit: string | null | undefined,
  min: number = 1,
  max: number = 100,
  defaultValue: number = 10
): number | null {
  if (!limit) {
    return defaultValue;
  }
  
  const parsed = parseInt(limit, 10);
  
  if (isNaN(parsed)) {
    return null;
  }
  
  if (parsed < min || parsed > max) {
    return null;
  }
  
  return parsed;
}

/**
 * 验证排序类型是否在允许列表中
 * @param sort 排序类型
 * @param validTypes 允许的排序类型列表
 * @returns 是否有效
 */
export function validateSortType(
  sort: string | null | undefined,
  validTypes: readonly string[]
): boolean {
  if (!sort) {
    return true; // 允许为空，使用默认值
  }
  return validTypes.includes(sort);
}

/**
 * 验证邀请码格式
 * @param code 邀请码
 * @returns 是否有效
 */
export function validateInviteCode(code: string | null | undefined): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }
  const trimmed = code.trim().toUpperCase();
  return INVITE_CODE_REGEX.test(trimmed);
}

/**
 * 验证 UUID 格式
 * @param id UUID 字符串
 * @returns 是否有效
 */
export function validateUUID(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return UUID_REGEX.test(id.trim());
}

/**
 * 验证 CUID 格式（Prisma 默认 ID）
 * @param id CUID 字符串
 * @returns 是否有效
 */
export function validateCUID(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return CUID_REGEX.test(id.trim());
}

/**
 * 验证文件名安全性（防止路径遍历）
 * @param filename 文件名
 * @returns 是否安全
 */
export function validateFilename(filename: string | null | undefined): boolean {
  if (!filename || typeof filename !== 'string') {
    return false;
  }
  
  const trimmed = filename.trim();
  
  // 检查是否包含路径遍历字符
  if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    return false;
  }
  
  // 检查文件名格式
  if (!SAFE_FILENAME_REGEX.test(trimmed)) {
    return false;
  }
  
  // 限制文件名长度
  if (trimmed.length > 200) {
    return false;
  }
  
  return true;
}

/**
 * 验证导出格式
 * @param format 导出格式
 * @returns 是否有效
 */
export function validateExportFormat(format: string | null | undefined): boolean {
  const validFormats = ['json', 'csv', 'txt', 'md', 'xlsx'];
  if (!format) {
    return true; // 允许为空，使用默认值
  }
  return validFormats.includes(format.toLowerCase());
}

/**
 * 验证正整数
 * @param value 要验证的值
 * @param min 最小值（可选）
 * @param max 最大值（可选）
 * @returns 是否有效
 */
export function validatePositiveInteger(
  value: unknown,
  min?: number,
  max?: number
): value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return false;
  }
  
  if (min !== undefined && value < min) {
    return false;
  }
  
  if (max !== undefined && value > max) {
    return false;
  }
  
  return true;
}

/**
 * 验证布尔值
 * @param value 要验证的值
 * @returns 是否为布尔值
 */
export function validateBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * 验证非空字符串
 * @param value 要验证的值
 * @param maxLength 最大长度（可选）
 * @returns 是否有效
 */
export function validateNonEmptyString(
  value: unknown,
  maxLength?: number
): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }
  
  if (maxLength !== undefined && value.length > maxLength) {
    return false;
  }
  
  return true;
}

// ==================== 验证结果类型 ====================

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 创建验证成功结果
 */
export function validResult(): ValidationResult {
  return { valid: true };
}

/**
 * 创建验证失败结果
 * @param error 错误消息
 */
export function invalidResult(error: string): ValidationResult {
  return { valid: false, error };
}

// ==================== 常量定义 ====================

/**
 * Reddit 搜索排序类型
 */
export const VALID_SEARCH_SORT_TYPES = ['relevance', 'hot', 'top', 'new', 'comments'] as const;

/**
 * Reddit 时间范围
 */
export const VALID_TIME_RANGES = ['hour', 'day', 'week', 'month', 'year', 'all'] as const;

/**
 * 有效的导出格式列表
 */
export const VALID_EXPORT_FORMATS = ['json', 'csv', 'txt', 'md', 'xlsx'] as const;
