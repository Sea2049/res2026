import { ProxyAgent, fetch as undiciFetch } from 'undici';

/**
 * 本地代理配置 (Clash)
 * 如果配置了 HTTP_PROXY 环境变量，在任何环境都会尝试使用
 */
const LOCAL_PROXY_URL = process.env.HTTP_PROXY || null;

/**
 * Cloudflare Worker 代理 URL（推荐：最可靠的方案）
 * 部署方式见 scripts/cf-reddit-proxy-worker.js
 */
const CF_WORKER_PROXY = process.env.REDDIT_PROXY_URL || '';

/**
 * 从环境变量获取 CORS 代理配置
 */
const CORS_PROXY_ALLORIGINS = process.env.CORS_PROXY_ALLORIGINS || 'https://api.allorigins.win/raw';
const CORS_PROXY_IO = process.env.CORS_PROXY_IO || 'https://api.corsproxy.io';
const CORS_PROXY_CODETABS = process.env.CORS_PROXY_CODETABS || 'https://api.codetabs.com/v1/proxy';

/**
 * 通用 Fetch 辅助函数，实现多策略回退机制
 * 策略优先级：CF Worker 代理 > 本地代理直连 > 直连 > 公共 CORS 代理
 */
export async function fetchWithFallbacks(targetUrl: string): Promise<Response> {
  const proxyAgent = LOCAL_PROXY_URL ? new ProxyAgent(LOCAL_PROXY_URL) : undefined;
  
  interface FetchStrategy {
    name: string;
    getUrl: (url: string) => string;
    headers: Record<string, string>;
    timeout: number;
    useProxy: boolean;
  }
  
  const strategies: FetchStrategy[] = [];

  // 最高优先级：Cloudflare Worker 代理（如果配置了）
  if (CF_WORKER_PROXY) {
    strategies.push({
      name: 'CloudflareWorker',
      getUrl: (url: string) => `${CF_WORKER_PROXY}/?url=${encodeURIComponent(url)}`,
      headers: {
        'Accept': 'application/json',
      },
      timeout: 15000,
      useProxy: false,
    });
  }

  // 本地代理直连（如果配置了 HTTP_PROXY）
  if (proxyAgent) {
    strategies.push({
      name: 'DirectWithProxy',
      getUrl: (url: string) => url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 15000,
      useProxy: true,
    });
  }

  // 直连尝试
  strategies.push(
    {
      name: 'Direct',
      getUrl: (url: string) => url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 8000,
      useProxy: false,
    },
    {
      name: 'AllOrigins',
      getUrl: (url: string) => `${CORS_PROXY_ALLORIGINS}?url=${encodeURIComponent(url)}&timestamp=${Date.now()}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      timeout: 12000,
      useProxy: false,
    },
    {
      name: 'CorsProxy',
      getUrl: (url: string) => `${CORS_PROXY_IO}/?url=${encodeURIComponent(url)}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      timeout: 12000,
      useProxy: false,
    },
    {
      name: 'CodeTabs',
      getUrl: (url: string) => `${CORS_PROXY_CODETABS}?quest=${encodeURIComponent(url)}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      timeout: 12000,
      useProxy: false,
    },
  );

  let lastError: unknown;
  let lastStatus: number | undefined;

  for (const strategy of strategies) {
    try {
      console.log(`[API] Trying strategy: ${strategy.name}`);
      const controller = new AbortController();
      const timeoutMs = strategy.timeout || 15000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const url = strategy.getUrl(targetUrl);
      
      // 根据策略决定是否使用代理
      const fetchOptions: {
        headers: Record<string, string>;
        signal: AbortSignal;
        dispatcher?: ProxyAgent;
      } = {
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
        // 始终验证响应体是否为有效 JSON（代理可能返回 200 但内容是 HTML）
        const cloned = response.clone();
        const text = await cloned.text();
        const trimmed = text.trim();
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
          const contentType = response.headers.get('content-type') || '';
          console.warn(`[API] Strategy ${strategy.name} returned non-JSON content (Content-Type: ${contentType}, body starts with: ${trimmed.substring(0, 30)})`);
          lastError = new Error(`Strategy ${strategy.name} returned HTML instead of JSON`);
          continue;
        }
        console.log(`[API] Strategy ${strategy.name} success`);
        return response;
      }
      
      console.warn(`[API] Strategy ${strategy.name} failed with status: ${response.status}`);
      if (strategy.name === "DirectWithProxy") {
        console.warn("[API] 代理请求失败，请确认 Clash 等已开启且端口与 HTTP_PROXY 一致，并已重启 Next");
      }
      lastStatus = response.status;
      lastError = new Error(`HTTP ${response.status} ${response.statusText}`);
      
    } catch (error) {
      console.warn(`[API] Strategy ${strategy.name} failed with error:`, error);
      if (strategy.name === "DirectWithProxy") {
        console.warn("[API] 代理请求异常，请确认 Clash 等已开启且端口与 HTTP_PROXY 一致，并已重启 Next");
      }
      lastError = error;
    }
  }

  // 如果所有策略都失败，抛出最后一个错误
  const error = lastError instanceof Error 
    ? lastError 
    : new Error('All fetch strategies failed');
  (error as Error & { status?: number }).status = lastStatus || 500;
  throw error;
}

// ==================== Browser Worker 兜底扩展 ====================

/**
 * 在现有多策略兜底链之外，增加 Browser Worker 兜底能力。
 *
 * 使用方式：
 * - 如果 `options.useBrowserWorker=true` 且 `BROWSER_WORKER_URL` 已配置，
 *   则在其他所有策略失败后，将请求转发给 Browser Worker 执行。
 * - 否则行为与 fetchWithFallbacks 完全一致。
 */
export async function fetchWithBrowserWorkerFallback(
  targetUrl: string,
  options?: { useBrowserWorker?: boolean }
): Promise<Response> {
  // 先尝试所有现有策略
  try {
    return await fetchWithFallbacks(targetUrl);
  } catch (primaryError) {
    // 仅在明确要求且 Worker 已配置时才尝试兜底
    const workerUrl = process.env.BROWSER_WORKER_URL;
    if (!options?.useBrowserWorker || !workerUrl) {
      throw primaryError;
    }

    // 动态导入避免循环依赖，按需加载
    const { browserWorkerClient } = await import("./browser-worker-client");

    try {
      console.log(`[API] Trying Browser Worker fallback for: ${targetUrl}`);
      const workerResp = await browserWorkerClient.fetch({
        url: targetUrl,
        method: "GET",
        strategy_hints: {
          prefer_http_first: false,
          allow_browser_fallback: true,
        },
      });

      if (!workerResp.ok) {
        const err = new Error(
          workerResp.error_message ?? `Worker returned error: ${workerResp.error_code}`
        ) as Error & { status?: number; workerErrorCode?: string };
        err.status = workerResp.status;
        err.workerErrorCode = workerResp.error_code;
        throw err;
      }

      // 将 Worker 的 json_body 包装成标准 Response 返回
      return new Response(JSON.stringify(workerResp.json_body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (workerError) {
      console.warn("[API] Browser Worker fallback failed:", workerError);
      // 抛出原始错误，保持调用方的错误语义
      throw primaryError;
    }
  }
}
