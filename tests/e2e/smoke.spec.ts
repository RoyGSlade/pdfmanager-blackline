import { expect, test } from '@playwright/test';

test.describe('PDFManager workbench smoke', () => {
  test('loads the generated fixture and exposes the primary workbench modes', async ({ page }) => {
    await page.goto('./');

    await expect(page.getByRole('button', { name: 'Try Sample PDF' })).toBeVisible();
    await page.getByRole('button', { name: 'Try Sample PDF' }).click();
    await expect(page.getByRole('button', { name: 'Save a Copy' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Select', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark Up', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pages', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    await expect(page.getByText(/Page Loom \(/)).toBeVisible();

    await page.getByRole('button', { name: 'Mark Up', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pages', exact: true })).toBeVisible();
  });

  test('links to Donaven’s Ko-fi page', async ({ page }) => {
    await page.goto('./');

    const support = page.getByRole('link', { name: 'Support on Ko-fi' });
    await expect(support).toHaveAttribute('href', 'https://ko-fi.com/donavencrenshaw');
  });

  test('opens privacy details from the home screen', async ({ page }) => {
    await page.goto('./');

    await page.getByRole('button', { name: 'Privacy & offline use' }).click();
    await expect(page.getByRole('dialog', { name: 'Privacy & offline use' })).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('dialog', { name: 'Privacy & offline use' })).toBeHidden();
  });

  test('verifies, downloads, and reopens a clean PDF copy', async ({ page }, testInfo) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Try Sample PDF' }).click();
    await expect(page.getByRole('button', { name: 'Save a Copy' })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Save a Copy' }).click();
    await page.getByRole('button', { name: 'Run Proof Pass' }).click();
    await expect(page.getByText('Proof Pass Verified')).toBeVisible({ timeout: 20_000 });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save Clean Copy' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/_copy\.pdf$/i);

    const downloadedPath = testInfo.outputPath(download.suggestedFilename());
    await download.saveAs(downloadedPath);

    await page.goto('./');
    await page.locator('input[type="file"]').setInputFiles(downloadedPath);
    await expect(page.getByRole('button', { name: 'Save a Copy' })).toBeVisible({ timeout: 20_000 });
  });
});
