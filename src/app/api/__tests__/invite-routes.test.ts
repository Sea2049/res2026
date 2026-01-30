/**
 * Invite API 路由单元测试
 */

import { NextRequest } from 'next/server';
import { POST as verifyPOST } from '../invite/verify/route';
import { GET as adminGET, POST as adminPOST, DELETE as adminDELETE, PATCH as adminPATCH } from '../invite/admin/route';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    inviteCode: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Mock rate-limiter
jest.mock('@/lib/rate-limiter', () => ({
  inviteVerifyRateLimiter: {
    check: jest.fn(() => ({ allowed: true })),
  },
  adminRateLimiter: {
    check: jest.fn(() => ({ allowed: true })),
  },
  checkRateLimit: jest.fn(() => null),
}));

// Mock auth-token
jest.mock('@/lib/auth-token', () => ({
  generateVerificationToken: jest.fn(() => '123456789.signature'),
}));

import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limiter';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCheckRateLimit = checkRateLimit as jest.Mock;

// 保存原始环境变量
const originalEnv = process.env;

describe('/api/invite/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(null);
    process.env = { ...originalEnv, INVITE_TOKEN_SECRET: 'test-secret' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Parameter validation', () => {
    it('should return 400 for missing code', async () => {
      const request = new NextRequest('http://localhost/api/invite/verify', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await verifyPOST(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid code format', async () => {
      const request = new NextRequest('http://localhost/api/invite/verify', {
        method: 'POST',
        body: JSON.stringify({ code: 'invalid' }),
      });
      const response = await verifyPOST(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('格式');
    });
  });

  describe('Invite code verification', () => {
    it('should return 401 for non-existent code', async () => {
      mockPrisma.inviteCode.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/invite/verify', {
        method: 'POST',
        body: JSON.stringify({ code: 'ABCD1234' }),
      });
      const response = await verifyPOST(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('无效');
    });

    it('should return 401 for disabled code', async () => {
      mockPrisma.inviteCode.findUnique.mockResolvedValue({
        id: '1',
        code: 'ABCD1234',
        enabled: false,
        maxUses: 10,
        usedCount: 0,
        expiresAt: null,
        note: null,
        createdAt: new Date(),
        usedAt: null,
      });

      const request = new NextRequest('http://localhost/api/invite/verify', {
        method: 'POST',
        body: JSON.stringify({ code: 'ABCD1234' }),
      });
      const response = await verifyPOST(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('禁用');
    });

    it('should return 401 for expired code', async () => {
      mockPrisma.inviteCode.findUnique.mockResolvedValue({
        id: '1',
        code: 'ABCD1234',
        enabled: true,
        maxUses: 10,
        usedCount: 0,
        expiresAt: new Date(Date.now() - 86400000), // Expired yesterday
        note: null,
        createdAt: new Date(),
        usedAt: null,
      });

      const request = new NextRequest('http://localhost/api/invite/verify', {
        method: 'POST',
        body: JSON.stringify({ code: 'ABCD1234' }),
      });
      const response = await verifyPOST(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('过期');
    });

    it('should return 401 for code with exhausted uses', async () => {
      mockPrisma.inviteCode.findUnique.mockResolvedValue({
        id: '1',
        code: 'ABCD1234',
        enabled: true,
        maxUses: 5,
        usedCount: 5,
        expiresAt: null,
        note: null,
        createdAt: new Date(),
        usedAt: null,
      });

      const request = new NextRequest('http://localhost/api/invite/verify', {
        method: 'POST',
        body: JSON.stringify({ code: 'ABCD1234' }),
      });
      const response = await verifyPOST(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('上限');
    });

    it('should return 200 and set cookie for valid code', async () => {
      mockPrisma.inviteCode.findUnique.mockResolvedValue({
        id: '1',
        code: 'ABCD1234',
        enabled: true,
        maxUses: 10,
        usedCount: 5,
        expiresAt: null,
        note: null,
        createdAt: new Date(),
        usedAt: null,
      });
      mockPrisma.inviteCode.update.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/invite/verify', {
        method: 'POST',
        body: JSON.stringify({ code: 'ABCD1234' }),
      });
      const response = await verifyPOST(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      
      // 验证更新了使用次数
      expect(mockPrisma.inviteCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({
            usedCount: { increment: 1 },
          }),
        })
      );
    });
  });

  describe('Rate limiting', () => {
    it('should return 429 when rate limited', async () => {
      mockCheckRateLimit.mockReturnValue(
        new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429 })
      );

      const request = new NextRequest('http://localhost/api/invite/verify', {
        method: 'POST',
        body: JSON.stringify({ code: 'ABCD1234' }),
      });
      const response = await verifyPOST(request);
      
      expect(response.status).toBe(429);
    });
  });
});

