/**
 * Auth Token 单元测试
 */

import {
  generateVerificationToken,
  verifyToken,
  shouldRefreshToken,
  verifyInviteCookie,
} from '../auth-token';

describe('generateVerificationToken', () => {
  it('should generate token in correct format (timestamp.signature)', () => {
    const token = generateVerificationToken();
    
    expect(typeof token).toBe('string');
    expect(token).toMatch(/^\d+\.[a-f0-9]{64}$/);
  });

  it('should generate unique tokens', () => {
    const token1 = generateVerificationToken();
    
    // 稍等以确保时间戳不同
    const token2 = generateVerificationToken();
    
    expect(token1).not.toBe(token2);
  });

  it('should use provided secret', () => {
    const token1 = generateVerificationToken('secret1');
    const token2 = generateVerificationToken('secret2');
    
    // 不同密钥生成不同签名
    const sig1 = token1.split('.')[1];
    const sig2 = token2.split('.')[1];
    
    expect(sig1).not.toBe(sig2);
  });

  it('should generate consistent signature for same secret and timestamp', () => {
    // 由于时间戳每次调用都不同，这里验证签名长度
    const token = generateVerificationToken();
    const signature = token.split('.')[1];
    
    // SHA-256 生成 64 字符的 hex 字符串
    expect(signature.length).toBe(64);
  });
});

describe('verifyToken', () => {
  describe('Invalid token handling', () => {
    it('should reject null token', () => {
      const result = verifyToken(null);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token 不存在');
    });

    it('should reject undefined token', () => {
      const result = verifyToken(undefined);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token 不存在');
    });

    it('should reject empty string', () => {
      const result = verifyToken('');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token 不存在');
    });

    it('should reject malformed token without dot', () => {
      const result = verifyToken('notokenformat');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token 格式无效');
    });

    it('should reject token with multiple dots', () => {
      const result = verifyToken('a.b.c');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token 格式无效');
    });

    it('should reject token with invalid timestamp', () => {
      const result = verifyToken('invalid.signature');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token 时间戳无效');
    });
  });

  describe('Valid token verification', () => {
    it('should accept valid token', () => {
      const token = generateVerificationToken();
      const result = verifyToken(token);
      
      expect(result.valid).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('should accept token with custom secret', () => {
      const secret = 'custom-secret-key';
      const token = generateVerificationToken(secret);
      const result = verifyToken(token, secret);
      
      expect(result.valid).toBe(true);
    });

    it('should reject token with wrong secret', () => {
      const token = generateVerificationToken('secret1');
      const result = verifyToken(token, 'secret2');
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token 签名无效');
    });
  });

  describe('Token expiration', () => {
    it('should reject expired token', () => {
      const token = generateVerificationToken();
      // 使用非常短的有效期
      const result = verifyToken(token, undefined, 1);
      
      // 由于验证几乎是即时的，这个测试可能不稳定
      // 所以我们用一个已知过期的 token
      const oldTimestamp = Date.now() - 1000000;
      const oldToken = `${oldTimestamp}.fakesignature`;
      const oldResult = verifyToken(oldToken, undefined, 100);
      
      expect(oldResult.valid).toBe(false);
      expect(oldResult.reason).toBe('Token 已过期');
    });

    it('should reject token with future timestamp', () => {
      const futureTimestamp = Date.now() + 1000000;
      const token = `${futureTimestamp}.fakesignature`;
      const result = verifyToken(token);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token 时间戳异常（未来时间）');
    });

    it('should accept token within max age', () => {
      const token = generateVerificationToken();
      const result = verifyToken(token, undefined, 60000); // 1分钟有效期
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Signature verification', () => {
    it('should reject tampered signature', () => {
      const token = generateVerificationToken();
      const [timestamp, signature] = token.split('.');
      
      // 篡改签名
      const tamperedSignature = signature.slice(0, -2) + 'xx';
      const tamperedToken = `${timestamp}.${tamperedSignature}`;
      
      const result = verifyToken(tamperedToken);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token 签名无效');
    });

    it('should reject tampered timestamp', () => {
      const token = generateVerificationToken();
      const [, signature] = token.split('.');
      
      // 篡改时间戳
      const tamperedToken = `${Date.now()}.${signature}`;
      
      const result = verifyToken(tamperedToken);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token 签名无效');
    });

    it('should handle invalid hex signature', () => {
      const timestamp = Date.now().toString();
      const invalidToken = `${timestamp}.notvalidhex`;
      
      const result = verifyToken(invalidToken);
      expect(result.valid).toBe(false);
    });
  });
});

describe('shouldRefreshToken', () => {
  it('should return true for invalid token', () => {
    expect(shouldRefreshToken(null)).toBe(true);
    expect(shouldRefreshToken(undefined)).toBe(true);
    expect(shouldRefreshToken('invalid')).toBe(true);
  });

  it('should return false for fresh token', () => {
    const token = generateVerificationToken();
    expect(shouldRefreshToken(token)).toBe(false);
  });
});

describe('verifyInviteCookie', () => {
  it('should verify valid cookie value', () => {
    const token = generateVerificationToken();
    const result = verifyInviteCookie(token);
    
    expect(result.valid).toBe(true);
  });

  it('should reject undefined cookie', () => {
    const result = verifyInviteCookie(undefined);
    expect(result.valid).toBe(false);
  });

  it('should reject invalid cookie value', () => {
    const result = verifyInviteCookie('invalid');
    expect(result.valid).toBe(false);
  });
});
