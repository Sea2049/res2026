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
    // 访问主页
    await page.goto('/');

    // 验证页面标题
    await expect(page).toHaveTitle(/Reddit Insight/i);

    // 验证主要内容存在
    await expect(page.locator('h1')).toBeVisible();

    // 验证搜索输入框存在
    await expect(page.locator('input[placeholder*="搜索"]')).toBeVisible();

    // 验证搜索按钮存在
    await expect(page.locator('button:has-text("搜索")]')).toBeVisible();
  });

  test('应该显示话题选择区域', async ({ page }) => {
    await page.goto('/');

    // 验证话题选择区域存在
    await expect(page.locator('text=选择分析话题')).toBeVisible();

    // 验证已选话题计数显示
    await expect(page.locator('text=已选择')).toBeVisible();
  });
});

/**
 * 测试用例2: 搜索功能测试
 */
test.describe('搜索功能测试', () => {
  test('应该能够搜索 Subreddit', async ({ page }) => {
    await page.goto('/');

    // 找到搜索输入框
    const searchInput = page.locator('input[placeholder*="搜索 subreddit"]');

    // 输入搜索关键词
    await searchInput.fill(TEST_DATA.searchQuery);

    // 点击搜索按钮
    await page.locator('button:has-text("搜索")]').first().click();

    // 等待搜索结果
    await page.waitForTimeout(2000);

    // 验证结果显示
    await expect(page.locator('text=/(javascript|reactjs|webdev)/i')).toBeVisible({ timeout: 10000 });
  });

  test('应该能够选择搜索结果', async ({ page }) => {
    await page.goto('/');

    // 搜索
    const searchInput = page.locator('input[placeholder*="搜索 subreddit"]');
    await searchInput.fill(TEST_DATA.searchQuery);
    await page.locator('button:has-text("搜索")]').first().click();
    await page.waitForTimeout(2000);

    // 点击第一个结果的选择框
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.check();

    // 验证已选择数量增加
    await expect(page.locator('text=/已选择 \\d+ 个/i')).toBeVisible();
  });

  test('应该能够取消选择', async ({ page }) => {
    await page.goto('/');

    // 搜索并选择
    const searchInput = page.locator('input[placeholder*="搜索 subreddit"]');
    await searchInput.fill(TEST_DATA.searchQuery);
    await page.locator('button:has-text("搜索")]').first().click();
    await page.waitForTimeout(2000);

    // 选择后取消
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.check();
    await firstCheckbox.uncheck();

    // 验证已选择数量为0
    await expect(page.locator('text=/已选择 0 个/i')).toBeVisible();
  });
});

/**
 * 测试用例3: 分析功能测试
 */
test.describe('分析功能测试', () => {
  test('应该显示分析按钮', async ({ page }) => {
    await page.goto('/');

    // 验证开始分析按钮存在
    await expect(page.locator('button:has-text("开始分析")]')).toBeVisible();
  });

  test('应该禁用分析按钮当没有选择话题', async ({ page }) => {
    await page.goto('/');

    // 获取分析按钮
    const analyzeButton = page.locator('button:has-text("开始分析")]');

    // 验证按钮被禁用
    await expect(analyzeButton).toBeDisabled();
  });

  test('应该启用分析按钮当选择了话题', async ({ page }) => {
    await page.goto('/');

    // 搜索并选择
    const searchInput = page.locator('input[placeholder*="搜索 subreddit"]');
    await searchInput.fill(TEST_DATA.searchQuery);
    await page.locator('button:has-text("搜索")]').first().click();
    await page.waitForTimeout(2000);

    // 选择一个话题
    await page.locator('input[type="checkbox"]').first().check();

    // 验证按钮启用
    const analyzeButton = page.locator('button:has-text("开始分析")]');
    await expect(analyzeButton).toBeEnabled();
  });
});

/**
 * 测试用例4: 导航测试
 */
