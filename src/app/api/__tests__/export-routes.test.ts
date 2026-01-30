/**
 * Export API 路由单元测试
 */

import { NextRequest } from 'next/server';
import { POST as exportPOST } from '../export/route';
import { POST as excelPOST } from '../export/excel/route';
import { POST as pdfPOST } from '../export/pdf/route';

// Mock rate-limiter
jest.mock('@/lib/rate-limiter', () => ({
  exportRateLimiter: {
    check: jest.fn(() => ({ allowed: true })),
  },
  checkRateLimit: jest.fn(() => null),
}));

import { checkRateLimit } from '@/lib/rate-limiter';

const mockCheckRateLimit = checkRateLimit as jest.Mock;

describe('/api/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(null);
  });

  describe('Parameter validation', () => {
    it('should return 400 for missing content', async () => {
      const request = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({ filename: 'test.txt' }),
      });
      const response = await exportPOST(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('内容');
    });

    it('should return 400 for invalid filename', async () => {
      const request = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({ content: 'test', filename: '../etc/passwd' }),
      });
      const response = await exportPOST(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('文件名');
    });

    it('should return 400 for invalid export format', async () => {
      const request = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({ content: 'test', filename: 'test.txt', format: 'invalid' }),
      });
      const response = await exportPOST(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('格式');
    });
  });

  describe('File format handling', () => {
    it('should export as markdown with correct headers', async () => {
      const request = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          content: '# Test\n\nContent',
          filename: 'report',
          format: 'md',
        }),
      });
      const response = await exportPOST(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/markdown');
      expect(response.headers.get('Content-Disposition')).toContain('report.md');
    });

    it('should export as plain text with correct headers', async () => {
      const request = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Plain text content',
          filename: 'report',
          format: 'txt',
        }),
      });
      const response = await exportPOST(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/plain');
      expect(response.headers.get('Content-Disposition')).toContain('report.txt');
    });

    it('should export as JSON with correct headers', async () => {
      const request = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          content: '{"key": "value"}',
          filename: 'data',
          format: 'json',
        }),
      });
      const response = await exportPOST(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');
      expect(response.headers.get('Content-Disposition')).toContain('data.json');
    });

    it('should add extension if not present', async () => {
      const request = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          content: 'test',
          filename: 'report',
          format: 'md',
        }),
      });
      const response = await exportPOST(request);
      
      expect(response.headers.get('Content-Disposition')).toContain('.md');
    });

    it('should not duplicate extension', async () => {
      const request = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          content: 'test',
          filename: 'report.md',
          format: 'md',
        }),
      });
      const response = await exportPOST(request);
      
      const disposition = response.headers.get('Content-Disposition') || '';
      expect(disposition).toContain('report.md');
      expect(disposition).not.toContain('report.md.md');
    });

    it('should include UTF-8 BOM in response', async () => {
      const request = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          content: '中文内容',
          filename: '报告.txt',
          format: 'txt',
        }),
      });
      const response = await exportPOST(request);
      
      expect(response.status).toBe(200);
      const text = await response.text();
      // BOM is \uFEFF
      expect(text.charCodeAt(0)).toBe(0xFEFF);
    });
  });

  describe('Rate limiting', () => {
    it('should return 429 when rate limited', async () => {
      mockCheckRateLimit.mockReturnValue(
        new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429 })
      );

      const request = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({ content: 'test', filename: 'test.txt' }),
      });
      const response = await exportPOST(request);
      
      expect(response.status).toBe(429);
    });
  });
});

describe('/api/export/excel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(null);
  });

  describe('Parameter validation', () => {
    it('should return 400 for missing base64', async () => {
      const request = new NextRequest('http://localhost/api/export/excel', {
        method: 'POST',
        body: JSON.stringify({ filename: 'test.xlsx' }),
      });
      const response = await excelPOST(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('参数');
    });

    it('should return 400 for missing filename', async () => {
      const request = new NextRequest('http://localhost/api/export/excel', {
        method: 'POST',
        body: JSON.stringify({ base64: 'dGVzdA==' }),
      });
      const response = await excelPOST(request);
      
      expect(response.status).toBe(400);
    });
  });

  describe('Successful export', () => {
    it('should return Excel file with correct headers', async () => {
      // Base64 encoded "test"
      const base64Content = Buffer.from('test').toString('base64');
      
      const request = new NextRequest('http://localhost/api/export/excel', {
        method: 'POST',
        body: JSON.stringify({ base64: base64Content, filename: 'report.xlsx' }),
      });
      const response = await excelPOST(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(response.headers.get('Content-Disposition')).toContain('report.xlsx');
    });
  });
});

describe('/api/export/pdf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(null);
  });

  describe('Parameter validation', () => {
    it('should return 400 for missing base64', async () => {
      const request = new NextRequest('http://localhost/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify({ filename: 'test.pdf' }),
      });
      const response = await pdfPOST(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('PDF 数据');
    });
  });

  describe('Successful export', () => {
    it('should return PDF file with correct headers', async () => {
      // Base64 encoded "test"
      const base64Content = Buffer.from('test').toString('base64');
      
      const request = new NextRequest('http://localhost/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify({ base64: base64Content, filename: 'report.pdf' }),
      });
      const response = await pdfPOST(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Content-Disposition')).toContain('report.pdf');
    });

    it('should use default filename if not provided', async () => {
      const base64Content = Buffer.from('test').toString('base64');
      
      const request = new NextRequest('http://localhost/api/export/pdf', {
        method: 'POST',
        body: JSON.stringify({ base64: base64Content }),
      });
      const response = await pdfPOST(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Disposition')).toContain('AI-Deep-Insights-Report');
    });
  });
});
