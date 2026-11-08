const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.resolve(__dirname, '../index.html');

test('DOM UI 驗證 - 1. 預設獎項載入與新增獎項按鈕互動', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
  const { document } = dom.window;

  // 驗證預設 3 大獎項是否成功渲染至 DOM
  const prizeCards = document.querySelectorAll('#prizes-list .prize-card');
  assert.equal(prizeCards.length, 3, '初始必須成功渲染 3 個預設獎項');

  const names = Array.from(prizeCards).map(c => c.querySelector('.p-name').value);
  assert.ok(names.includes('特獎 (大獎)'), '必須包含特獎');
  assert.ok(names.includes('頭獎'), '必須包含頭獎');
  assert.ok(names.includes('二獎 (普獎)'), '必須包含二獎');

  // 驗證獎項總覽結算標籤 (目前共有N項獎項 合計M位名額)
  const prizeCountBadge = document.getElementById('prize-count-badge');
  assert.ok(prizeCountBadge, '必須存在 #prize-count-badge 結算標籤');
  assert.equal(prizeCountBadge.textContent.trim(), '目前共有 3 項獎項 ｜ 合計 8 位名額', '初始獎項結算顯示應為 3 項 8 名額');

  // 測試點擊「新增獎項」
  const btnAdd = document.getElementById('btn-add-prize');
  assert.ok(btnAdd, '必須存在新增獎項按鈕');
  btnAdd.click();

  const updatedCards = document.querySelectorAll('#prizes-list .prize-card');
  assert.equal(updatedCards.length, 4, '點擊新增後獎項清單應變為 4 項');
  assert.equal(prizeCountBadge.textContent.trim(), '目前共有 4 項獎項 ｜ 合計 9 位名額', '新增獎項後結算標籤應同步更新為 4 項 9 名額');
});

test('DOM UI 驗證 - 2. 載入 30 人範例名單按鈕互動', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  const dom = new JSDOM(html, { runScripts: 'dangerously' });
  const { document } = dom.window;

  const btnSample = document.getElementById('btn-load-sample');
  const inputCandidates = document.getElementById('input-candidates');
  const badge = document.getElementById('candidate-count-badge');

  assert.ok(btnSample, '必須存在範例資料按鈕');
  btnSample.click();

  const lines = inputCandidates.value.trim().split('\n');
  assert.equal(lines.length, 30, '點擊載入範例應載入 30 位名單');
  assert.ok(badge.textContent.includes('30 人'), '名單人數標籤應同步更新為 30 人');
});

test('DOM UI 驗證 - 3. 主題切換器切換布景效果', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  const dom = new JSDOM(html, { runScripts: 'dangerously' });
  const { document } = dom.window;

  const themeSelector = document.getElementById('theme-selector');
  assert.ok(themeSelector, '必須存在主題選擇器');

  // 切換至 ROYAL_CRIMSON
  themeSelector.value = 'ROYAL_CRIMSON';
  themeSelector.onchange();
  assert.equal(document.body.getAttribute('data-theme'), 'ROYAL_CRIMSON', 'body data-theme 應變更為 ROYAL_CRIMSON');

  // 切換至 MIDNIGHT_SAPPHIRE
  themeSelector.value = 'MIDNIGHT_SAPPHIRE';
  themeSelector.onchange();
  assert.equal(document.body.getAttribute('data-theme'), 'MIDNIGHT_SAPPHIRE', 'body data-theme 應變更為 MIDNIGHT_SAPPHIRE');

  // 切換至 EMERALD_PALACE
  themeSelector.value = 'EMERALD_PALACE';
  themeSelector.onchange();
  assert.equal(document.body.getAttribute('data-theme'), 'EMERALD_PALACE', 'body data-theme 應變更為 EMERALD_PALACE');
});
