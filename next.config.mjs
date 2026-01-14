/**
 * Next.js 生产环境配置
 * 针对生产环境优化性能和安全设置
 */

const nextConfig = {
  // 开启 React 严格模式（生产环境建议关闭以提升性能）
  reactStrictMode: true,
  
  // 启用 SWC 编译器加速构建
  swcMinify: true,
  
  // 输出独立部署模式（减小镜像体积）
  output: 'standalone',
  
  // 图片域名配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.reddit.com',
      },
      {
        protocol: 'https',
        hostname: '*.reddit.com',
      },
    ],
  },
  
  // 生产环境优化：压缩响应
  compress: true,
  
  // 静态文件缓存策略（生产环境）
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:all*(js|css)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // 域名重定向（可选）
  async redirects() {
    return [];
  },
};

export default nextConfig;
