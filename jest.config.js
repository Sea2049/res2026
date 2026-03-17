const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/',
    // fetch-helper 依赖 undici，Jest 环境下缺 ReadableStream/TextDecoder 等，暂排除；可通过 Node 18+ 或单独环境运行
    'fetch-helper\\.test\\.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
  // 覆盖率阈值策略：设定略低于当前实际水平的底线，防止倒退。
  // 当前实际值约 statements 30% / lines 31% / functions 26% / branches 23%
  // 底线：statements/lines 25%，functions 20%，branches 15%
  // 中期目标：50%；长期目标：70%
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 20,
      lines: 25,
      statements: 25,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
