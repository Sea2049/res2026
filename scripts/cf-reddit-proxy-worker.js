/**
 * Cloudflare Worker: Reddit API 代理
 * 
 * 部署步骤：
 * 1. 登录 https://dash.cloudflare.com → Workers & Pages → Create Worker
 * 2. 粘贴此文件内容并部署
 * 3. 将 Worker URL 配置到 .env 文件中的 REDDIT_PROXY_URL
 *    例如: REDDIT_PROXY_URL=https://your-worker.your-account.workers.dev
 * 
 * 使用方式：
 *   GET https://your-worker.workers.dev/?url=https://www.reddit.com/subreddits/search.json?q=camera
 */

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    // 从查询参数获取目标 URL
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return jsonResponse({ error: 'Missing ?url= parameter' }, 400);
    }

    // 仅允许 Reddit 域名
    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return jsonResponse({ error: 'Invalid URL' }, 400);
    }

    const allowedHosts = ['www.reddit.com', 'old.reddit.com', 'oauth.reddit.com', 'reddit.com'];
    if (!allowedHosts.includes(parsed.hostname)) {
      return jsonResponse({ error: 'Only reddit.com domains are allowed' }, 403);
    }

    try {
      const resp = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'RedditInsightTool/2.7 (by /u/insight-tool)',
          'Accept': 'application/json',
        },
        cf: {
          cacheTtl: 60,
          cacheEverything: true,
        },
      });

      const body = await resp.text();

      return new Response(body, {
        status: resp.status,
        headers: {
          'Content-Type': resp.headers.get('Content-Type') || 'application/json',
          ...corsHeaders(),
          'X-Proxy': 'cf-reddit-proxy',
        },
      });
    } catch (err) {
      return jsonResponse({ error: 'Proxy fetch failed: ' + err.message }, 502);
    }
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}
