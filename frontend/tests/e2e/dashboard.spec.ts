import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
  });

  test('shows file list after login', async ({ page }) => {
    await expect(page.getByText('analysis_plan.py')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('data_cleaning.py')).toBeVisible();
  });

  test('shows file uploader', async ({ page }) => {
    await expect(page.getByText(/drop .py file here/i)).toBeVisible();
  });

  test('navigates to editor when file is clicked', async ({ page }) => {
    await page.getByText('analysis_plan.py').click();
    await expect(page).toHaveURL(/\/editor\/file-1/, { timeout: 5000 });
  });

  test('shows sign out button', async ({ page }) => {
    await expect(page.getByText(/sign out/i)).toBeVisible();
  });
});
