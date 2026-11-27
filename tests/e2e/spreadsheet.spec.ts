import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { strFromU8, unzipSync } from 'fflate';
import { PDFDocument, StandardFonts } from 'pdf-lib';

async function accountScan(page: Page, lined: boolean, pageCount: number) {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) {
    const image = await page.evaluate(({ pageIndex, ruled }) => {
      const canvas = document.createElement('canvas');
      canvas.width = 2400;
      canvas.height = 3200;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fbfaf8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const left = 155;
      const top = 250;
      const rowHeight = 53;
      const rows = ruled ? 50 : 8;
      const edges = ruled ? [left, 640, 1470, 2210] : [left, 820, 1690, 2210];
      if (ruled) {
        ctx.strokeStyle = '#777c7a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let row = 0; row <= rows + 1; row++) {
          const y = top + row * rowHeight;
          ctx.moveTo(left, y);
          ctx.lineTo(edges[3], y);
        }
        for (const x of edges) {
          ctx.moveTo(x, top);
          ctx.lineTo(x, top + (rows + 1) * rowHeight);
        }
        ctx.stroke();
      }
      ctx.fillStyle = '#171a18';
      ctx.font = 'bold 37px Arial';
      ['Account ID', 'Customer', 'Status'].forEach((value, column) => ctx.fillText(value, edges[column] + 25, top + 38));
      ctx.font = '35px Arial';
      for (let row = 0; row < rows; row++) {
        const number = pageIndex * rows + row + 1;
        const values = [String(number).padStart(6, '0'), number === 3 ? '' : 'River West', 'Open'];
        values.forEach((value, column) => ctx.fillText(value, edges[column] + 25, top + (row + 1) * rowHeight + 38));
      }
      return canvas.toDataURL('image/jpeg', 0.88);
    }, { pageIndex: index, ruled: lined });
    const raster = await pdf.embedJpg(image);
    pdf.addPage([600, 800]).drawImage(raster, { x: 0, y: 0, width: 600, height: 800 });
  }
  return Buffer.from(await pdf.save());
}

async function openTable(page: Page, filename: string, bytes: Buffer) {
  await page.locator('input[type="file"]').setInputFiles({ name: filename, mimeType: 'application/pdf', buffer: bytes });
  await page.getByRole('button', { name: 'PDF to spreadsheet', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'PDF to spreadsheet' });
  await dialog.getByRole('button', { name: 'Read table' }).click();
  return dialog;
}

test('reconstructs a 200-account image-only packet and exports the reviewed table', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.goto('./');
  const origin = new URL(page.url()).origin;
  const external: string[] = [];
  page.on('request', request => {
    const target = new URL(request.url());
    if (target.protocol.startsWith('http') && target.origin !== origin) external.push(target.origin);
  });
  const dialog = await openTable(page, 'account-packet.pdf', await accountScan(page, true, 4));
  await expect(dialog.getByText(/^200 rows · 3 columns/)).toBeVisible({ timeout: 150_000 });
  await expect(dialog.getByLabel('Column 1 header')).toHaveValue('Account ID');
  await dialog.getByLabel('Column 1 header').fill('Work queue ID');
  await expect(dialog.getByLabel('Row 4, Customer', { exact: false })).toHaveValue('');
  await dialog.getByLabel('Row 2, Customer', { exact: false }).fill('River, "West"');

  await dialog.getByLabel('PDF page').selectOption('4');
  await expect(dialog.getByLabel('Row 51, Work queue ID', { exact: false })).toHaveValue('000200');
  await dialog.getByLabel('PDF page').selectOption('1');
  await dialog.screenshot({ path: testInfo.outputPath('review-desktop.png') });

  const csvEvent = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download CSV' }).click();
  const csv = await csvEvent;
  const csvText = await readFile((await csv.path())!, 'utf8');
  const lines = csvText.trimEnd().split('\r\n');
  expect(lines).toHaveLength(201);
  expect(lines[0]).toBe('\uFEFF"Work queue ID","Customer","Status"');
  expect(lines[1]).toBe('"000001","River, ""West""","Open"');
  expect(lines[3]).toBe('"000003","","Open"');
  expect(lines.map(line => line.match(/^"(\d{6})"/)?.[1]).slice(1))
    .toEqual(Array.from({ length: 200 }, (_, index) => String(index + 1).padStart(6, '0')));

  const excelEvent = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download Excel' }).click();
  const excel = await excelEvent;
  expect(excel.suggestedFilename()).toBe('account-packet.xlsx');
  const workbook = unzipSync(await readFile((await excel.path())!));
  const sheet = strFromU8(workbook['xl/worksheets/sheet1.xml']);
  const strings = workbook['xl/sharedStrings.xml'] ? strFromU8(workbook['xl/sharedStrings.xml']) : sheet;
  expect(sheet.match(/<row\b/g)).toHaveLength(201);
  expect(strings).toContain('000001');
  expect(strings).toContain('000200');
  expect(sheet).not.toContain('<f>');
  expect(external).toEqual([]);
});

test('reviews a borderless scan and changes its column dividers at phone width', async ({ page }, testInfo) => {
  test.setTimeout(100_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  const dialog = await openTable(page, 'borderless.pdf', await accountScan(page, false, 1));
  await expect(dialog.getByText(/^8 rows · 3 columns/)).toBeVisible({ timeout: 75_000 });
  await expect(dialog.getByLabel('Row 2, Customer', { exact: false })).toHaveValue('River West');
  await dialog.getByRole('button', { name: 'Adjust columns' }).click();
  await expect(dialog.locator('canvas')).toBeVisible();
  const firstDivider = dialog.getByLabel('Divider 1 position');
  await firstDivider.fill('29');
  await expect(firstDivider).toHaveValue('29');
  await dialog.screenshot({ path: testInfo.outputPath('columns-phone.png') });
  await dialog.getByRole('button', { name: 'Review rows' }).click();
  await expect(dialog.getByLabel('Row 2, Customer', { exact: false })).toHaveValue('River West');
  await dialog.getByLabel('Column 2 header').fill('Customer name');
  await dialog.getByLabel('Remove row 9').click();
  await expect(dialog.getByText(/^7 rows · 3 columns/)).toBeVisible();
});

test('reads a selectable table and escapes formula-like CSV values', async ({ page }) => {
  await page.goto('./');
  const pdf = await PDFDocument.create();
  const sheet = pdf.addPage([600, 800]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const values = [['Account ID', 'Name', 'Status'], ['001020', 'First name', 'Open'], ['001021', '=1+2', 'Hold']];
  values.forEach((row, index) => row.forEach((text, column) =>
    sheet.drawText(text, { x: [55, 235, 425][column], y: 730 - index * 24, font, size: 12 })));
  const dialog = await openTable(page, 'digital.pdf', Buffer.from(await pdf.save()));
  await expect(dialog.getByLabel('PDF page').locator('option')).toHaveText('1 · PDF text');
  await expect(dialog.getByText(/^2 rows · 3 columns/)).toBeVisible();
  const csvEvent = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download CSV' }).click();
  const download = await csvEvent;
  expect(await readFile((await download.path())!, 'utf8')).toContain('"001021","\'=1+2","Hold"');
});
