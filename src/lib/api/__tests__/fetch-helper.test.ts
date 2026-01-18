import { fetchWithFallbacks } from '../fetch-helper';

global.fetch = jest.fn();

describe('fetchWithFallbacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('应该在直接请求成功时返回响应', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' }),
    } as Response;

    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await fetchWithFallbacks('https://example.com/api');
    
    expect(result).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('应该在直接请求失败时尝试备用策略', async () => {
    const failedResponse = {
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    } as Response;

    const successResponse = {
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' }),
    } as Response;

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(failedResponse)
      .mockResolvedValueOnce(successResponse);

    const result = await fetchWithFallbacks('https://example.com/api');
    
    expect(result).toBe(successResponse);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('应该在所有策略失败时抛出错误', async () => {
    const failedResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response;

    (global.fetch as jest.Mock).mockResolvedValue(failedResponse);

    await expect(fetchWithFallbacks('https://example.com/api')).rejects.toThrow();
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it('应该处理网络错误', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    await expect(fetchWithFallbacks('https://example.com/api')).rejects.toThrow();
  });

  it('应该处理超时错误', async () => {
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
    );

    await expect(fetchWithFallbacks('https://example.com/api')).rejects.toThrow();
  }, 10000);

  it('应该使用正确的代理 URL', async () => {
    const successResponse = {
      ok: true,
      status: 200,
    } as Response;

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 403 } as Response)
      .mockResolvedValueOnce(successResponse);

    await fetchWithFallbacks('https://example.com/api');

    const secondCall = (global.fetch as jest.Mock).mock.calls[1];
    expect(secondCall[0]).toContain('corsproxy.io');
  });

  it('应该在 429 错误时继续尝试其他策略', async () => {
    const rateLimitResponse = {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    } as Response;

    const successResponse = {
      ok: true,
      status: 200,
    } as Response;

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(rateLimitResponse)
      .mockResolvedValueOnce(successResponse);

    const result = await fetchWithFallbacks('https://example.com/api');
    
    expect(result).toBe(successResponse);
  });
});