describe('/api/invite/admin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(null);
    process.env = { ...originalEnv, ADMIN_PASSWORD: 'test-admin-password' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Authentication', () => {
    it('should return 401 for missing admin password', async () => {
      const request = new NextRequest('http://localhost/api/invite/admin');
      const response = await adminGET(request);
      
      expect(response.status).toBe(401);
    });

    it('should return 401 for wrong admin password', async () => {
      const request = new NextRequest('http://localhost/api/invite/admin', {
        headers: { 'x-admin-password': 'wrong-password' },
      });
      const response = await adminGET(request);
      
      expect(response.status).toBe(401);
    });
  });

  describe('GET - List invite codes', () => {
    it('should return invite code list with correct password', async () => {
      const mockCodes = [
        { id: '1', code: 'ABCD1234', enabled: true, usedCount: 0, maxUses: 10 },
        { id: '2', code: 'EFGH5678', enabled: false, usedCount: 5, maxUses: 5 },
      ];
      mockPrisma.inviteCode.findMany.mockResolvedValue(mockCodes as any);

      const request = new NextRequest('http://localhost/api/invite/admin', {
        headers: { 'x-admin-password': 'test-admin-password' },
      });
      const response = await adminGET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
    });
  });

  describe('POST - Create invite code', () => {
    it('should create invite code with default values', async () => {
      mockPrisma.inviteCode.create.mockResolvedValue({
        id: '1',
        code: 'NEWCODE1',
        enabled: true,
        maxUses: 1,
        usedCount: 0,
        expiresAt: null,
        note: null,
        createdAt: new Date(),
        usedAt: null,
      });

      const request = new NextRequest('http://localhost/api/invite/admin', {
        method: 'POST',
        headers: { 'x-admin-password': 'test-admin-password' },
        body: JSON.stringify({}),
      });
      const response = await adminPOST(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.code).toBeDefined();
    });

    it('should create invite code with custom values', async () => {
      mockPrisma.inviteCode.create.mockResolvedValue({
        id: '1',
        code: 'NEWCODE1',
        enabled: true,
        maxUses: 10,
        usedCount: 0,
        expiresAt: new Date(),
        note: 'Test note',
        createdAt: new Date(),
        usedAt: null,
      });

      const request = new NextRequest('http://localhost/api/invite/admin', {
        method: 'POST',
        headers: { 'x-admin-password': 'test-admin-password' },
        body: JSON.stringify({ maxUses: 10, expiresInDays: 7, note: 'Test note' }),
      });
      const response = await adminPOST(request);
      
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE - Delete invite code', () => {
    it('should return 400 for missing ID', async () => {
      const request = new NextRequest('http://localhost/api/invite/admin', {
        method: 'DELETE',
        headers: { 'x-admin-password': 'test-admin-password' },
      });
      const response = await adminDELETE(request);
      
      expect(response.status).toBe(400);
    });

    it('should delete invite code', async () => {
      mockPrisma.inviteCode.delete.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/invite/admin?id=cm2o3hf7g00003b6kxwchb3ki', {
        method: 'DELETE',
        headers: { 'x-admin-password': 'test-admin-password' },
      });
      const response = await adminDELETE(request);
      
      expect(response.status).toBe(200);
    });
  });

  describe('PATCH - Toggle invite code', () => {
    it('should return 400 for missing ID or enabled', async () => {
      const request = new NextRequest('http://localhost/api/invite/admin', {
        method: 'PATCH',
        headers: { 'x-admin-password': 'test-admin-password' },
        body: JSON.stringify({}),
      });
      const response = await adminPATCH(request);
      
      expect(response.status).toBe(400);
    });

    it('should toggle invite code status', async () => {
      mockPrisma.inviteCode.update.mockResolvedValue({
        id: '1',
        code: 'ABCD1234',
        enabled: false,
      } as any);

      const request = new NextRequest('http://localhost/api/invite/admin', {
        method: 'PATCH',
        headers: { 'x-admin-password': 'test-admin-password' },
        body: JSON.stringify({ id: 'cm2o3hf7g00003b6kxwchb3ki', enabled: false }),
      });
      const response = await adminPATCH(request);
      
      expect(response.status).toBe(200);
    });
  });
});
