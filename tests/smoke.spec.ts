import { expect, test } from '@playwright/test';

declare const process: {
  env: Record<string, string | undefined>;
};

const prodScenes = ['title', 'intro', 'barrel', 'illusion', 'boss', 'ending'] as const;
const devScenes = ['test', ...prodScenes, 'gallery'] as const;
const scenes = process.env.SMOKE_PROD === '1' ? prodScenes : devScenes;

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
