import { test, expect } from '@playwright/test';

test('home links to library', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Kütüphane').click();
  await expect(page).toHaveURL(/.*library/);
});
