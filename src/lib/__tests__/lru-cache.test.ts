/**
 * LRU Cache 单元测试
 */

import { LRUCache, SimpleLRUCache } from '../lru-cache';

describe('LRUCache', () => {
  describe('Basic operations', () => {
    let cache: LRUCache<string, number>;

    beforeEach(() => {
      cache = new LRUCache<string, number>(3);
    });

    it('should set and get values', () => {
      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);
    });

    it('should return undefined for missing keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should update existing values', () => {
      cache.set('a', 1);
      cache.set('a', 2);
      expect(cache.get('a')).toBe(2);
      expect(cache.size).toBe(1);
    });

    it('should check key existence with has()', () => {
      cache.set('a', 1);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
    });

    it('should delete values', () => {
      cache.set('a', 1);
      expect(cache.delete('a')).toBe(true);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.delete('a')).toBe(false);
    });

    it('should clear all values', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('a')).toBeUndefined();
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used items when full', () => {
      const cache = new LRUCache<string, number>(3);
      
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      
      // 添加第 4 个元素，应该淘汰 'a'
      cache.set('d', 4);
      
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('should update LRU order on get()', () => {
      const cache = new LRUCache<string, number>(3);
      
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      
      // 访问 'a'，使其变为最近使用
      cache.get('a');
      
      // 添加第 4 个元素，应该淘汰 'b'（现在是最久未使用的）
      cache.set('d', 4);
      
      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('should update LRU order on set() with existing key', () => {
      const cache = new LRUCache<string, number>(3);
      
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      
      // 更新 'a'，使其变为最近使用
      cache.set('a', 10);
      
      // 添加第 4 个元素，应该淘汰 'b'
      cache.set('d', 4);
      
      expect(cache.get('a')).toBe(10);
      expect(cache.get('b')).toBeUndefined();
    });
  });

  describe('TTL expiration', () => {
    it('should expire items after TTL', async () => {
      const cache = new LRUCache<string, number>(10, 100); // 100ms TTL
      
      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);
      
      // 等待 TTL 过期
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      expect(cache.get('a')).toBeUndefined();
    });

    it('should not expire items before TTL', async () => {
      const cache = new LRUCache<string, number>(10, 200); // 200ms TTL
      
      cache.set('a', 1);
      
      // 等待 50ms（未过期）
      await new Promise((resolve) => setTimeout(resolve, 50));
      
      expect(cache.get('a')).toBe(1);
    });

    it('should remove expired items on has() check', async () => {
      const cache = new LRUCache<string, number>(10, 100);
      
      cache.set('a', 1);
      expect(cache.has('a')).toBe(true);
      
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      expect(cache.has('a')).toBe(false);
    });

    it('should cleanup expired items', async () => {
      const cache = new LRUCache<string, number>(10, 50);
      
      cache.set('a', 1);
      cache.set('b', 2);
      
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const removed = cache.cleanup();
      expect(removed).toBe(2);
      expect(cache.size).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', () => {
      const cache = new LRUCache<string, number>(10);
      
      cache.set('a', 1);
      
      cache.get('a'); // hit
      cache.get('a'); // hit
      cache.get('b'); // miss
      cache.get('c'); // miss
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should reset stats on clear()', () => {
      const cache = new LRUCache<string, number>(10);
      
      cache.set('a', 1);
      cache.get('a');
      cache.get('b');
      
      cache.clear();
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should report correct size and maxSize', () => {
      const cache = new LRUCache<string, number>(5);
      
      cache.set('a', 1);
      cache.set('b', 2);
      
      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(5);
    });
  });

  describe('Edge cases', () => {
    it('should throw error for maxSize < 1', () => {
      expect(() => new LRUCache<string, number>(0)).toThrow();
      expect(() => new LRUCache<string, number>(-1)).toThrow();
    });

    it('should handle maxSize of 1', () => {
      const cache = new LRUCache<string, number>(1);
      
      cache.set('a', 1);
      cache.set('b', 2);
      
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.size).toBe(1);
    });
  });
});

describe('SimpleLRUCache', () => {
  describe('Basic operations', () => {
    let cache: SimpleLRUCache<string, number>;

    beforeEach(() => {
      cache = new SimpleLRUCache<string, number>(3);
    });

    it('should set and get values', () => {
      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);
    });

    it('should return undefined for missing keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should check key existence', () => {
      cache.set('a', 1);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
    });

    it('should delete values', () => {
      cache.set('a', 1);
      expect(cache.delete('a')).toBe(true);
      expect(cache.get('a')).toBeUndefined();
    });

    it('should clear all values', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest items when full', () => {
      const cache = new SimpleLRUCache<string, number>(2);
      
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
    });

    it('should update LRU order on get()', () => {
      const cache = new SimpleLRUCache<string, number>(2);
      
      cache.set('a', 1);
      cache.set('b', 2);
      
      // 访问 'a'，使其变为最近使用
      cache.get('a');
      
      // 添加 'c'，应该淘汰 'b'
      cache.set('c', 3);
      
      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
    });
  });

  describe('Edge cases', () => {
    it('should throw error for maxSize < 1', () => {
      expect(() => new SimpleLRUCache<string, number>(0)).toThrow();
    });
  });
});
