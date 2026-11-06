const test = require('node:test');
const assert = require('node:assert/strict');
const StateManager = require('../src/stateManager.js');

test('StateManager - 1. 名單解析與空行修剪過濾', () => {
  const sm = new StateManager();
  const raw = "  王大明  \r\n\n\n  李小華\r\n\r\n張志偉  \n  ";
  sm.setInputText(raw);

  const state = sm.getState();
  assert.equal(state.candidatePool.length, 3);
  assert.deepEqual(state.candidatePool, ['王大明', '李小華', '張志偉']);
});

test('StateManager - 2. 狀態機驗證轉移 (SETUP -> READY -> SETUP)', () => {
  const sm = new StateManager();
  assert.equal(sm.status, 'SETUP');

  // 僅有名單，無獎項 -> 停留在 SETUP
  sm.setInputText('王大明\n李小華');
  assert.equal(sm.status, 'SETUP');

  // 新增獎項 -> 自動轉移至 READY
  sm.addPrize('特獎 iPhone 16', 1);
  assert.equal(sm.status, 'READY');

  // 清空名單 -> 退回 SETUP
  sm.setInputText('');
  assert.equal(sm.status, 'SETUP');
});

test('StateManager - 3. CSPRNG 抽獎與均勻隨機分佈驗證 (10,000 次蒙地卡羅檢驗)', () => {
  const sm = new StateManager();
  const candidates = ['Alice', 'Bob', 'Charlie', 'David', 'Eve'];
  sm.setInputText(candidates.join('\n'));
  sm.addPrize('測試獎', 100000);
  sm.updateConfig({ allowDuplicates: true }); // 允許重複抽取以進行統計檢驗

  const counts = { Alice: 0, Bob: 0, Charlie: 0, David: 0, Eve: 0 };
  const N = 10000;

  for (let i = 0; i < N; i++) {
    const spin = sm.startSpin();
    counts[spin.winnerName]++;
    sm.revealWinner();
    sm.continueSpin();
  }

  // 理論均值 2000，卡方檢定驗證顯著性 (自由度 4, alpha = 0.001 臨界值 18.47)
  const expected = N / candidates.length;
  let chiSquare = 0;
  for (const name of candidates) {
    const diff = counts[name] - expected;
    chiSquare += (diff * diff) / expected;
    // 每個候選人抽中次數應在 1750 ~ 2250 之間 (極小機率超出)
    assert.ok(counts[name] > 1750 && counts[name] < 2250, `${name} 次數為 ${counts[name]}，偏離過大`);
  }

  assert.ok(chiSquare < 18.47, `卡方值 ${chiSquare} 超過臨界值 18.47，隨機分佈顯著不均勻`);
});

test('StateManager - 4. 抽取流程與名冊扣減 (allowDuplicates: false)', () => {
  const sm = new StateManager();
  sm.setInputText('甲\n乙\n丙');
  sm.addPrize('頭獎', 2);
  sm.updateConfig({ allowDuplicates: false });

  assert.equal(sm.status, 'READY');

  // 第 1 抽
  const spin1 = sm.startSpin();
  assert.equal(sm.status, 'SPINNING');
  const record1 = sm.revealWinner();
  assert.equal(sm.status, 'REVEALED');
  assert.equal(record1.sequence, 1);
  assert.equal(sm.candidatePool.length, 2);
  assert.ok(!sm.candidatePool.includes(record1.winnerName));

  // 繼續第 2 抽
  const nextStatus = sm.continueSpin();
  assert.equal(nextStatus, 'READY');

  const spin2 = sm.startSpin();
  const record2 = sm.revealWinner();
  assert.equal(record2.sequence, 2);
  assert.equal(sm.candidatePool.length, 1);
  assert.notEqual(record1.winnerName, record2.winnerName);

  // 獎項 2 名已滿
  const finalStatus = sm.continueSpin();
  assert.equal(finalStatus, 'COMPLETED');
  assert.equal(sm.status, 'COMPLETED');
});

test('StateManager - 5. 候選池不足處理 (PARTIAL_FILLED)', () => {
  const sm = new StateManager();
  sm.setInputText('僅有一人');
  sm.addPrize('大獎', 3); // 需 3 名，但池子只有 1 人
  sm.updateConfig({ allowDuplicates: false });

  sm.startSpin();
  sm.revealWinner();

  // 剩餘配額為 2，但候選池已空
  const status = sm.continueSpin();
  assert.equal(status, 'PARTIAL_FILLED');
  assert.equal(sm.candidatePool.length, 0);
  assert.equal(sm.getCurrentPrize().remainingQuota, 2);

  // 在 PARTIAL_FILLED 下再次嘗試 startSpin 應被攔截
  assert.throws(() => {
    sm.startSpin();
  }, /Invalid State/);
});

