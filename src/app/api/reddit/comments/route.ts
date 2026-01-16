import { NextRequest, NextResponse } from 'next/server';
import { fetchWithFallbacks } from '@/lib/api/fetch-helper';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const subreddit = searchParams.get('subreddit');
  const postId = searchParams.get('postId');
  
  if (!subreddit || !postId) {
    return NextResponse.json({ error: '缺少 subreddit 或 postId 参数' }, { status: 400 });
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
    } catch (error: any) {
      console.error('获取评论失败:', error);
      return NextResponse.json(
        { error: `API 请求失败: ${error.message}` },
        { status: error.status || 500 }
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
