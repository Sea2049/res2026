import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 测试配置
 * 
 * 配置测试环境、浏览器、报告等
 */
export default defineConfig({
  // 测试目录
  testDir: './tests',

  // 全局测试超时
  timeout: 30 * 1000,

  // 期望失败用例（预期会失败的测试）
  expect: {
    timeout: 5000,
  },

  // 并行执行配置
  fullyParallel: true,

  // 重试配置
  retries: process.env.CI ? 2 : 0,

  // 工作者数量
  workers: process.env.CI ? 1 : undefined,

  // 报告器
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // 全局依赖
  use: {
    // 基准URL（如果使用相对URL）
    baseURL: 'http://localhost:3000',

    // 跟踪操作
    trace: 'on-first-retry',

    // 截图
    screenshot: 'only-on-failure',
  },

  // 项目配置（不同浏览器）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // 运行测试后生成报告
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
