import { NextRequest, NextResponse } from 'next/server';
import { fetchWithFallbacks } from '@/lib/api/fetch-helper';

// 简单内存缓存接口
interface CacheEntry {
  data: any;
  timestamp: number;
}

// 全局缓存对象 (注意：在 Serverless 环境下可能不持久，但在长期运行的容器中有效)
const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 1000; // 60秒缓存

// 验证常量
const VALID_SORT_TYPES = ['relevance', 'hot', 'top', 'new', 'comments'];
const VALID_TIME_RANGES = ['hour', 'day', 'week', 'month', 'year', 'all'];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const type = searchParams.get('type') || 'subreddit';
  
  // 1. 输入验证
  if (!query) {
    return NextResponse.json({ error: '缺少搜索关键词' }, { status: 400 });
  }

  // 验证 limit
  const limitParam = searchParams.get('limit');
  let limit = 20;
  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return NextResponse.json({ error: 'Limit 参数必须在 1 到 100 之间' }, { status: 400 });
    }
    limit = parsedLimit;
  }

  // 验证 sort
  const sort = searchParams.get('sort') || 'relevance';
  if (type === 'post' && !VALID_SORT_TYPES.includes(sort)) {
    return NextResponse.json({ 
      error: `无效的排序参数。可选值: ${VALID_SORT_TYPES.join(', ')}` 
    }, { status: 400 });
  }

  // 验证 time range
  const timeRange = searchParams.get('t') || 'all';
  if (type === 'post' && !VALID_TIME_RANGES.includes(timeRange)) {
    return NextResponse.json({ 
      error: `无效的时间范围参数。可选值: ${VALID_TIME_RANGES.join(', ')}` 
    }, { status: 400 });
  }

  // 生成缓存 Key
  const cacheKey = `search:${type}:${query}:${sort}:${timeRange}:${limit}:${searchParams.get('subreddit') || ''}`;

  // 2. 检查内存缓存
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // console.log(`[Cache] Hit memory cache for ${cacheKey}`);
    return NextResponse.json(cached.data, {
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
      
      if (subreddit) {
        redditUrl += `&restrict_sr=true&sr=${encodeURIComponent(subreddit)}`;
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

      // 3. 写入内存缓存
      memoryCache.set(cacheKey, {
        data: finalData,
        timestamp: Date.now()
      });

      // 清理过期缓存 (简单的概率清理，避免每次请求都遍历)
      if (memoryCache.size > 100 && Math.random() < 0.1) {
        const now = Date.now();
        const cacheEntries = Array.from(memoryCache.entries());
        for (const [key, val] of cacheEntries) {
          if (now - val.timestamp > CACHE_TTL) {
            memoryCache.delete(key);
          }
        }
      }

      return NextResponse.json(finalData, {
        headers: {
          'X-Cache': 'MISS',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      });
    } catch (error: any) {
      console.error('API 请求失败:', error);
      return NextResponse.json(
        { error: `API 请求失败: ${error.message}` },
        { status: error.status || 500 }
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
