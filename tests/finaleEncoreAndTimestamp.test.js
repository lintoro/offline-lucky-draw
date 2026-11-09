const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const StateManager = require('../src/stateManager.js');

test('Timestamp & Local Timezone - 1. 中獎紀錄使用使用者在地時區標準格式 (YYYY-MM-DD HH:mm:ss，精準至秒無毫秒)', () => {
  const sm = new StateManager({
    candidatePool: ['候選人A', '候選人B', '候選人C'],
    prizes: [{ id: 'p1', name: '特獎', totalQuota: 1 }]
  });

  const pending = sm.startSpin();
  const record = sm.revealWinner();

  assert.ok(record.timestamp, '紀錄必須包含 timestamp');
  // 檢驗格式必須符合 YYYY-MM-DD HH:mm:ss
  const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
  assert.ok(
    regex.test(record.timestamp),
    `中獎時間戳記「${record.timestamp}」必須符合 YYYY-MM-DD HH:mm:ss 本地時間格式，不得有 T、毫秒或 Z`
  );

  // 驗證全開模式時間戳記
  const smBatch = new StateManager({
    candidatePool: ['同仁1', '同仁2'],
    prizes: [{ id: 'p_batch', name: '全開獎', totalQuota: 2 }]
  });
  smBatch.startBatchSpin();
  const batchRecords = smBatch.revealBatchWinners();
  assert.equal(batchRecords.length, 2);
  batchRecords.forEach((rec) => {
    assert.ok(regex.test(rec.timestamp), `全開中獎時間戳記「${rec.timestamp}」必須為本地格式`);
  });
});

test('Encore & Grand Finale - 2. 安可加碼獎流程、歷史紀錄延續與得獎者防重複排除', () => {
  const sm = new StateManager({
    candidatePool: ['張小華', '李美麗', '王大明', '陳大志'],
    allowDuplicates: false,
    prizes: [
      { id: 'p1', name: '三獎', totalQuota: 1 },
      { id: 'p2', name: '二獎', totalQuota: 1 }
    ]
  });

  // 第一抽：抽三獎
  sm.startSpin();
  const win1 = sm.revealWinner();
  sm.continueSpin();
  assert.equal(sm.history.length, 1);
  assert.equal(sm.candidatePool.length, 3);
  assert.ok(!sm.candidatePool.includes(win1.winnerName), '得獎者 1 必須已自候選池排除');

  // 第二抽：抽二獎 (此時常規獎項全數開完)
  sm.startSpin();
  const win2 = sm.revealWinner();
  assert.ok(sm.isAllCompleted(), '第二抽抽完後應辨識為大會獎項全數開出完畢 (isAllCompleted === true)');
  const st2 = sm.continueSpin();
  assert.equal(st2, 'COMPLETED');
  assert.equal(sm.history.length, 2);

  // 發動【安可加碼 (Encore)】
  const encorePrize = sm.setupEncore('加碼獎 (第 1 輪安可)', 1);
  assert.equal(encorePrize.name, '加碼獎 (第 1 輪安可)');
  assert.equal(sm.status, 'READY', 'setupEncore 後狀態機直接進入 READY 可立即開抽');
  assert.equal(sm.prizes.length, 3, '獎項數量必須新增至 3 項');
  assert.equal(sm.history.length, 2, '前兩輪得獎紀錄必須 100% 完整保留');

  // 驗證加碼獎可抽池：仍排除 win1 與 win2
  assert.equal(sm.candidatePool.length, 2);
  assert.ok(!sm.candidatePool.includes(win1.winnerName));
  assert.ok(!sm.candidatePool.includes(win2.winnerName));

  // 進入舞台開抽加碼獎
  assert.ok(sm.validate(), '設定加碼獎後狀態機驗證必須通過轉為 READY');
  assert.equal(sm.status, 'READY');

  const encorePending = sm.startSpin();
  assert.equal(encorePending.prizeName, '加碼獎 (第 1 輪安可)');
  const winEncore = sm.revealWinner();

  // 驗證得獎名冊序號與紀錄累加
  assert.equal(sm.history.length, 3, '加碼獎得主必須無縫累計至大會總中獎名單 (總數為 3)');
  assert.equal(winEncore.sequence, 3, '加碼獎得主序號必須連續遞增為 3');
  assert.equal(winEncore.prizeName, '加碼獎 (第 1 輪安可)');

  // 加碼抽完後，再次辨識為全數開出
  assert.ok(sm.isAllCompleted(), '加碼抽完後再次進入 isAllCompleted 狀態');
  assert.equal(sm.continueSpin(), 'COMPLETED');
});

test('DOM & UI Transition - 3. HTML 中具備光影幕簾遮罩與安可加碼按鈕，終局按鍵類別定義完整', () => {
  const htmlPath = path.resolve(__dirname, '../index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  const dom = new JSDOM(htmlContent);
  const doc = dom.window.document;

  // 驗證光影幕簾過場元件
  const shutter = doc.getElementById('stage-transition-shutter');
  assert.ok(shutter, '主舞台必須存在 #stage-transition-shutter 過場幕簾元件');

  // 驗證謝幕卡片中安可加碼按鈕
  const btnEncore = doc.getElementById('btn-finale-encore');
  assert.ok(btnEncore, '謝幕彈窗中必須存在 #btn-finale-encore 按鈕');
  assert.ok(btnEncore.textContent.includes('安可加碼'), '按鈕文字必須包含「安可加碼」');

  // 驗證得獎彈窗確認按鈕
  const btnModalContinue = doc.getElementById('btn-modal-continue');
  assert.ok(btnModalContinue, '得獎人彈窗必須存在 #btn-modal-continue 按鈕');

  // 驗證現場安可加碼專屬面板
  const modalEncoreSetup = doc.getElementById('modal-encore-setup');
  assert.ok(modalEncoreSetup, '舞台現場必須具備 #modal-encore-setup 專屬加碼面板');
  assert.ok(doc.getElementById('input-encore-prize-name'), '必須具備加碼名稱輸入框');
  assert.ok(doc.getElementById('input-encore-quota'), '必須具備加碼名額微調框');
  assert.ok(doc.getElementById('btn-encore-quota-minus'), '必須具備名額減按鈕');
  assert.ok(doc.getElementById('btn-encore-quota-plus'), '必須具備名額加按鈕');
  assert.ok(doc.getElementById('select-encore-mode'), '必須具備加碼開獎動態模式選單');
  assert.ok(doc.getElementById('btn-encore-start-draw'), '必須具備立即開抽加碼大獎按鈕');
  assert.ok(doc.getElementById('btn-encore-cancel'), '必須具備取消按鈕');

  // 驗證高對比防透光過場幕簾主題樣式
  assert.ok(htmlContent.includes('body[data-theme="OBSIDIAN_GOLD"] .stage-transition-shutter'), '必須定義黑曜金對比幕簾');
  assert.ok(htmlContent.includes('body[data-theme="ROYAL_CRIMSON"] .stage-transition-shutter'), '必須定義皇家緋紅對比幕簾');
  assert.ok(htmlContent.includes('body[data-theme="MIDNIGHT_SAPPHIRE"] .stage-transition-shutter'), '必須定義午夜藍對比幕簾');
  assert.ok(htmlContent.includes('body[data-theme="EMERALD_PALACE"] .stage-transition-shutter'), '必須定義祖母綠對比幕簾');
});
