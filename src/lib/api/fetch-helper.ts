import { ProxyAgent, fetch as undiciFetch } from 'undici';

/**
 * 本地代理配置 (Clash)
 * 生产环境不使用本地代理，只有开发环境需要
 * 如果不使用代理，设为 null 或 undefined
 */
const isProduction = process.env.NODE_ENV === 'production';
const LOCAL_PROXY_URL = isProduction ? null : (process.env.HTTP_PROXY || null);

/**
 * 通用 Fetch 辅助函数，实现多策略回退机制
 * 用于解决本地开发环境无法直接访问 Reddit API 的问题
 */
export async function fetchWithFallbacks(targetUrl: string): Promise<Response> {
  // 创建代理 Agent（仅在开发环境或配置了代理时使用）
  const proxyAgent = LOCAL_PROXY_URL ? new ProxyAgent(LOCAL_PROXY_URL) : undefined;
  
  const strategies = [
    {
      name: 'DirectWithProxy',
      getUrl: (url: string) => url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 20000,
      useProxy: true // 使用本地代理
    },
    {
      name: 'Direct',
      getUrl: (url: string) => url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 15000,
      useProxy: false
    },
    {
      name: 'AllOrigins',
      getUrl: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&timestamp=${Date.now()}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      timeout: 20000,
      useProxy: true
    },
    {
      name: 'CorsProxy',
      getUrl: (url: string) => `https://api.corsproxy.io/?url=${encodeURIComponent(url)}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      timeout: 20000,
      useProxy: true
    },
    {
      name: 'CodeTabs',
      getUrl: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      timeout: 20000,
      useProxy: true
    }
  ];

  let lastError: any;
  let lastStatus: number | undefined;

  for (const strategy of strategies) {
    try {
      console.log(`[API] Trying strategy: ${strategy.name}`);
      const controller = new AbortController();
      const timeoutMs = strategy.timeout || 15000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const url = strategy.getUrl(targetUrl);
      
      // 根据策略决定是否使用代理
      const fetchOptions: any = {
        headers: strategy.headers,
        signal: controller.signal,
      };
      
      // 如果策略要求使用代理且代理可用
      if (strategy.useProxy && proxyAgent) {
        fetchOptions.dispatcher = proxyAgent;
      }
      
      const response = await undiciFetch(url, fetchOptions) as unknown as Response;
      
      clearTimeout(timeoutId);

      if (response.ok) {
        // 验证响应内容类型 - 确保是 JSON 而不是 HTML 错误页面
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
          // 克隆响应以检查内容
          const cloned = response.clone();
          const text = await cloned.text();
          // 检查是否以 { 或 [ 开头（JSON）
          const trimmed = text.trim();
          if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
            console.warn(`[API] Strategy ${strategy.name} returned non-JSON content (Content-Type: ${contentType})`);
            lastError = new Error(`Strategy ${strategy.name} returned HTML instead of JSON`);
            continue;
          }
        }
        console.log(`[API] Strategy ${strategy.name} success`);
        return response;
      }
      
      console.warn(`[API] Strategy ${strategy.name} failed with status: ${response.status}`);
      lastStatus = response.status;
      lastError = new Error(`HTTP ${response.status} ${response.statusText}`);
      
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
