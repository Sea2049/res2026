/**
 * @swagger
 * /api/reddit/search:
 *   get:
 *     summary: 搜索 Reddit 内容
 *     description: 搜索 Subreddit 或帖子，支持排序和时间范围筛选。使用 LRU 缓存（500条，60秒TTL）。
 *     tags: [Reddit]
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         description: 搜索关键词（最大200字符）
 *         schema:
 *           type: string
 *           maxLength: 200
 *       - name: type
 *         in: query
 *         description: 搜索类型
 *         schema:
 *           type: string
 *           enum: [subreddit, post]
 *           default: subreddit
 *       - name: limit
 *         in: query
 *         description: 返回结果数量限制
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - name: sort
 *         in: query
 *         description: 排序方式（仅 type=post 时有效）
 *         schema:
 *           type: string
 *           enum: [relevance, hot, new, top]
 *           default: relevance
 *       - name: t
 *         in: query
 *         description: 时间范围（仅 type=post 时有效）
 *         schema:
 *           type: string
 *           enum: [all, hour, day, week, month, year]
 *           default: all
 *       - name: subreddit
 *         in: query
 *         description: 限定搜索的 Subreddit（仅 type=post 时有效）
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 搜索结果
 *         headers:
 *           X-Cache:
 *             description: 缓存状态（HIT/MISS）
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RedditListingResponse'
 *       400:
 *         description: 参数验证失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: 请求过于频繁（30次/分钟）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitError'
 *       500:
 *         description: 服务器错误
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchWithFallbacks } from '@/lib/api/fetch-helper';
import {
  validateSubreddit,
  validateLimit,
  validateSortType,
  validateNonEmptyString,
  VALID_SEARCH_SORT_TYPES,
  VALID_TIME_RANGES,
} from '@/lib/validators';
import { redditRateLimiter, checkRateLimit } from '@/lib/rate-limiter';
import { LRUCache } from '@/lib/lru-cache';
import type { RedditListingResponse } from '@/lib/types';

// 使用 LRU 缓存替代简单 Map（最大 500 条，60秒 TTL）
const searchCache = new LRUCache<string, RedditListingResponse>(500, 60 * 1000);

export async function GET(request: NextRequest) {
  // 限流检查
  const rateLimitResponse = checkRateLimit(redditRateLimiter, request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const type = searchParams.get('type') || 'subreddit';
  
  // 1. 输入验证 - 搜索关键词
  if (!validateNonEmptyString(query, 200)) {
    return NextResponse.json({ error: '缺少搜索关键词或关键词过长（最大200字符）' }, { status: 400 });
  }

  // 验证 limit
  const limitParam = searchParams.get('limit');
  const limit = validateLimit(limitParam, 1, 100, 20);
  if (limit === null) {
    return NextResponse.json({ error: 'Limit 参数必须在 1 到 100 之间' }, { status: 400 });
  }

  // 验证 sort
  const sort = searchParams.get('sort') || 'relevance';
  if (type === 'post' && !validateSortType(sort, VALID_SEARCH_SORT_TYPES)) {
    return NextResponse.json({ 
      error: `无效的排序参数。可选值: ${VALID_SEARCH_SORT_TYPES.join(', ')}` 
    }, { status: 400 });
  }

  // 验证 time range
  const timeRange = searchParams.get('t') || 'all';
  if (type === 'post' && !validateSortType(timeRange, VALID_TIME_RANGES)) {
    return NextResponse.json({ 
      error: `无效的时间范围参数。可选值: ${VALID_TIME_RANGES.join(', ')}` 
    }, { status: 400 });
  }

  // 验证 subreddit（如果提供）
  const subredditParam = searchParams.get('subreddit');
  if (subredditParam && !validateSubreddit(subredditParam)) {
    return NextResponse.json({ 
      error: 'Subreddit 名称格式无效（只允许字母、数字、下划线，最长50字符）' 
    }, { status: 400 });
  }

  // 生成缓存 Key
  const cacheKey = `search:${type}:${query}:${sort}:${timeRange}:${limit}:${searchParams.get('subreddit') || ''}`;

  // 2. 检查 LRU 缓存
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'X-Cache': 'HIT',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  }

  try {
    let redditUrl = '';
    
    if (type === 'subreddit') {
      redditUrl = `https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(query)}&limit=${limit}`; // 使用验证后的 limit
    } else if (type === 'post') {
      const subreddit = searchParams.get('subreddit');
      
      redditUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=${sort}&limit=${limit}`;
      
      if (timeRange !== 'all') {
        redditUrl += `&t=${timeRange}`;
      }
      
      if (subredditParam) {
        redditUrl += `&restrict_sr=true&sr=${encodeURIComponent(subredditParam)}`;
      }
    }

    try {
      const response = await fetchWithFallbacks(redditUrl);
      const data = await response.json();
      
      let finalData = data;

      // 处理某些代理返回的包装数据
      if (data.contents && typeof data.contents === 'string') {
        try {
          const parsed = JSON.parse(data.contents);
          finalData = parsed;
        } catch (e) {
          // 如果解析失败，可能不是 JSON 字符串，直接返回原数据
        }
      }

      // 3. 写入 LRU 缓存（自动管理大小和过期）
      searchCache.set(cacheKey, finalData);

      return NextResponse.json(finalData, {
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      });
    } catch (error: unknown) {
      console.error('API 请求失败:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStatus = (error as Error & { status?: number })?.status || 500;
      return NextResponse.json(
        { error: `API 请求失败: ${errorMessage}` },
        { status: errorStatus }
      );
    }
  } catch (error) {
    console.error('API 路由内部错误:', error);
    return NextResponse.json(
      { error: '请求失败，请稍后重试' },
      { status: 500 }
    );
  }
}
