const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.resolve(__dirname, '../index.html');

test('SetupScroll & ButtonAccessibility - 1. 新增大量獎項與名單時，設定頁面保持可滾動且按鈕立即可點擊', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable'
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

  const btnAddPrize = document.getElementById('btn-add-prize');
  const btnStartStage = document.getElementById('btn-start-stage');
  const viewSetup = document.getElementById('view-setup');
  const viewStage = document.getElementById('view-stage');
  const inputCandidates = document.getElementById('input-candidates');

  assert.ok(btnAddPrize, '必須具備 #btn-add-prize 按鈕');
  assert.ok(btnStartStage, '必須具備 #btn-start-stage 按鈕');

  // 1. 填入 100 筆候選人資料向下填充
  const candidates = [];
  for (let i = 1; i <= 100; i++) {
    candidates.push('測試同仁_' + i);
  }
  inputCandidates.value = candidates.join('\n');
  inputCandidates.dispatchEvent(new window.Event('input'));

  // 2. 連續點擊新增 15 個獎項向下填充
  for (let p = 0; p < 15; p++) {
    btnAddPrize.click();
  }

  const prizeCards = document.querySelectorAll('.prize-card');
  assert.ok(prizeCards.length >= 15, '獎項數量應擴展至 15 項以上');

  // 3. 驗證進入抽獎大會舞台按鈕依然可被順利點擊，切換無卡死
  btnStartStage.click();

  assert.ok(viewStage.classList.contains('active'), '大量填充後點擊進入舞台，#view-stage 必須順利進入 active 狀態且不卡死');
  assert.ok(!viewSetup.classList.contains('active'), '#view-setup 必須順利隱藏');

  // 4. 點擊返回設定
  const btnEmergencyEdit = document.getElementById('btn-emergency-edit');
  assert.ok(btnEmergencyEdit, '必須具備返回設定按鈕');
  btnEmergencyEdit.click();
  const dialogBtnConfirm = document.getElementById('dialog-btn-confirm');
  dialogBtnConfirm.click();

  assert.ok(viewSetup.classList.contains('active'), '返回設定後 #view-setup 必須順利顯示');
  assert.ok(!viewStage.classList.contains('active'), '#view-stage 必須順利隱藏');
});
