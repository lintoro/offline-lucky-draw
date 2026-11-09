const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.resolve(__dirname, '../index.html');

test('CompletedDrawReturn - 抽完後按返回舞台未清除直接回設定畫面，再次進入舞台無障礙開啟新一輪抽獎', async () => {
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
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createOscillator() { return { type: 'sine', frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; }
    createGain() { return { gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }; }
  };
  const mockCtx = { clearRect: () => {}, save: () => {}, restore: () => {}, fillRect: () => {}, fillText: () => {} };
  document.querySelectorAll('canvas').forEach(c => c.getContext = () => mockCtx);

  await new Promise(r => setTimeout(r, 50));

  // 1. 設定 2 位候選人
  const inputCandidates = document.getElementById('input-candidates');
  inputCandidates.value = '陳大文\n林小明';
  inputCandidates.oninput();

  // 刪除其餘預設獎項，僅保留 1 個獎項且名額為 2，確保全數開出完畢 (COMPLETED)
  const delBtns = document.querySelectorAll('.btn-del-p');
  for (let i = delBtns.length - 1; i >= 1; i--) {
    delBtns[i].click();
  }
  const quotaInput = document.querySelector('.p-quota');
  quotaInput.value = '2';
  quotaInput.oninput();

  const candidateBadge = document.getElementById('candidate-count-badge');
  assert.equal(candidateBadge.textContent.trim(), '2 人登記', '初始設定時應顯示 2 人登記');

  // 2. 點擊進入抽獎大會舞台
  const btnStartStage = document.getElementById('btn-start-stage');
  btnStartStage.click();

  const viewSetup = document.getElementById('view-setup');
  const viewStage = document.getElementById('view-stage');
  assert.ok(viewStage.classList.contains('active'), '進入抽獎大會舞台成功');

  // 3. 設定全開模式並抽完此獎所有名額
  const selMode = document.getElementById('stage-batch-mode-select');
  const btnSpin = document.getElementById('btn-spin');
  selMode.value = 'BATCH_ALL';
  selMode.onchange();
  btnSpin.click();

  // 等待得獎彈窗
  const winnerModal = document.getElementById('winner-modal-overlay');
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (winnerModal.classList.contains('active')) break;
  }
  assert.ok(winnerModal.classList.contains('active'), '得獎彈窗彈出');

  // 關閉 Modal 繼續
  const btnModalContinue = document.getElementById('btn-modal-continue');
  btnModalContinue.click();

  // 若出現名冊抽空結算大會，點擊結算
  if (btnSpin.textContent.includes('結算大會')) {
    btnSpin.click();
  }

  // 4. 使用者按「返回舞台」（未按重置大會），點擊「返回設定」
  const btnEmergencyEdit = document.getElementById('btn-emergency-edit');
  btnEmergencyEdit.click();

  // 確認返回設定彈窗
  const dialogTitle = document.getElementById('dialog-title');
  const dialogBtnConfirm = document.getElementById('dialog-btn-confirm');
  assert.equal(dialogTitle.textContent, '返回設定頁面');
  dialogBtnConfirm.click();

  // 5. 驗證回到設定頁面後的狀態
  assert.ok(viewSetup.classList.contains('active'), '必須成功回到設定頁面');
  assert.ok(inputCandidates.value.includes('陳大文'), '候選人文字輸入欄位中名單必須完整保留');
  assert.equal(candidateBadge.textContent.trim(), '2 人登記', '設定頁徽章必須正確顯示名單人數 2 人登記，絕不可為 0 人登記');

  // 6. 使用者點擊「進入抽獎大會舞台」
  btnStartStage.click();

  // 7. 驗證系統行為：絕不可出現「無法進入舞台：請先輸入至少一位名單人員」的錯誤警示！
  assert.notEqual(dialogTitle.textContent, '無法進入舞台', '名冊欄位已有名單時，絕不可出現「無法進入舞台」錯誤！');
  assert.equal(dialogTitle.textContent, '開啟全新一輪抽獎', '應友善彈窗詢問是否開啟全新一輪抽獎大會');

  // 8. 點擊確認開啟新一輪
  dialogBtnConfirm.click();

  // 9. 驗證舞台成功進入且已充能完畢
  assert.ok(viewStage.classList.contains('active'), '確認後必須順利進入舞台');
  assert.ok(!btnEmergencyEdit.classList.contains('hidden'), '舞台頂部返回設定按鈕就緒');
});

test('CompletedDrawReturn - 2. 名冊暫時抽空 (PARTIAL_FILLED) 返回設定後，名冊欄位有人員即可順利同步並重返舞台繼續抽剩額', async () => {
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
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createOscillator() { return { type: 'sine', frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; }
    createGain() { return { gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }; }
  };
  const mockCtx = { clearRect: () => {}, save: () => {}, restore: () => {}, fillRect: () => {}, fillText: () => {} };
  document.querySelectorAll('canvas').forEach(c => c.getContext = () => mockCtx);

  await new Promise(r => setTimeout(r, 50));

  // 1. 設定 1 位候選人，獎項配額為預設 (共 8 個名額)
  const inputCandidates = document.getElementById('input-candidates');
  inputCandidates.value = '獨生子小明';
  inputCandidates.oninput();

  const btnStartStage = document.getElementById('btn-start-stage');
  btnStartStage.click();

  const selMode = document.getElementById('stage-batch-mode-select');
  const btnSpin = document.getElementById('btn-spin');
  selMode.value = 'SINGLE';
  selMode.onchange();
  btnSpin.click();

  // 等待得獎彈窗
  const winnerModal = document.getElementById('winner-modal-overlay');
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (winnerModal.classList.contains('active')) break;
  }
  const btnModalContinue = document.getElementById('btn-modal-continue');
  btnModalContinue.click();

  // 此時候選池已空 (PARTIAL_FILLED)，但還有獎項未抽完
  // 返回設定頁面
  const btnEmergencyEdit = document.getElementById('btn-emergency-edit');
  btnEmergencyEdit.click();
  document.getElementById('dialog-btn-confirm').click();

  const viewSetup = document.getElementById('view-setup');
  assert.ok(viewSetup.classList.contains('active'), '返回設定成功');

  // 在名單欄位中補充 2 位新名單
  inputCandidates.value = '獨生子小明\n新加入甲\n新加入乙';
  inputCandidates.oninput();

  // 再次點擊進入舞台
  btnStartStage.click();

  // 驗證直接成功進入舞台，無需重複確認彈窗，且絕無「請先輸入至少一位名單」警示
  const viewStage = document.getElementById('view-stage');
  assert.ok(viewStage.classList.contains('active'), '補充人員後必須能直接順利進入舞台繼續抽獎');
});

