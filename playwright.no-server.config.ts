import baseConfig from './playwright.config';

/**
 * 不启动 dev 服务，仅连接已有 localhost:3001（用于本地已运行 npm run dev 时）
 */
export default {
  ...baseConfig,
  webServer: undefined,
};
