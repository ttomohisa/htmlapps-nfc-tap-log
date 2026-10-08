// Runs in an isolated CI Chromium. Uses ordinary controls; never requests or simulates NFC hardware.
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const readable = await readFile(new URL('../dist/index.html', import.meta.url));
const compressed = await readFile(new URL('../dist/index.self-extract.html', import.meta.url));
const server = http.createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(request.url === '/compressed' ? compressed : readable);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
const base = `http://127.0.0.1:${server.address().port}`;
await mkdir('test-results', { recursive: true });
try {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 320, height: 640 }]) {
    const context = await browser.newContext({ viewport, locale: 'en-US', acceptDownloads: true });
    const page = await context.newPage();
    const errors = [], externalRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (!request.url().startsWith(base) && !request.url().startsWith('data:') && !request.url().startsWith('blob:') && !request.url().startsWith('file:')) externalRequests.push(request.url()); });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('#emptyCreateButton').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#versionBadge').textContent(), 'v1.0.1');
    const geometry = await page.evaluate(() => {
      const badge = document.querySelector('#versionBadge').getBoundingClientRect();
      const brand = document.querySelector('.brand-copy').getBoundingClientRect();
      return { width: innerWidth, content: document.documentElement.scrollWidth, badgeRight: badge.right, brandRight: brand.right };
    });
    assert.ok(geometry.content <= geometry.width, JSON.stringify(geometry));
    assert.ok(geometry.badgeRight <= geometry.brandRight + 1, JSON.stringify(geometry));
    for (const id of ['languageButton', 'helpButton']) {
      const box = await page.locator(`#${id}`).boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44, `${id}: 44px hit target`);
    }
    assert.equal(await page.locator('#languageButton').textContent(), 'JA');
    assert.equal(await page.locator('#languageButton').getAttribute('title'), 'Switch to Japanese');
    await page.locator('#emptyCreateButton').click();
    await page.locator('#createSubmitButton').click();
    assert.ok(await page.locator('#nameError').textContent());
    await page.locator('#itemName').fill('=1+1');
    await page.locator('#actionLabel').fill('Cleaned');
    await page.locator('#intervalDays').fill('7');
    await page.locator('#itemMemo').fill('Synthetic CI fixture only');
    await page.locator('#createSubmitButton').click();
    await page.locator('#detailView').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#nfcWriteButton').isVisible(), false);
    await page.locator('#recordNote').fill('+SUM(A1)');
    await page.locator('#recordNote').blur();
    await page.locator(viewport.width < 721 ? '#mobileRecordButton' : '#recordButton').click();
    await page.locator('#historyList .history-row').waitFor({ state: 'visible' });
    const download = async (button, filename) => {
      const pending = page.waitForEvent('download'); await page.locator(button).click();
      const result = await pending; assert.equal(result.suggestedFilename(), filename);
      return readFile(await result.path());
    };
    await page.locator('#qrFilename').fill('台所QR.png');
    const png = await download('#saveQrButton', '台所QR.png');
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    await page.locator('#detailBackButton').click();
    await page.locator('#csvFilename').fill('台所.CSV');
    const csv = await download('#exportCsvButton', '台所.csv');
    assert.ok(csv.toString('utf8').includes("'=1+1,Cleaned,"));
    assert.ok(csv.toString('utf8').includes("'+SUM(A1)"));
    await page.locator('#jsonFilename').fill('maintenance.json');
    const backup = JSON.parse((await download('#exportJsonButton', 'maintenance.json')).toString('utf8'));
    assert.equal(backup.items[0].name, '=1+1'); assert.equal(backup.events[0].note, '+SUM(A1)');
    const selectFile = async filename => page.locator('#restoreFileInput').setInputFiles(fileURLToPath(new URL(`fixtures/${filename}`, import.meta.url)));
    await selectFile('maintenance-backup.json');
    await page.locator('#restoreDialog').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#restoreItemCount').textContent(), '2');
    await page.locator('#applyRestoreButton').click();
    await page.locator('#restoreDialog').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#dataItemCount').textContent(), '3');
    await selectFile('maintenance-backup.json');
    await page.locator('#restoreModeReplace').check(); await page.locator('#applyRestoreButton').click();
    await page.locator('#appConfirmCancel').click();
    assert.equal(await page.locator('#restoreDialog').isVisible(), true);
    await page.locator('#cancelRestoreButton').click();
    await selectFile('invalid-backup.json');
    await page.locator('#appToastMessage').filter({ hasText: 'Could not read this backup' }).waitFor({ state: 'visible' });
    assert.equal(await page.locator('#restoreDialog').isVisible(), false);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#itemList .item-row').first().waitFor({ state: 'visible' });
    assert.equal(await page.locator('#dataItemCount').textContent(), '3');
    await page.locator('#languageButton').click();
    assert.equal(await page.locator('#languageButton').textContent(), 'EN');
    assert.equal(await page.locator('#languageButton').getAttribute('aria-label'), '英語に切り替え');
    await page.locator('#helpButton').click();
    await page.locator('#helpDialog .dialog-note').scrollIntoViewIfNeeded();
    const helpGeometry = await page.locator('#helpDialog').boundingBox();
    assert.ok(helpGeometry.y >= 0 && helpGeometry.y + helpGeometry.height <= viewport.height + 1);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#helpDialog').isVisible(), false);
    await page.screenshot({ path: `test-results/home-${viewport.width}.png`, fullPage: true });
    assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []);
    for (const url of [base + '/compressed', ...['../dist/index.html', '../nfc-tap-log.html', '../dist/index.self-extract.html'].map(relative => new URL(relative, import.meta.url).href)]) {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.locator('#homeView').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#versionBadge').textContent(), 'v1.0.1');
      assert.equal(await page.locator('#globalNotice').isVisible(), false);
      await page.locator('#helpButton').click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#helpDialog').isVisible(), false);
    }
    assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []);
    console.log(`Hardware-free UI passed at ${viewport.width}x${viewport.height}; readable/root/self-extract file:// loaded; no external requests or page errors`);
    await context.close();
  }
} finally {
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
