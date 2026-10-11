const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { gunzipSync } = require('node:zlib');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const artifacts = [['source', read('src/index.template.html')]];
if (process.env.DIALOG_LAYOUT_HTML) artifacts.push(['selected artifact', fs.readFileSync(process.env.DIALOG_LAYOUT_HTML, 'utf8')]);
if (process.env.VERIFY_DIALOG_ARTIFACTS === '1') {
  const readable = read('dist/index.html');
  const alias = read('nfc-tap-log.html');
  const payload = read('dist/index.self-extract.html').match(/<script id="self-extract-payload" type="application\/octet-stream">([A-Za-z0-9+/=\r\n]+)<\/script>/)?.[1];
  assert.ok(payload, 'self-extract payload must exist');
  const restored = gunzipSync(Buffer.from(payload, 'base64')).toString('utf8');
  assert.equal(restored, readable, 'self-extract must restore exact readable bytes');
  assert.equal(alias, readable, 'root HTML must be an exact readable copy');
  artifacts.push(['readable', readable], ['root', alias], ['self-extracted', restored]);
}

// Structural guards complement native wheel, Tab, and viewport checks; they do not render CSS.
function rulesFor(html, selector) {
  const css = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(match => match[1].trim().split(',').some(part => part.trim() === selector))
    .map(match => match[2]);
}
function property(html, selector, name) {
  let value;
  for (const rule of rulesFor(html, selector)) {
    for (const declaration of rule.split(';')) {
      const colon = declaration.indexOf(':');
      if (declaration.slice(0, colon).trim() === name) value = declaration.slice(colon + 1).trim();
    }
  }
  return value;
}
function confirmationContract(html) {
  assert.equal(property(html, '.app-confirm-dialog[open]', 'display'), 'flex');
  assert.equal(property(html, '.app-confirm-dialog[open]', 'flex-direction'), 'column');
  for (const value of rulesFor(html, '.app-confirm-dialog').filter(rule => /max-height\s*:/.test(rule))) {
    assert.match(value, /max-height:\s*calc\(100dvh\s*-\s*\d+px\s*-\s*env\(safe-area-inset-top\)/);
  }
  assert.ok(rulesFor(html, '.app-confirm-dialog').filter(rule => /max-height\s*:/.test(rule)).length >= 2, 'desktop and mobile confirmation bounds');
  assert.equal(property(html, '.app-confirm-header', 'flex'), '0 0 auto');
  assert.equal(property(html, '.app-confirm-body', 'min-height'), '0');
  assert.equal(property(html, '.app-confirm-body', 'flex'), '1 1 auto');
  assert.equal(property(html, '.app-confirm-body', 'overflow'), 'auto');
  assert.equal(property(html, '.app-confirm-body', 'overscroll-behavior'), 'contain');
  assert.match(property(html, '.app-confirm-body', 'padding'), /safe-area-inset-bottom/);
  assert.match(html, /<div class="app-confirm-body">[\s\S]*?<p class="app-confirm-message"[^>]*>[\s\S]*?<div class="app-confirm-actions">[\s\S]*?id="appConfirmCancel"[\s\S]*?id="appConfirmOk"/);
}

for (const [label, html] of artifacts) {
  test(`${label}: native modal locks both document roots only while a modal is open`, () => {
    for (const selector of ['html:has(dialog:modal)', 'body:has(dialog:modal)']) {
      assert.equal(property(html, selector, 'overflow'), 'hidden', `${selector} must lock background scrolling`);
      assert.equal(property(html, selector, 'overscroll-behavior'), 'none');
    }
    assert.equal(rulesFor(html, 'html:has(dialog[open])').length, 0);
    assert.equal(rulesFor(html, 'body:has(dialog[open])').length, 0);
  });
  for (const [dialog, form, close, cancel, remove] of [
    ['itemEditDialog', 'itemEditForm', 'closeItemEditButton', 'cancelItemEditButton', 'deleteItemButton'],
    ['eventEditDialog', 'eventEditForm', 'closeEventEditButton', 'cancelEventEditButton', 'deleteEventButton'],
  ]) {
    test(`${label}: ${dialog} keeps Close outside one scrollable, full-height form`, () => {
      assert.equal(property(html, `#${dialog}[open]`, 'display'), 'flex');
      assert.equal(property(html, `#${dialog}[open]`, 'flex-direction'), 'column');
      assert.match(property(html, 'dialog', 'max-height'), /100dvh/);
      assert.match(property(html, 'dialog:not(.app-confirm-dialog)', 'max-height'), /safe-area-inset-top/);
      assert.equal(property(html, '.dialog-header', 'flex'), '0 0 auto');
      assert.equal(property(html, `#${form}`, 'min-height'), '0');
      assert.equal(property(html, `#${form}`, 'flex'), '1 1 auto');
      assert.equal(property(html, `#${form}`, 'overflow'), 'auto');
      assert.equal(property(html, `#${form}`, 'overscroll-behavior'), 'contain');
      assert.equal(property(html, `#${form} > .dialog-body`, 'overflow'), 'visible');
      const markup = html.match(new RegExp(`<dialog id="${dialog}"[\\s\\S]*?<\\/dialog>`))?.[0];
      assert.ok(markup);
      assert.ok(markup.indexOf(`id="${close}"`) < markup.indexOf(`<form id="${form}"`));
      const contents = markup.match(/<form\b[^>]*>([\s\S]*?)<\/form>/)?.[1];
      for (const id of [cancel, remove]) assert.ok(contents.includes(`id="${id}"`), `${id} stays in the scrolling form`);
      assert.match(contents, /type="submit"/);
      assert.equal(property(html, `#${form} .form-actions`, 'position'), undefined, 'actions must not consume a fixed footer');
    });
  }
  test(`${label}: generic confirmation retains a fixed header and scrollable message/actions`, () => confirmationContract(html));
  test(`${label}: working Help shell and existing shield remain intact`, () => {
    assert.equal(property(html, '#helpDialog[open]', 'display'), 'flex');
    assert.equal(property(html, '.dialog-body', 'overflow'), 'auto');
    assert.match(property(html, '#helpDialog .dialog-body', 'padding'), /safe-area-inset-bottom/);
    const badge = html.match(/<div class="local-badge">([\s\S]*?)<\/div>/)?.[1];
    assert.match(badge, /M12 3 5 6v5c0 4\.6 2\.8 8 7 10 4\.2-2 7-5\.4 7-10V6z/);
  });
}

test('canonical confirmation snippet keeps the same bounded scroll contract', () => confirmationContract(read('components/confirm-dialog.html')));
test('patch metadata and bilingual Help explain the short-dialog controls', () => {
  const html = artifacts[0][1];
  assert.equal(JSON.parse(read('app.config.json')).version, '1.0.2');
  assert.match(html, /id="versionBadge">v1\.0\.2<\/span>/);
  assert.equal([...html.matchAll(/data-i18n="helpDialogLayout"/g)].length, 1);
  assert.equal([...html.matchAll(/helpDialogLayout:\s*'/g)].length, 2);
});
test('repository check explicitly verifies source and every shipped dialog form', () => {
  const check = read('scripts/check-repository.ps1');
  assert.match(check, /\$env:VERIFY_DIALOG_ARTIFACTS\s*=\s*"1"/);
  assert.match(check, /\$previousDialogArtifactCheck\s*=\s*\$env:VERIFY_DIALOG_ARTIFACTS/);
  assert.match(check, /\$env:VERIFY_DIALOG_ARTIFACTS\s*=\s*\$previousDialogArtifactCheck/);
  assert.match(check, /node[^\r\n]*--test[^\r\n]*tests\/dialog-layout\.test\.cjs/);
});
