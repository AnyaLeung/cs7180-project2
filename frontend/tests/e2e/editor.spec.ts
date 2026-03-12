import { test, expect } from '@playwright/test';

test.describe('Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
    await page.getByText('analysis_plan.py').click();
    await expect(page).toHaveURL(/\/editor/, { timeout: 5000 });
  });

  test('renders CodeMirror editor with Python content', async ({ page }) => {
    const editor = page.locator('.cm-content');
    await expect(editor).toBeVisible({ timeout: 5000 });
    await expect(editor).toContainText('Step 1');
  });

  test('shows file list sidebar', async ({ page }) => {
    await expect(page.getByText('Files')).toBeVisible();
    await expect(page.getByText('analysis_plan.py')).toBeVisible();
    await expect(page.getByText('data_cleaning.py')).toBeVisible();
  });

  test('can switch files via sidebar', async ({ page }) => {
    await page.getByRole('button', { name: 'data_cleaning.py' }).click();
    await expect(page).toHaveURL(/\/editor\/file-2/, { timeout: 5000 });
    const editor = page.locator('.cm-content');
    await expect(editor).toContainText('Read raw data', { timeout: 5000 });
  });

  test('shows InstructScan branding in header', async ({ page }) => {
    await expect(page.getByText('InstructScan')).toBeVisible();
  });
});
