const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/index.template.html'), 'utf8');
function fn(name) {
  const start = source.search(new RegExp(`^      (?:async )?function ${name}\\(`, 'm'));
  assert.notEqual(start, -1, `Missing ${name}`);
  const tail = source.slice(start);
  const next = tail.slice(1).search(/^      (?:async )?function \w+\(/m);
  return next < 0 ? tail : tail.slice(0, next + 1);
}
function sandbox(names, extra = {}) {
  const context = vm.createContext({ console: { error() {} }, ...extra });
  vm.runInContext(names.map(fn).join('\n'), context);
  return context;
}

test('CSV neutralizes formula prefixes including leading whitespace, without changing stored values', () => {
  const c = sandbox(['csvCell', 'createBackupDocument'], { APP_CONFIG: { slug: 'nfc-tap-log', version: '1.0.1' } });
  for (const value of ['=1+1', '+SUM(A1)', '-1+2', '@SUM(A1)', '\t=1+1', '\r=1+1', '  =1+1']) {
    const result = c.csvCell(value);
    assert.ok(result.startsWith("'") || result.startsWith('"\''), result);
  }
  assert.equal(c.csvCell('お掃除'), 'お掃除');
  assert.equal(c.csvCell('a,"b"'), '"a,""b"""');
  const items = [{ name: '=1+1' }], events = [{ note: '+SUM(A1)' }];
  assert.equal(c.createBackupDocument(items, events).items[0].name, '=1+1');
  assert.equal(events[0].note, '+SUM(A1)');
});

test('Export filenames preserve Unicode and normalize blank, traversal, reserved names and extensions', () => {
  const c = sandbox(['safeExportFilename']);
  for (const [input, ext, expected] of [
    ['台所の記録', 'csv', '台所の記録.csv'], ['weekly.CSV', 'csv', 'weekly.csv'],
    ['backup.json', 'json', 'backup.json'], ['photo.png', 'png', 'photo.png'],
    ['report.txt', 'csv', 'report.csv'], ['../../daily\\log', 'csv', 'daily_log.csv'],
    ['  ', 'json', 'backup.json'], ['<>:"/\\|?*\u0000', 'json', 'backup.json'],
    ['CON', 'json', '_CON.json'], ['name.  ', 'csv', 'name.csv']
  ]) assert.equal(c.safeExportFilename(input, ext, 'backup'), expected);
  assert.ok(c.safeExportFilename('記'.repeat(200), 'csv', 'backup').length <= 124);
});

function restoreSandbox() {
  const elements = new Map();
  const $ = id => {
    if (!elements.has(id)) elements.set(id, { textContent: '', checked: false, disabled: false, open: false, showModal() { this.open = true; }, close() { this.open = false; }, focus() {} });
    return elements.get(id);
  };
  const toasts = [], writes = [];
  const c = sandbox(['loadRestoreFile', 'closeRestoreDialog', 'applyRestore'], {
    $, tr: key => key, showToast: message => toasts.push(message), requestAnimationFrame: cb => cb(),
    validateBackupDocument: value => { if (!value.valid) throw Error('Invalid backup'); return value; },
    renderRestorePreview() {}, document: { querySelector: () => ({ value: 'merge' }) },
    mergeBackupRecords: async (items, events) => { writes.push({ items, events }); return { itemsAdded: items.length, eventsAdded: events.length }; },
    refreshHomeSummary: async () => {},
  });
  vm.runInContext('let pendingRestore = null; let restoreGeneration = 0; let restoreBusy = false; let homeSearchQuery = "";', c);
  return { c, $, toasts, writes, pending: () => vm.runInContext('pendingRestore', c) };
}
const backup = name => JSON.stringify({ valid: true, name, items: [], events: [] });
const file = (name, text) => ({ name, size: 100, text: () => Promise.resolve(text) });

test('Older successful restore reads cannot replace a newer selected file', async () => {
  const { c, pending } = restoreSandbox();
  let resolveOld;
  const old = c.loadRestoreFile({ name: 'old.json', size: 100, text: () => new Promise(r => resolveOld = r) });
  await c.loadRestoreFile(file('new.json', backup('new')));
  resolveOld(backup('old')); await old;
  assert.equal(pending().fileName, 'new.json');
});

test('Stale restore errors cannot clear the newer valid backup', async () => {
  const { c, pending, toasts } = restoreSandbox();
  let rejectOld;
  const old = c.loadRestoreFile({ name: 'old.json', size: 100, text: () => new Promise((_, r) => rejectOld = r) });
  await c.loadRestoreFile(file('new.json', backup('new')));
  rejectOld(Error('old read failed')); await old;
  assert.equal(pending()?.fileName, 'new.json');
  assert.deepEqual(toasts, []);
});

test('Cancel invalidates pending restore reads and oversized selections clear stale previews', async () => {
  const { c, pending, $ } = restoreSandbox();
  let resolveOld;
  const old = c.loadRestoreFile({ name: 'old.json', size: 100, text: () => new Promise(r => resolveOld = r) });
  c.closeRestoreDialog(); resolveOld(backup('old')); await old;
  assert.equal(pending(), null);
  assert.equal($('#restoreDialog').open, false);
  await c.loadRestoreFile(file('valid.json', backup('valid')));
  await c.loadRestoreFile({ name: 'large.json', size: 26 * 1024 * 1024 });
  assert.equal(pending(), null);
  assert.equal($('#restoreDialog').open, false);
});

test('Repeated Restore clicks apply a backup only once', async () => {
  const { c, writes } = restoreSandbox();
  await c.loadRestoreFile(file('valid.json', backup('valid')));
  await Promise.all([c.applyRestore(), c.applyRestore()]);
  assert.equal(writes.length, 1);
});

test('Header toggles name target languages and localizes language title', () => {
  assert.match(fn('applyLanguage'), /language === 'ja' \? 'EN' : 'JA'/);
  assert.match(fn('applyLanguage'), /languageButton.*\.title\s*=/);
  assert.match(source, /localBadge: '完全ローカル処理'/);
  assert.match(source, /localBadge: 'Fully local processing'/);
});

test('Every file export uses an editable filename with a fixed extension', () => {
  for (const id of ['csvFilename', 'jsonFilename', 'qrFilename']) assert.match(source, new RegExp(`id="${id}"`));
  assert.match(fn('exportHistoryCsv'), /safeExportFilename\(\$\('#csvFilename'\)\.value/);
  assert.match(fn('exportJsonBackup'), /safeExportFilename\(\$\('#jsonFilename'\)\.value/);
  assert.match(fn('saveQrCode'), /safeExportFilename\(\$\('#qrFilename'\)\.value/);
});

test('CSV and JSON exports use custom filenames and preserve complete backup records', async () => {
  const records = [{ id: 'item_0001', name: '=1+1', actionLabel: '掃除した', memo: 'fixture' }];
  const events = [{ id: 'event_0001', itemId: 'item_0001', performedAt: '2026-10-08T00:00:00.000Z', note: '+SUM(A1)' }];
  const downloads = [];
  const c = sandbox(['safeExportFilename', 'csvCell', 'exportHistoryCsv', 'createBackupDocument', 'exportJsonBackup'], {
    APP_CONFIG: { slug: 'nfc-tap-log', version: '1.0.1' }, Blob,
    $: id => ({ value: id === '#csvFilename' ? '台所.CSV' : 'weekly.json' }),
    getAllItems: async () => records, getAllEvents: async () => events,
    tr: key => key, showToast() {}, downloadBlob: (blob, filename) => downloads.push({ blob, filename }),
  });
  await c.exportHistoryCsv(); await c.exportJsonBackup();
  assert.equal(downloads[0].filename, '台所.csv');
  assert.equal(await downloads[0].blob.text(), "item,action,date,note\r\n'=1+1,掃除した,2026-10-08T00:00:00.000Z,'+SUM(A1)\r\n");
  assert.equal(downloads[1].filename, 'weekly.json');
  const backup = JSON.parse(await downloads[1].blob.text());
  assert.deepEqual(backup.items, records); assert.deepEqual(backup.events, events);
});

test('QR export captures its custom filename before asynchronous PNG generation', async () => {
  let finish;
  const field = { value: '台所QR.png' }, downloads = [];
  const c = sandbox(['safeExportFilename', 'saveQrCode'], {
    currentItem: { id: 'item_0001' }, $: () => field,
    document: { createElement: () => ({}) }, buildTagUrl: () => 'https://example.test/#fixture', drawQrCanvas() {},
    canvasToBlob: () => new Promise(r => finish = r),
    downloadBlob: (_, filename) => downloads.push(filename), tr: key => key, showToast() {},
  });
  const pending = c.saveQrCode(); field.value = 'another item'; finish({}); await pending;
  assert.deepEqual(downloads, ['台所QR.png']);
});

test('A newer malformed restore clears the previous valid preview without writing', async () => {
  const { c, pending, $, writes } = restoreSandbox();
  await c.loadRestoreFile(file('valid.json', backup('valid')));
  await c.loadRestoreFile(file('invalid.json', 'not json'));
  assert.equal(pending(), null); assert.equal($('#restoreDialog').open, false);
  await c.applyRestore(); assert.deepEqual(writes, []);
});

test('Replace cancellation preserves the selected backup and unlocks restore controls', async () => {
  const { c, $, pending } = restoreSandbox();
  let writes = 0;
  c.document.querySelector = () => ({ value: 'replace' });
  c.AppConfirm = { ask: async () => false };
  c.replaceAllRecords = async () => { writes++; };
  await c.loadRestoreFile(file('valid.json', backup('valid')));
  await c.applyRestore();
  assert.equal(writes, 0); assert.equal(pending().fileName, 'valid.json');
  assert.equal($('#restoreDialog').open, true); assert.equal($('#applyRestoreButton').disabled, false);
});

test('Backup validation rejects duplicate/orphan data while preserving valid format 1 backups', () => {
  const c = sandbox(['validIsoDate', 'normalizeBackupItem', 'normalizeBackupEvent', 'validateBackupDocument'], {
    APP_CONFIG: { slug: 'nfc-tap-log' }, ITEM_NAME_MAX: 60, ACTION_MAX: 40,
  });
  const value = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/maintenance-backup.json'), 'utf8'));
  const parsed = c.validateBackupDocument(value);
  assert.equal(parsed.items.length, 2); assert.equal(parsed.events.length, 2);
  assert.equal(parsed.items[0].name, '=1+1');
  assert.throws(() => c.validateBackupDocument({ ...value, items: [value.items[0], value.items[0]] }), /Duplicate item/);
  assert.throws(() => c.validateBackupDocument({ ...value, events: [{ ...value.events[0], itemId: 'missing_item' }] }), /Orphan/);
  assert.throws(() => c.validateBackupDocument({ ...value, formatVersion: 2 }), /version/);
});

test('Inline app scripts parse and runtime network remains blocked', () => {
  const built = source.replace('__APP_CONFIG_JSON__', '{}').replace('__BUILD_MANIFEST_JSON__', '{}').replace('__EMBEDDED_ASSET_BUNDLE_JSON__', '{}');
  for (const match of built.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  assert.match(source, /connect-src 'none'/);
  assert.doesNotMatch(source, /<script[^>]+src=["']https?:/);
  assert.match(source, /ndef\.scan\(\{ signal: controller\.signal \}\)/);
});

test('A pending summary refresh cannot unlock a later restore write', async () => {
  const { c, $ } = restoreSandbox();
  let finishRefresh, finishSecondWrite, markRefreshEntered;
  const refreshEntered = new Promise(resolve => { markRefreshEntered = resolve; });
  let writeCount = 0, refreshCount = 0;
  c.mergeBackupRecords = async () => {
    writeCount++;
    if (writeCount === 2) await new Promise(resolve => { finishSecondWrite = resolve; });
    return { itemsAdded: 0, eventsAdded: 0 };
  };
  c.refreshHomeSummary = async () => {
    refreshCount++;
    if (refreshCount === 1) await new Promise(resolve => { finishRefresh = resolve; markRefreshEntered(); });
  };
  await c.loadRestoreFile(file('first.json', backup('first')));
  const first = c.applyRestore();
  await refreshEntered;
  await c.loadRestoreFile(file('second.json', backup('second')));
  const overlapping = c.applyRestore();
  assert.equal(writeCount, 1, 'Restore remains single-flight until its summary is finalized');
  finishRefresh(); await first; await overlapping;
  await c.loadRestoreFile(file('second.json', backup('second')));
  const second = c.applyRestore();
  await Promise.resolve(); await Promise.resolve();
  assert.equal($('#applyRestoreButton').disabled, true);
  await c.applyRestore(); assert.equal(writeCount, 2);
  finishSecondWrite(); await second;
  assert.equal($('#applyRestoreButton').disabled, false);
});
