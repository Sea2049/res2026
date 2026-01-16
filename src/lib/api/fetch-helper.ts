/**
 * 通用 Fetch 辅助函数，实现多策略回退机制
 * 用于解决本地开发环境无法直接访问 Reddit API 的问题
 */
export async function fetchWithFallbacks(targetUrl: string): Promise<Response> {
  const strategies = [
    {
      name: 'Direct',
      getUrl: (url: string) => url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 3000
    },
    {
      name: 'CorsProxy',
      getUrl: (url: string) => `https://api.corsproxy.io/?url=${encodeURIComponent(url)}`,
      headers: {
        // 代理通常不需要特定的 User-Agent，或者是转发原有的
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      }
    },
    {
      name: 'CodeTabs',
      getUrl: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      }
    },
    {
      name: 'AllOrigins',
      getUrl: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&timestamp=${Date.now()}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      }
    }
  ];

  let lastError: any;
  let lastStatus: number | undefined;

  for (const strategy of strategies) {
    try {
      console.log(`[API] Trying strategy: ${strategy.name}`);
      const controller = new AbortController();
      // 给代理更长的超时时间
      const timeoutMs = strategy.timeout || 15000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const url = strategy.getUrl(targetUrl);
      const response = await fetch(url, {
        headers: strategy.headers,
        signal: controller.signal,
        next: { revalidate: 60 }
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`[API] Strategy ${strategy.name} success`);
        return response;
      }
      
      console.warn(`[API] Strategy ${strategy.name} failed with status: ${response.status}`);
      lastStatus = response.status;
      lastError = new Error(`HTTP ${response.status} ${response.statusText}`);
      
      // 如果是 429 (Too Many Requests)，可能所有代理都会失败，但还是继续尝试
      // 如果是 403 (Forbidden)，通常是 IP 被封或 UA 问题，切换代理通常能解决
    } catch (error) {
      console.warn(`[API] Strategy ${strategy.name} failed with error:`, error);
      lastError = error;
    }
  }

  // 如果所有策略都失败，抛出最后一个错误
  const error = lastError || new Error('All fetch strategies failed');
  (error as any).status = lastStatus || 500;
  throw error;
}