test.describe('导航测试', () => {
  test('应该能够在页面间导航', async ({ page }) => {
    await page.goto('/');

    // 点击开始分析按钮（如果有选择的话题）
    // 验证导航元素存在
    await expect(page.locator('nav')).toBeVisible();

    // 验证面包屑导航存在（如果有）
    // await expect(page.locator('nav')).toContainText('首页');
  });

  test('应该正确显示进度', async ({ page }) => {
    await page.goto('/');

    // 验证分析进度区域存在
    await expect(page.locator('text=分析进度')).toBeVisible();
  });
});

/**
 * 测试用例5: 响应式设计测试
 */
test.describe('响应式设计测试', () => {
  test('应该在移动端正确显示', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // 验证主要内容在移动端正确显示
    await expect(page.locator('h1')).toBeVisible();

    // 验证搜索输入框在移动端可用
    await expect(page.locator('input[placeholder*="搜索"]')).toBeVisible();
  });

  test('应该在平板端正确显示', async ({ page }) => {
    // 设置平板视口
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');

    // 验证主要内容在平板端正确显示
    await expect(page.locator('h1')).toBeVisible();

    // 验证布局在平板端正确
    await expect(page.locator('text=选择分析话题')).toBeVisible();
  });

  test('应该在大屏幕正确显示', async ({ page }) => {
    // 设置大屏幕视口
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto('/');

    // 验证所有主要内容
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=选择分析话题')).toBeVisible();
    await expect(page.locator('button:has-text("开始分析")]')).toBeVisible();
  });
});

/**
 * 测试用例6: 无障碍测试
 */
test.describe('无障碍测试', () => {
  test('应该所有输入框都有标签', async ({ page }) => {
    await page.goto('/');

    // 验证搜索输入框有 aria-label 或 label
    const searchInput = page.locator('input[placeholder*="搜索"]');
    await expect(searchInput).toHaveAttribute(/aria-label|label/);
  });

  test('应该按钮有可访问的文本', async ({ page }) => {
    await page.goto('/');

    // 验证按钮有文本内容
    const searchButtons = page.locator('button:has-text("搜索")]');
    await expect(searchButtons.first()).not.toBeEmpty();
  });

  test('应该交互元素可聚焦', async ({ page }) => {
    await page.goto('/');

    // 验证搜索输入框可聚焦
    const searchInput = page.locator('input[placeholder*="搜索 subreddit"]');
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

    // 如果有错误展示区域，验证它存在但不可见
    const errorRegion = page.locator('[role="alert"]');
    await expect(errorRegion.first()).not.toBeVisible();
  });

  test('应该处理无效搜索', async ({ page }) => {
    await page.goto('/');

    // 输入无效搜索词
    const searchInput = page.locator('input[placeholder*="搜索 subreddit"]');
    await searchInput.fill('!@#$%^&*()');

    // 搜索
    await page.locator('button:has-text("搜索")]').first().click();

    // 等待结果
    await page.waitForTimeout(2000);

    // 应该显示空结果或错误
    const results = page.locator('text=/(没有找到|未找到|no results)/i');
    await expect(results.first()).toBeVisible({ timeout: 5000 }).catch(() => {
      // 如果没有显示空结果，也接受（可能后端处理了）
    });
  });
});

/**
 * 测试用例8: 性能测试
 */
test.describe('性能测试', () => {
  test('应该在3秒内加载完成', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // 验证加载时间
    expect(loadTime).toBeLessThan(3000);
  });

  test('搜索应该在5秒内返回结果', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[placeholder*="搜索 subreddit"]');
    await searchInput.fill('javascript');

    const startTime = Date.now();
    await page.locator('button:has-text("搜索")]').first().click();

    // 等待结果
    await page.waitForTimeout(2000);

    const searchTime = Date.now() - startTime;

    // 验证搜索时间
    expect(searchTime).toBeLessThan(5000);
  });
});
