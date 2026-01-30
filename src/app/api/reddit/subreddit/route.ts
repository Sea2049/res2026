/**
 * @swagger
 * /api/reddit/subreddit:
 *   get:
 *     summary: 获取 Subreddit 热门帖子
 *     description: 获取指定 Subreddit 的热门帖子列表
 *     tags: [Reddit]
 *     parameters:
 *       - name: subreddit
 *         in: query
 *         required: true
 *         description: Subreddit 名称
 *         schema:
 *           type: string
 *           pattern: ^[a-zA-Z0-9_]{1,50}$
 *       - name: limit
 *         in: query
 *         description: 返回帖子数量
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *     responses:
 *       200:
 *         description: 帖子列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     children:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/RedditPost'
 *       400:
 *         description: 参数验证失败
 *       429:
 *         description: 请求过于频繁（30次/分钟）
 *       500:
 *         description: 服务器错误
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchWithFallbacks } from '@/lib/api/fetch-helper';
import { validateSubreddit, validateLimit } from '@/lib/validators';
import { redditRateLimiter, checkRateLimit } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  // 限流检查
  const rateLimitResponse = checkRateLimit(redditRateLimiter, request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const searchParams = request.nextUrl.searchParams;
  const subreddit = searchParams.get('subreddit');
  const limitParam = searchParams.get('limit');
  
  // 输入验证
  if (!subreddit) {
    return NextResponse.json({ error: '缺少 subreddit 参数' }, { status: 400 });
  }

  // 验证 subreddit 格式
  if (!validateSubreddit(subreddit)) {
    return NextResponse.json({ 
      error: 'Subreddit 名称格式无效（只允许字母、数字、下划线，最长50字符）' 
    }, { status: 400 });
  }

  // 验证 limit
  const limit = validateLimit(limitParam, 1, 100, 10);
  if (limit === null) {
    return NextResponse.json({ 
      error: 'Limit 参数必须在 1 到 100 之间' 
    }, { status: 400 });
  }

  try {
    const redditUrl = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/hot.json?limit=${limit}&sort=hot`;
    
    try {
      const response = await fetchWithFallbacks(redditUrl);
      const data = await response.json();
      
      // 处理某些代理返回的包装数据
      if (data.contents && typeof data.contents === 'string') {
        try {
          const parsed = JSON.parse(data.contents);
          return NextResponse.json(parsed);
        } catch (e) {
          // ignore
        }
      }

      return NextResponse.json(data);
    } catch (error: unknown) {
      console.error('获取 Subreddit 帖子失败:', error);
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
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
