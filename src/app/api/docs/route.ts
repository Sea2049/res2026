/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: 获取 OpenAPI 规范
 *     description: 返回完整的 OpenAPI 3.0 规范 JSON，用于 Swagger UI 渲染
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: OpenAPI 规范 JSON
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */

import { NextResponse } from 'next/server';
import { getApiDocs } from '@/lib/swagger';

export async function GET() {
  try {
    const spec = await getApiDocs();
    return NextResponse.json(spec);
  } catch (error) {
    console.error('生成 API 文档失败:', error);
    return NextResponse.json(
      { error: '生成 API 文档失败' },
      { status: 500 }
    );
  }
}