test('StateManager - 6. 多階層獎項自動切換 (autoSwitchTier)', () => {
  const sm = new StateManager();
  sm.setInputText('A\nB\nC\nD');
  const p1 = sm.addPrize('特獎', 1);
  const p2 = sm.addPrize('頭獎', 2);
  sm.updateConfig({ autoSwitchTier: true, currentPrizeId: p1.id });

  assert.equal(sm.getCurrentPrize().id, p1.id);

  // 抽完特獎 (1 名)
  sm.startSpin();
  const rec1 = sm.revealWinner();
  assert.equal(rec1.prizeName, '特獎');

  // continueSpin 應自動切換至頭獎
  sm.continueSpin();
  assert.equal(sm.getCurrentPrize().id, p2.id);

  // 抽頭獎第 1 名
  sm.startSpin();
  const rec2 = sm.revealWinner();
  assert.equal(rec2.prizeName, '頭獎');
});

test('StateManager - 7. 緊急返回編輯 (EMERGENCY_EDIT) 與資料保留', () => {
  const sm = new StateManager();
  sm.setInputText('張三\n李四');
  sm.addPrize('獎項 1', 2);

  sm.startSpin();
  assert.equal(sm.status, 'SPINNING');

  // 中途緊急中斷並返回編輯
  sm.emergencyEdit();
  assert.equal(sm.status, 'SETUP');
  assert.equal(sm.rawInputText, '張三\n李四');
  assert.equal(sm.prizes.length, 1);
  assert.equal(sm.history.length, 0); // 尚未 reveal 不應寫入歷史
});

test('StateManager - 8. 自克隆 Base64 Bundle 序列化與反序列化驗證', () => {
  const sm1 = new StateManager();
  sm1.setInputText("Alpha\nBeta\nGamma");
  sm1.addPrize("豪華禮盒", 3);
  sm1.updateConfig({ allowDuplicates: false, spinDurationMs: 5000 });

  // 抽中一位
  sm1.startSpin();
  sm1.revealWinner();

  // 匯出 Bundle
  const base64 = sm1.exportBundleBase64();
  assert.ok(typeof base64 === 'string' && base64.length > 20);

  // 建立全新實例並還原
  const sm2 = new StateManager();
  const success = sm2.importBundleBase64(base64);
  assert.ok(success);

  const state1 = sm1.getState();
  const state2 = sm2.getState();

  assert.equal(state2.rawInputText, state1.rawInputText);
  assert.deepEqual(state2.candidatePool, state1.candidatePool);
  assert.equal(state2.prizes[0].remainingQuota, state1.prizes[0].remainingQuota);
  assert.equal(state2.history.length, 1);
  assert.equal(state2.history[0].winnerName, state1.history[0].winnerName);
});

test('StateManager - 10. 抽獎順序 (小獎至大獎 BOTTOM_UP vs 大獎至小獎 TOP_DOWN) 與獎項上下調整', () => {
  const sm = new StateManager();
  sm.setInputText('1\n2\n3\n4\n5');
  const grand = sm.addPrize('特獎 (大獎)', 1);
  const second = sm.addPrize('二獎 (中獎)', 1);
  const third = sm.addPrize('三獎 (小獎)', 1);

  // 預設 drawOrder 為 BOTTOM_UP (由小獎先抽: 三獎 -> 二獎 -> 特獎)
  assert.equal(sm.config.drawOrder, 'BOTTOM_UP');
  assert.equal(sm.getCurrentPrize().id, third.id, '預設應從最後加入的小獎開始抽');

  // 第 1 輪抽取 (三獎)
  sm.startSpin();
  const r1 = sm.revealWinner();
  assert.equal(r1.prizeName, '三獎 (小獎)');
  sm.continueSpin();

  // 自動推進到第 2 輪 (二獎)
  assert.equal(sm.getCurrentPrize().id, second.id, '自動推進至二獎');
  sm.startSpin();
  const r2 = sm.revealWinner();
  assert.equal(r2.prizeName, '二獎 (中獎)');
  sm.continueSpin();

  // 自動推進到壓軸大獎 (特獎)
  assert.equal(sm.getCurrentPrize().id, grand.id, '自動推進至壓軸大獎');
});

test('StateManager - 11. 候選池不足時手動提早結算 (finishDraw)', () => {
  const sm = new StateManager();
  sm.setInputText('小王');
  sm.addPrize('大獎', 3);

  sm.startSpin();
  sm.revealWinner();
  assert.equal(sm.continueSpin(), 'PARTIAL_FILLED');

  // 手動結束抽獎
  assert.equal(sm.finishDraw(), 'COMPLETED');
  assert.equal(sm.status, 'COMPLETED');
  assert.equal(sm.history.length, 1);
});

test('StateManager - 9. 零持久化 (Zero-Persistence) 原始碼安全性靜態檢驗', () => {
  const fs = require('node:fs');
  const rawCode = fs.readFileSync(require.resolve('../src/stateManager.js'), 'utf-8');
  // 移除註解以檢驗純程式邏輯
  const codeWithoutComments = rawCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

  // 確保可執行代碼中絕對無任何 storage 或 cookie 調用
  assert.ok(!codeWithoutComments.includes('localStorage'), '禁止出現 localStorage 調用');
  assert.ok(!codeWithoutComments.includes('sessionStorage'), '禁止出現 sessionStorage 調用');
  assert.ok(!codeWithoutComments.includes('indexedDB'), '禁止出現 indexedDB 調用');
  assert.ok(!codeWithoutComments.includes('cookie'), '禁止出現 cookie 調用');
  assert.ok(!codeWithoutComments.includes('Math.random'), '嚴禁在代碼中使用 Math.random()');
});
