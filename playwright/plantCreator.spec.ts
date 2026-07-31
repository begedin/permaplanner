import { createNewPlanThroughGate } from './helpers';
import { expect, test } from './test';

test.describe('plant creator', () => {
  test('creates a plant', async ({ page }) => {
    await page.goto('/');
    await createNewPlanThroughGate(page);

    await page.getByRole('link', { name: 'Plants' }).click();

    await page.getByPlaceholder('Uses catalog name if empty').fill('Apple');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('button', { name: 'Apple', exact: true })).toBeVisible();
  });
});
