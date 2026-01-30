import { NextRequest, NextResponse } from 'next/server';
import { fetchWithFallbacks } from '@/lib/api/fetch-helper';
import { validateSubreddit, validatePostId } from '@/lib/validators';
import { redditRateLimiter, checkRateLimit } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  // 限流检查
  const rateLimitResponse = checkRateLimit(redditRateLimiter, request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const searchParams = request.nextUrl.searchParams;
  const subreddit = searchParams.get('subreddit');
  const postId = searchParams.get('postId');
  
  // 输入验证
  if (!subreddit || !postId) {
    return NextResponse.json({ error: '缺少 subreddit 或 postId 参数' }, { status: 400 });
  }

  // 验证 subreddit 格式
  if (!validateSubreddit(subreddit)) {
    return NextResponse.json({ 
      error: 'Subreddit 名称格式无效（只允许字母、数字、下划线，最长50字符）' 
    }, { status: 400 });
  }

  // 验证 postId 格式
  if (!validatePostId(postId)) {
    return NextResponse.json({ 
      error: 'Post ID 格式无效（只允许字母和数字，最长10字符）' 
    }, { status: 400 });
  }

  try {
    const redditUrl = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/comments/${encodeURIComponent(postId)}.json?limit=100&sort=confidence`;
    
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
      console.error('获取评论失败:', error);
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
