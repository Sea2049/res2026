/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/capacity/**/*.test.ts"],
  // 50 min 全局超时，各场景的 it 级别超时由测试文件自行控制
  testTimeout: 50 * 60 * 1000,
  // 场景串行执行，避免多场景并发争抢 worker 资源
  maxConcurrency: 1,
  maxWorkers: 1,
  // 不收集覆盖率（压测场景不关注覆盖）
  collectCoverage: false,
  reporters: [
    "default",
    ...(process.env["CI"]
      ? [
          [
            "jest-junit",
            {
              outputDirectory: "reports/capacity",
              outputName: "capacity-results.xml",
              classNameTemplate: "{classname}",
              titleTemplate: "{title}",
              ancestorSeparator: " > ",
              addFileAttribute: "true",
            },
          ],
        ]
      : []),
  ],
  globals: {
    "ts-jest": {
      tsconfig: {
        // 允许 es2020 特性（fetch、crypto.randomUUID 等）
        target: "ES2020",
        module: "commonjs",
        esModuleInterop: true,
        resolveJsonModule: true,
        strict: false,
      },
    },
  },
};
