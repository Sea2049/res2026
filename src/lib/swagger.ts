/**
 * Swagger/OpenAPI 配置
 * 定义 API 文档的基础信息和配置
 */

import { createSwaggerSpec } from 'next-swagger-doc';

/**
 * 生成 OpenAPI 规范
 */
export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Reddit Insight Tool API',
        version: '2.7.0',
        description: `
## Reddit 社区洞察工具 API 文档

本 API 提供 Reddit 数据获取、NLP 分析、AI 洞察生成等功能。

### 功能模块

- **Reddit API** - 搜索、获取帖子和评论
- **Analysis API** - 产品吸引力评估、优先级计算
- **AI API** - 深度洞察生成（基于通义千问）
- **Export API** - 导出分析报告（Markdown/Excel/PDF）
- **Invite API** - 邀请码验证和管理

### 限流说明

所有 API 均有 IP 级别限流保护：
- Reddit API: 30次/分钟
- AI API: 10次/分钟
- Export API: 20次/分钟
- Invite Verify: 5次/分钟
- Admin API: 30次/分钟

超出限制将返回 429 Too Many Requests。
        `,
        contact: {
          name: 'Reddit Insight Tool',
          url: 'https://sea2049.com',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
          description: '当前服务器',
        },
        {
          url: 'https://sea2049.com',
          description: '生产环境',
        },
      ],
      tags: [
        {
          name: 'Reddit',
          description: 'Reddit 数据获取相关接口',
        },
        {
          name: 'Analysis',
          description: '数据分析相关接口',
        },
        {
          name: 'AI',
          description: 'AI 洞察生成接口',
        },
        {
          name: 'Export',
          description: '报告导出接口',
        },
        {
          name: 'Invite',
          description: '邀请码管理接口',
        },
      ],
      components: {
        securitySchemes: {
          AdminPassword: {
            type: 'apiKey',
            in: 'header',
            name: 'x-admin-password',
            description: '管理员密码（仅管理接口需要）',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              error: {
                type: 'string',
                description: '错误消息',
              },
              message: {
                type: 'string',
                description: '详细错误信息',
              },
            },
          },
          RateLimitError: {
            type: 'object',
            properties: {
              error: {
                type: 'string',
                example: 'Too Many Requests',
              },
              message: {
                type: 'string',
                example: '请求过于频繁，请在 60 秒后重试',
              },
              retryAfter: {
                type: 'integer',
                description: '重试等待时间（秒）',
                example: 60,
              },
            },
          },
          RedditPost: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              selftext: { type: 'string' },
              author: { type: 'string' },
              subreddit: { type: 'string' },
              score: { type: 'integer' },
              num_comments: { type: 'integer' },
              created_utc: { type: 'number' },
              url: { type: 'string' },
            },
          },
          RedditComment: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              author: { type: 'string' },
              body: { type: 'string' },
              score: { type: 'integer' },
              created_utc: { type: 'number' },
              parent_id: { type: 'string' },
            },
          },
          Subreddit: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              display_name: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              subscriber_count: { type: 'integer' },
              url: { type: 'string' },
            },
          },
          AppealScore: {
            type: 'object',
            properties: {
              identityFit: { type: 'number', description: '身份契合度 (0-10)' },
              problemUrgency: { type: 'number', description: '问题紧急度 (0-10)' },
              trustSignals: { type: 'number', description: '信任信号 (0-10)' },
              overall: { type: 'number', description: '综合评分' },
              recommendations: {
                type: 'array',
                items: { type: 'string' },
                description: '改进建议',
              },
            },
          },
          PriorityResult: {
            type: 'object',
            properties: {
              score: { type: 'number', description: '优先级分数' },
              level: {
                type: 'string',
                enum: ['critical', 'high', 'medium', 'low'],
                description: '优先级等级',
              },
              recommendedAction: { type: 'string', description: '建议行动' },
            },
          },
          InviteCode: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              code: { type: 'string' },
              enabled: { type: 'boolean' },
              maxUses: { type: 'integer' },
              usedCount: { type: 'integer' },
              expiresAt: { type: 'string', format: 'date-time', nullable: true },
              note: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  });
  return spec;
};
