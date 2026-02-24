'use client';

/**
 * Swagger UI 文档页面
 * 提供可视化的 API 文档界面
 */

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSpec() {
      try {
        const response = await fetch('/api/docs');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setSpec(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载 API 文档失败');
      }
    }
    fetchSpec();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="bg-card border border-border p-8 rounded-lg shadow-md">
          <h1 className="text-xl font-bold text-red-600 mb-2">加载失败</h1>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-reddit-orange text-white rounded hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-reddit-orange/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-reddit-orange mx-auto"></div>
          <p className="mt-4 text-muted-foreground">加载 API 文档…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="swagger-wrapper">
      <style jsx global>{`
        .swagger-wrapper {
          background: hsl(var(--background));
        }
        .swagger-ui .topbar {
          display: none;
        }
        .swagger-ui .info {
          margin: 20px 0;
        }
        .swagger-ui .info .title {
          color: hsl(var(--foreground));
        }
        .swagger-ui .scheme-container {
          background: hsl(var(--card));
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
      `}</style>
      <SwaggerUI spec={spec} />
    </div>
  );
}
