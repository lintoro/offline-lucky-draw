const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.resolve(__dirname, '../index.html');

test('ViewSeparation - 1. 初始加載僅展示設定頁面，開獎大會舞台嚴格隱藏', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
  const { window } = dom;
  const { document } = window;

  const viewSetup = document.getElementById('view-setup');
  const viewStage = document.getElementById('view-stage');
  const btnEmergencyEdit = document.getElementById('btn-emergency-edit');

  assert.ok(viewSetup, '必須存在 #view-setup');
  assert.ok(viewStage, '必須存在 #view-stage');

  // 驗證初始 class
  assert.ok(viewSetup.classList.contains('active'), '初始時 #view-setup 必須具備 active');
  assert.ok(!viewStage.classList.contains('active'), '初始時 #view-stage 嚴禁具備 active');
  assert.ok(btnEmergencyEdit.classList.contains('hidden'), '初始時「返回設定」按鈕必須為 hidden');

  // 檢驗 CSS 規則保證：未具備 active 的 panel 必須 display: none
  assert.ok(html.includes('#view-stage:not(.active){display:none !important}'), 'CSS 必須宣告 #view-stage:not(.active){display:none !important}');
  assert.ok(html.includes('#view-setup:not(.active){display:none !important}'), 'CSS 必須宣告 #view-setup:not(.active){display:none !important}');
});

test('ViewSeparation - 2. 按下「進入抽獎大會舞台」後切換至舞台，返回設定可倒回', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost/'
  });
  const { window } = dom;
  const { document } = window;

  // Mock AudioContext & Canvas
  window.AudioContext = class {
    constructor() { this.state = 'running'; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  };
  const mockCtx = { clearRect: () => {}, save: () => {}, restore: () => {}, fillRect: () => {}, fillText: () => {} };
  document.querySelectorAll('canvas').forEach(c => c.getContext = () => mockCtx);

  const btnLoadSample = document.getElementById('btn-load-sample');
  btnLoadSample.click();

  const btnStartStage = document.getElementById('btn-start-stage');
  const viewSetup = document.getElementById('view-setup');
  const viewStage = document.getElementById('view-stage');
  const btnEmergencyEdit = document.getElementById('btn-emergency-edit');

  // 點擊進入抽獎大會舞台
  btnStartStage.click();

  assert.ok(!viewSetup.classList.contains('active'), '進入舞台後 #view-setup 不可具備 active');
  assert.ok(viewStage.classList.contains('active'), '進入舞台後 #view-stage 必須具備 active');
  assert.ok(!btnEmergencyEdit.classList.contains('hidden'), '進入舞台後「返回設定」按鈕必須顯示');

  // 點擊返回設定
  btnEmergencyEdit.click();
  // 確認對話框跳出並點擊確認
  const dialogBtnConfirm = document.getElementById('dialog-btn-confirm');
  dialogBtnConfirm.click();

  assert.ok(viewSetup.classList.contains('active'), '返回後 #view-setup 必須重新獲得 active');
  assert.ok(!viewStage.classList.contains('active'), '返回後 #view-stage 必須失去 active');
  assert.ok(btnEmergencyEdit.classList.contains('hidden'), '返回設定後「返回設定」按鈕必須隱藏');
});

test('ViewSeparation - 3. 9:16 手機直屏模式下，未進入舞台前 #view-stage 嚴格隱藏 (display: none)，切換後 #view-setup 嚴格隱藏', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable'
  });
  const { window } = dom;
  const { document } = window;

  const viewSetup = document.getElementById('view-setup');
  const viewStage = document.getElementById('view-stage');

  // 切換至 9:16 直屏模式
  document.body.setAttribute('data-aspect-ratio', '9:16');

  // 1. 初始狀態：舞台嚴格隱藏，設定頁面顯示
  assert.equal(window.getComputedStyle(viewStage).display, 'none', '9:16 初始時 #view-stage 必須為 display: none');
  assert.equal(window.getComputedStyle(viewSetup).display, 'flex', '9:16 初始時 #view-setup 必須為 display: flex');

  // 2. 切換至舞台狀態：設定頁面嚴格隱藏，舞台顯示
  viewSetup.classList.remove('active');
  viewStage.classList.add('active');
  assert.equal(window.getComputedStyle(viewStage).display, 'flex', '9:16 進入舞台後 #view-stage 必須為 display: flex');
  assert.equal(window.getComputedStyle(viewSetup).display, 'none', '9:16 進入舞台後 #view-setup 必須為 display: none');
});

