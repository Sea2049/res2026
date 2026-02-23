/**
 * 通用 LRU 缓存类
 * 支持固定容量、可选 TTL、O(1) 操作
 */

// ==================== 类型定义 ====================

interface CacheEntry<V> {
  value: V
  timestamp: number
}

export interface LRUCacheStats {
  /** 当前缓存大小 */
  size: number
  /** 最大容量 */
  maxSize: number
  /** 命中次数 */
  hits: number
  /** 未命中次数 */
  misses: number
  /** 命中率 */
  hitRate: number
}

// ==================== LRU 缓存类 ====================

/**
 * 泛型 LRU 缓存
 * 使用 Map 实现，利用 Map 的插入顺序特性
 */
export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>> = new Map()
  private maxSize: number
  private ttlMs: number | undefined
  private hits: number = 0
  private misses: number = 0

  /**
   * 创建 LRU 缓存
   * @param maxSize 最大容量
   * @param ttlMs 可选的 TTL（毫秒），超时后条目自动失效
   */
  constructor(maxSize: number, ttlMs?: number) {
    if (maxSize < 1) {
      throw new Error('maxSize must be at least 1')
    }
    this.maxSize = maxSize
    this.ttlMs = ttlMs
  }

  /**
   * 获取缓存值
   * 如果存在且未过期，将条目移动到最新位置
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key)

    if (!entry) {
      this.misses++
      return undefined
    }

    // 检查 TTL
    if (this.ttlMs !== undefined) {
      const age = Date.now() - entry.timestamp
      if (age > this.ttlMs) {
        this.cache.delete(key)
        this.misses++
        return undefined
      }
    }

    // 将条目移动到最新位置（删除后重新插入）
    this.cache.delete(key)
    this.cache.set(key, entry)
    this.hits++

    return entry.value
  }

  /**
   * 设置缓存值
   * 如果达到容量上限，删除最老的条目
   */
  set(key: K, value: V): void {
    // 如果 key 已存在，先删除（更新顺序）
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // 如果达到容量上限，删除最老的条目
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
      }
    }

    // 插入新条目
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    })
  }

  /**
   * 检查 key 是否存在（不更新访问顺序）
   */
  has(key: K): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // 检查 TTL
    if (this.ttlMs !== undefined) {
      const age = Date.now() - entry.timestamp
      if (age > this.ttlMs) {
        this.cache.delete(key)
        return false
      }
    }

    return true
  }

  /**
   * 删除指定 key
   */
  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
  }

  /**
   * 获取当前缓存大小
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): LRUCacheStats {
    const total = this.hits + this.misses
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    }
  }

  /**
   * 清理过期条目（仅在设置了 TTL 时有效）
   * 可用于定期维护
   */
  cleanup(): number {
    if (this.ttlMs === undefined) return 0

    const now = Date.now()
    let removed = 0

    const entries = Array.from(this.cache.entries())
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key)
        removed++
      }
    }

    return removed
  }

  /**
   * 获取所有键（按 LRU 顺序，最老的在前）
   */
  keys(): IterableIterator<K> {
    return this.cache.keys()
  }

  /**
   * 获取所有值（按 LRU 顺序，最老的在前）
   */
  values(): V[] {
    return Array.from(this.cache.values()).map(entry => entry.value)
  }

  /**
   * 遍历缓存条目
   */
  forEach(callback: (value: V, key: K) => void): void {
    const entries = Array.from(this.cache.entries())
    for (const [key, entry] of entries) {
      callback(entry.value, key)
    }
  }
}

// ==================== 简单 LRU 缓存（无 TTL，无统计） ====================

/**
 * 简单 LRU 缓存
 * 轻量级实现，适用于不需要 TTL 和统计的场景
 */
export class SimpleLRUCache<K, V> {
  private cache: Map<K, V> = new Map()
  private maxSize: number

  constructor(maxSize: number) {
    if (maxSize < 1) {
      throw new Error('maxSize must be at least 1')
    }
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value === undefined) return undefined

    // 移动到最新位置
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}
