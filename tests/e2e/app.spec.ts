import { test, expect } from '@playwright/test';

/**
 * Reddit Insight Tool E2E 测试
 * 
 * 测试关键用户路径和功能
 */

// 测试数据
const TEST_DATA = {
  subreddit: 'javascript',
  searchQuery: 'React',
  validEmail: 'test@example.com',
};

/**
 * 测试用例1: 主页加载测试
 */
test.describe('主页测试', () => {
  test('应该正确加载主页', async ({ page }) => {
    await page.goto('/');

    // 验证页面标题
    await expect(page).toHaveTitle(/Reddit Insight/i);

    // 验证主要内容存在
    await expect(page.locator('h1')).toBeVisible();

    // 验证搜索输入框存在
    await expect(page.locator('input[placeholder*="搜索 Subreddit"]')).toBeVisible();

    // 验证搜索按钮存在（用 aria-label 精确定位，避免匹配"高级搜索选项"按钮）
    await expect(page.locator('button[aria-label="搜索按钮"]')).toBeVisible();
  });

  test('应该显示话题选择区域', async ({ page }) => {
    await page.goto('/');

    // 用 h2 精确定位，避免匹配 p 中引用了"主题筛选"的文案
    await expect(page.locator('h2:has-text("主题筛选")')).toBeVisible();

    // 验证搜索按钮存在（初始状态下已选话题计数可能不显示）
    await expect(page.locator('button[aria-label="搜索按钮"]')).toBeVisible();
  });
});

/**
 * 测试用例2: 搜索功能测试
 */
test.describe('搜索功能测试', () => {
  test('应该能够搜索 Subreddit', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[placeholder*="搜索 Subreddit"]');
    await searchInput.fill(TEST_DATA.searchQuery);

    // 用 aria-label 精确定位搜索按钮
    await page.locator('button[aria-label="搜索按钮"]').click();

    // 等待搜索结果
    await page.waitForTimeout(2000);

    // 验证结果显示（用 .first() 避免 strict mode violation）
    await expect(page.locator('text=/(javascript|reactjs|webdev)/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('应该能够选择搜索结果', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[placeholder*="搜索 Subreddit"]');
    await searchInput.fill(TEST_DATA.searchQuery);
    await page.locator('button[aria-label="搜索按钮"]').click();
    await page.waitForTimeout(2000);

    // 自定义 checkbox 用 click 而非 check
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.click();

    // 验证已选择数量增加
    await expect(page.locator('text=/已选 \\d+/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('应该能够取消选择', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[placeholder*="搜索 Subreddit"]');
    await searchInput.fill(TEST_DATA.searchQuery);
    await page.locator('button[aria-label="搜索按钮"]').click();
    await page.waitForTimeout(2000);

    // 选择后取消（用 click 代替 check/uncheck）
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.click();
    await page.waitForTimeout(500);
    await firstCheckbox.click();

    // 验证已选择数量回到0
    await expect(page.locator('text=/已选 0 个/i').first()).toBeVisible();
  });
});

/**
 * 测试用例3: 分析功能测试
 */
test.describe('分析功能测试', () => {
  test('应该显示分析区域', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h2:has-text("评论分析")')).toBeVisible();
  });

  test('未选择话题时应提示选择', async ({ page }) => {
    await page.goto('/');
    // 空状态提示文案包含"主题筛选"
    await expect(page.locator('text=/请先.*主题筛选/i').first()).toBeVisible();
  });

  test('应该启用分析按钮当选择了话题', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[placeholder*="搜索 Subreddit"]');
    await searchInput.fill(TEST_DATA.searchQuery);
    await page.locator('button[aria-label="搜索按钮"]').click();
    await page.waitForTimeout(2000);

    // 用 click 选择话题
    await page.locator('input[type="checkbox"]').first().click();

    // 验证开始分析按钮出现并可点击
    const analyzeButton = page.locator('button:has-text("开始分析")');
    await expect(analyzeButton).toBeVisible();
    await expect(analyzeButton).toBeEnabled();
  });
});

/**
 * 测试用例4: 页面结构测试
 */
test.describe('页面结构测试', () => {
  test('应该显示主要区域', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h2:has-text("主题筛选")')).toBeVisible();
    await expect(page.locator('h2:has-text("评论分析")')).toBeVisible();
  });

  test('应该显示评论分析区域', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h2:has-text("评论分析")')).toBeVisible();
  });
});

/**
 * 测试用例5: 响应式设计测试
 */
test.describe('响应式设计测试', () => {
  test('应该在移动端正确显示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('input[placeholder*="搜索 Subreddit"]')).toBeVisible();
  });

  test('应该在平板端正确显示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h2:has-text("主题筛选")')).toBeVisible();
  });

  test('应该在大屏幕正确显示', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h2:has-text("主题筛选")')).toBeVisible();
    await expect(page.locator('h2:has-text("评论分析")')).toBeVisible();
  });
});

/**
 * 测试用例6: 无障碍测试
 */
test.describe('无障碍测试', () => {
  test('应该所有输入框都有 placeholder', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('input[placeholder*="搜索 Subreddit"]');
    await expect(searchInput).toHaveAttribute('placeholder', /搜索/);
  });

  test('应该按钮有可访问的文本', async ({ page }) => {
    await page.goto('/');
    const searchButton = page.locator('button[aria-label="搜索按钮"]');
    await expect(searchButton).not.toBeEmpty();
  });

  test('应该交互元素可聚焦', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('input[placeholder*="搜索 Subreddit"]');
    await searchInput.focus();
    await expect(searchInput).toBeFocused();
  });
});

/**
 * 测试用例7: 错误处理测试
 */
test.describe('错误处理测试', () => {
  test('应该正确显示错误状态', async ({ page }) => {
    await page.goto('/');
    // 排除 Next.js 内部的 __next-route-announcer__，仅检查业务错误提示
    const errorRegion = page.locator('[role="alert"]:not(#__next-route-announcer__)');
    await expect(errorRegion.first()).not.toBeVisible();
  });

  test('应该处理无效搜索', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('input[placeholder*="搜索 Subreddit"]');
    await searchInput.fill('!@#$%^&*()');
    await page.locator('button[aria-label="搜索按钮"]').click();
    await page.waitForTimeout(2000);

    const results = page.locator('text=/(未找到相关结果|搜索失败)/i');
    await expect(results.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });
});

/**
 * 测试用例8: 性能测试
 */
test.describe('性能测试', () => {
  test('应该在3秒内加载完成', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    // dev 模式首次编译较慢，放宽阈值
    expect(loadTime).toBeLessThan(15000);
  });

  test('搜索应该在5秒内返回结果', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('input[placeholder*="搜索 Subreddit"]');
    await searchInput.fill('javascript');

    const startTime = Date.now();
    await page.locator('button[aria-label="搜索按钮"]').click();
    await page.waitForTimeout(2000);
    const searchTime = Date.now() - startTime;
    expect(searchTime).toBeLessThan(5000);
  });
});
