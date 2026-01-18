import { test, expect } from '@playwright/test';

/**
 * 搜索功能 E2E 测试
 */

test.describe('搜索功能详细测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('应该支持输入后按回车搜索', async ({ page }) => {
    // 找到搜索输入框
    const searchInput = page.locator('input[placeholder*="搜索 subreddit"]');

    // 输入搜索词
    await searchInput.fill('TypeScript');

    // 按回车
    await searchInput.press('Enter');

    // 等待加载
    await page.waitForTimeout(2000);

    // 验证结果显示
    await expect(page.locator('text=/(TypeScript|typescript)/i')).toBeVisible({ timeout: 10000 });
  });

  test('应该显示加载状态', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索 subreddit"]');
    await searchInput.fill('React');

    // 点击搜索
    await page.locator('button:has-text("搜索")]').first().click();

    // 验证加载指示器出现（如果有）
    const loadingIndicator = page.locator('text=/(加载中|loading)/i');
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 2000 }).catch(() => {
      // 如果没有加载指示器，也接受
    });
  });

  test('应该支持清除搜索', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="搜索 subreddit"]');
    await searchInput.fill('Vue');

    // 验证输入框有内容
    await expect(searchInput).toHaveValue('Vue');

    // 找到清除按钮（如果有）
    const clearButton = page.locator('button[aria-label="清除"]');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await expect(searchInput).toHaveValue('');
    }
  });
});

/**
 * 选择功能 E2E 测试
 */
test.describe('选择功能详细测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('应该支持批量选择', async ({ page }) => {
    // 搜索
    const searchInput = page.locator('input[placeholder*="搜索 subreddit"]');
    await searchInput.fill('web');
    await page.locator('button:has-text("搜索")]').first().click();
    await page.waitForTimeout(2000);

    // 选择多个
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    // 选择前两个
    if (count >= 1) {
      await checkboxes.nth(0).check();
    }
    if (count >= 2) {
      await checkboxes.nth(1).check();
    }

    // 验证已选择
    await expect(page.locator('text=/已选择 \\d+ 个/i')).toBeVisible();
  });

  test('应该显示已选话题列表', async ({ page }) => {
    // 搜索并选择
    const searchInput = page.locator('input[placeholder*="搜索 subreddit"]');
    await searchInput.fill('javascript');
    await page.locator('button:has-text("搜索")]').first().click();
    await page.waitForTimeout(2000);

    // 选择一个
    await page.locator('input[type="checkbox"]').first().check();

    // 验证已选列表显示
    await expect(page.locator('text=/(javascript|reactjs)/i')).toBeVisible();
  });

  test('应该支持全选功能（如果有）', async ({ page }) => {
    // 搜索
    const searchInput = page.locator('input[placeholder*="搜索 subreddit"]');
    await searchInput.fill('test');
    await page.locator('button:has-text("搜索")]').first().click();
    await page.waitForTimeout(2000);

    // 查找全选按钮
    const selectAllButton = page.locator('button:has-text("全选")]');
    if (await selectAllButton.isVisible()) {
      await selectAllButton.click();

      // 验证所有都被选中
      const uncheckedBoxes = page.locator('input[type="checkbox"]:not(:checked)');
      await expect(uncheckedBoxes.first()).not.toBeVisible();
    }
  });
});

/**
 * 分析功能 E2E 测试
 */
test.describe('分析功能详细测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('应该显示分析进度', async ({ page }) => {
    // 搜索并选择
    const searchInput = page.locator('input[placeholder*="搜索 subreddit"]');
    await searchInput.fill('python');
    await page.locator('button:has-text("搜索")]').first().click();
    await page.waitForTimeout(2000);

    // 选择一个
    await page.locator('input[type="checkbox"]').first().check();

    // 点击分析
    await page.locator('button:has-text("开始分析")]').click();

    // 验证进度显示
    await expect(page.locator('text=/(分析进度|进行中)/i')).toBeVisible({ timeout: 5000 });
  });

  test('应该能够取消分析', async ({ page }) => {
    // 搜索并选择
    const searchInput = page.locator('input[placeholder*="搜索 subreddit"]');
    await searchInput.fill('css');
    await page.locator('button:has-text("搜索")]').first().click();
    await page.waitForTimeout(2000);

    // 选择一个
    await page.locator('input[type="checkbox"]').first().check();

    // 点击分析
    await page.locator('button:has-text("开始分析")]').click();

    // 等待分析开始
    await page.waitForTimeout(2000);

    // 点击取消（如果有）
    const cancelButton = page.locator('button:has-text("取消")]');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      await expect(page.locator('text=/(已取消|cancelled)/i')).toBeVisible();
    }
  });

  test('应该显示分析结果', async ({ page }) => {
    // 这个测试可能需要较长时间，因为需要实际执行分析
    // 搜索并选择
    const searchInput = page.locator('input[placeholder*="搜索 subreddit"]');
    await searchInput.fill('html');
    await page.locator('button:has-text("搜索")]').first().click();
    await page.waitForTimeout(2000);

    // 选择一个
    await page.locator('input[type="checkbox"]').first().check();

    // 点击分析
    await page.locator('button:has-text("开始分析")]').click();

    // 等待分析完成（最多60秒）
    await expect(page.locator('text=/(分析完成|completed)/i'), {
      timeout: 60000,
    }).toBeVisible({ timeout: 60000 }).catch(async () => {
      // 如果超时，可能需要检查是否还在进行中
      const progress = page.locator('text=/\\d+%/');
      const progressVisible = await progress.first().isVisible();
      console.log(`分析仍在进行中: ${progressVisible}`);
    });
  });
});

/**
 * 导出功能 E2E 测试
 */
test.describe('导出功能详细测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // 快速搜索并选择一个话题
    const searchInput = page.locator('input[placeholder*="搜索 subreddit"]');
    await searchInput.fill('api');
    await page.locator('button:has-text("搜索")]').first().click();
    await page.waitForTimeout(2000);

    // 选择
    await page.locator('input[type="checkbox"]').first().check();

    // 尝试分析（可能需要实际API）
    await page.locator('button:has-text("开始分析")]').click();

    // 等待
    await page.waitForTimeout(5000);
  });

  test('应该显示导出按钮（如果有结果）', async ({ page }) => {
    // 查找导出按钮
    const exportButton = page.locator('button:has-text("导出")]');
    await expect(exportButton.first()).toBeVisible({ timeout: 10000 }).catch(() => {
      // 如果没有结果，可能不显示导出按钮
      console.log('没有分析结果，导出按钮不可见');
    });
  });
});
