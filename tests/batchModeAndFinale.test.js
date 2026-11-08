const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const StateManager = require('../src/stateManager.js');
const AudioSynthesizer = require('../src/audioSynthesizer.js');

const HTML_PATH = path.resolve(__dirname, '../index.html');

test('BatchMode - 1. StateManager 全開模式 (BATCH_ALL) 一次抽完全部剩額', () => {
  const candidates = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const sm = new StateManager({
    candidatePool: candidates,
    prizes: [
      { id: 'p1', name: '頭獎', totalQuota: 3, remainingQuota: 3 }
    ]
  });

  assert.equal(sm.status, 'READY');
  const pending = sm.startBatchSpin();

  assert.equal(pending.isBatch, true);
  assert.equal(pending.winners.length, 3, '全開模式應一次抽出 3 位得主');
  assert.equal(sm.status, 'SPINNING');

  const records = sm.revealBatchWinners();
  assert.equal(records.length, 3);
  assert.equal(sm.status, 'REVEALED');
  assert.equal(sm.prizes[0].remainingQuota, 0, '獎項配額應全數歸零');
  assert.equal(sm.history.length, 3, '歷史記錄應新增 3 筆');
  assert.equal(sm.candidatePool.length, 5, '候選池應扣除 3 人');

  const nextSt = sm.continueSpin();
  assert.equal(nextSt, 'COMPLETED', '全部獎項抽完應轉為 COMPLETED');
});

test('BatchMode - 2. AudioSynthesizer 全開慶祝與壓軸謝幕音效無拋錯', () => {
  const audio = new AudioSynthesizer();
  assert.doesNotThrow(() => {
    audio.init();
    audio.playBatchCelebration();
    audio.playFinale();
    audio.close();
  });
});

test('BatchMode & Finale - 3. DOM 控制項結構、Tooltip 提示與謝幕遮罩完整性檢驗', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  const dom = new JSDOM(html, { runScripts: 'dangerously' });
  const { document } = dom.window;

  // 下拉選單控制項
  const selMode = document.getElementById('stage-batch-mode-select');
  assert.ok(selMode, '必須具備 #stage-batch-mode-select 下拉選單');
  const options = Array.from(selMode.options).map(o => o.value);
  assert.ok(options.includes('SINGLE'), '必須包含一般模式選項 (SINGLE)');
  assert.ok(options.includes('BATCH_ALL'), '必須包含全開模式選項 (BATCH_ALL)');

  // 說明文字 Tooltip
  const tooltip = document.querySelector('.mode-tooltip-content');
  assert.ok(tooltip, '必須具備 .mode-tooltip-content 浮動說明面板');
  assert.ok(tooltip.textContent.includes('一般模式'), '說明必須包含一般模式');
  assert.ok(tooltip.textContent.includes('一次抽一個人'), '說明文字必須包含「一次抽一個人」');
  assert.ok(tooltip.textContent.includes('全開模式'), '說明必須包含全開模式');
  assert.ok(tooltip.textContent.includes('一次抽完此獎項所有名額'), '說明文字必須包含「一次抽完此獎項所有名額」');

  // 固定抽獎模式勾選開關
  const chkLock = document.getElementById('stage-lock-batch-mode');
  assert.ok(chkLock, '必須具備 #stage-lock-batch-mode 勾選開關');

  // 多得主宮格容器
  const batchGrid = document.getElementById('modal-batch-container');
  assert.ok(batchGrid, '必須具備 #modal-batch-container 多得獎人容器');

  // 壓軸謝幕遮罩
  const finaleOverlay = document.getElementById('finale-curtain-overlay');
  assert.ok(finaleOverlay, '必須具備 #finale-curtain-overlay 謝幕遮罩');
  assert.ok(finaleOverlay.textContent.includes('感謝大家的參與'), '謝幕畫面必須包含「感謝大家的參與」字樣');

  const btnFinaleExport = document.getElementById('btn-finale-export-csv');
  assert.ok(btnFinaleExport, '謝幕畫面必須具備匯出 CSV 按鈕');
  const btnFinaleClose = document.getElementById('btn-finale-close');
  assert.ok(btnFinaleClose, '謝幕畫面必須具備返回舞台按鈕');
});

test('BatchMode & Finale - 4. 抽獎結束後 3 秒謝幕畫面觸發驗證', async () => {
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
    createOscillator() {
      return { type: 'sine', frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} };
    }
    createGain() {
      return { gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} };
    }
  };
  const mockCtx = { clearRect: () => {}, save: () => {}, restore: () => {}, fillRect: () => {}, fillText: () => {} };
  document.querySelectorAll('canvas').forEach(c => c.getContext = () => mockCtx);

  await new Promise(r => setTimeout(r, 50));

  const inputCandidates = document.getElementById('input-candidates');
  inputCandidates.value = '張三\n李四';
  inputCandidates.oninput();

  const btnStartStage = document.getElementById('btn-start-stage');
  btnStartStage.click();

  const selMode = document.getElementById('stage-batch-mode-select');
  const chkLock = document.getElementById('stage-lock-batch-mode');
  const btnSpin = document.getElementById('btn-spin');
  const finaleOverlay = document.getElementById('finale-curtain-overlay');

  // 設定全開模式
  selMode.value = 'BATCH_ALL';
  selMode.onchange();
  assert.equal(btnSpin.disabled, false);

  // 點擊抽獎
  btnSpin.click();

  // 等待開獎完成
  const winnerModal = document.getElementById('winner-modal-overlay');
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (winnerModal.classList.contains('active')) break;
  }
  assert.ok(winnerModal.classList.contains('active'));

  // 關閉 Modal 並完成抽獎
  const btnModalContinue = document.getElementById('btn-modal-continue');
  btnModalContinue.click();

  // 若名單抽空但獎額未滿，按鈕會變成「名冊抽空：結算大會」
  if (btnSpin.textContent.includes('結算大會')) {
    btnSpin.click(); // 手動提前結算大會
  }

  // 驗證謝幕遮罩在 3 秒後顯示
  assert.ok(!finaleOverlay.classList.contains('active'), '謝幕遮罩剛結束抽獎時不應立刻跳出');

  // 等候 3.2 秒
  await new Promise(r => setTimeout(r, 3200));
  assert.ok(finaleOverlay.classList.contains('active'), '抽獎結束 3 秒後謝幕遮罩應自動彈出演示');
});
