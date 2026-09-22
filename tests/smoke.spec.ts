import { expect, test } from '@playwright/test';

const scenes = ['test', 'title', 'intro', 'barrel', 'illusion', 'boss', 'ending', 'gallery'] as const;

for (const scene of scenes) {
  test(`loads ${scene}`, async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto(`/?scene=${scene}`);
    await expect(page.locator('canvas')).toHaveCount(1);
    await page.waitForTimeout(2_000);
    expect(errors).toEqual([]);
  });
}
