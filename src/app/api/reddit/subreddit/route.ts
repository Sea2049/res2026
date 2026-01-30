import { NextRequest, NextResponse } from 'next/server';
import { fetchWithFallbacks } from '@/lib/api/fetch-helper';
import { validateSubreddit, validateLimit } from '@/lib/validators';

export async function GET(request: NextRequest) {
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
    } catch (error: any) {
      console.error('获取 Subreddit 帖子失败:', error);
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
