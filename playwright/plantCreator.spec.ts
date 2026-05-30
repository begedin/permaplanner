import { test, expect } from '@playwright/test';
import { createNewPlanThroughGate } from './helpers';

test.describe('plant creator', () => {
  test('creates a plant', async ({ page }) => {
    await page.goto('/');
    await createNewPlanThroughGate(page, 'new.json');

    await page.getByRole('link', { name: 'Plants' }).click();

    await page.getByPlaceholder('Uses catalog name if empty').fill('Apple');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('button', { name: 'Apple', exact: true })).toBeVisible();
  });
});
