const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const StateManager = require('../src/stateManager.js');
const FestiveAmbiance = require('../src/festiveAmbiance.js');
const MasterVisualEngine = require('../src/masterVisualEngine.js');

test('AspectRatio - 1. StateManager 支援 16:9 與 9:16 比例設定與事件監聽', () => {
  const sm = new StateManager({
    eventName: '測試比例抽獎大會',
    prizes: [{ name: '特獎', totalQuota: 1 }]
  });

  assert.equal(sm.config.aspectRatio, '16:9', '預設比例必須為 16:9');

  let eventFired = false;
  let receivedVal = '';
  sm.subscribe((evt, state, data) => {
    if (evt === 'ASPECT_RATIO_CHANGED') {
      eventFired = true;
      receivedVal = data;
    }
  });

  sm.setAspectRatio('9:16');
  assert.equal(sm.config.aspectRatio, '9:16', '呼叫 setAspectRatio(9:16) 後比例必須更新');
  assert.ok(eventFired, '必須觸發 ASPECT_RATIO_CHANGED 事件');
  assert.equal(receivedVal, '9:16');

  // 切換回 16:9
  sm.setAspectRatio('16:9');
  assert.equal(sm.config.aspectRatio, '16:9');
});

test('AspectRatio - 2. MasterVisualEngine 支援 16:9 與 9:16 比例切換與解析度調整', () => {
  const mockCtx = {
    save: () => {},
    restore: () => {},
    clearRect: () => {},
    scale: () => {},
    translate: () => {},
    rotate: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    rect: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    clip: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    roundRect: () => {}
  };

  const mockCanvas = {
    width: 640,
    height: 480,
    style: { width: '640px', height: '480px' },
    getContext: () => mockCtx
  };

  const engine = new MasterVisualEngine(mockCanvas, null, 'OBSIDIAN_GOLD');
  assert.equal(engine.aspectRatio, '16:9');
  assert.equal(engine.logicalW, 640);
  assert.equal(engine.logicalH, 480);

  // 切換為手機直屏 9:16
  engine.setAspectRatio('9:16');
  assert.equal(engine.aspectRatio, '9:16');
  assert.equal(engine.logicalW, 360, '直屏模式下邏輯寬度應為 360');
  assert.equal(engine.logicalH, 640, '直屏模式下邏輯高度應為 640');
  assert.equal(mockCanvas.width, 360);
  assert.equal(mockCanvas.height, 640);

  // 切換回 16:9
  engine.setAspectRatio('16:9');
  assert.equal(engine.aspectRatio, '16:9');
  assert.equal(engine.logicalW, 640);
  assert.equal(engine.logicalH, 480);
});

test('AspectRatio - 3. FestiveAmbiance 支援 setAspectRatio 平滑切換', () => {
  const mockCanvas = {
    width: 1280,
    height: 720,
    clientWidth: 1280,
    clientHeight: 720,
    getContext: () => ({
      save: () => {},
      restore: () => {},
      clearRect: () => {},
      scale: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} })
    })
  };

  const festive = new FestiveAmbiance(mockCanvas, 'OBSIDIAN_GOLD');
  assert.doesNotThrow(() => {
    festive.setAspectRatio('9:16');
    festive.setAspectRatio('16:9');
  }, '切換比例時不應拋出任何異常');
});

test('AspectRatio - 4. DOM UI 整合驗證：點擊比例按鈕在 16:9 與 9:16 之間來回切換', () => {
  const htmlPath = path.resolve(__dirname, '../index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

  const dom = new JSDOM(htmlContent, {
    runScripts: 'dangerously',
    resources: 'usable'
  });

  const { document } = dom.window;
  const btnAspect = document.getElementById('btn-aspect-toggle');
  assert.ok(btnAspect, 'header 必須存在 #btn-aspect-toggle 切換按鈕');

  // 初始應為 16:9
  assert.equal(document.body.getAttribute('data-aspect-ratio'), '16:9');

  // 第一次點擊：切換到 9:16 手機直屏
  btnAspect.click();
  assert.equal(document.body.getAttribute('data-aspect-ratio'), '9:16');
  assert.ok(btnAspect.textContent.includes('9:16') || btnAspect.innerHTML.includes('9:16'), '按鈕文字應反映當前為 9:16 直屏');

  // 第二次點擊：切換回 16:9 電腦寬螢幕
  btnAspect.click();
  assert.equal(document.body.getAttribute('data-aspect-ratio'), '16:9');
  assert.ok(btnAspect.textContent.includes('16:9') || btnAspect.innerHTML.includes('16:9'), '按鈕文字應反映當前為 16:9 寬螢幕');
});

test('AspectRatio - 5. 9:16 手機直屏下拉霸機與 5 大視覺模式繪製無拋錯且零壓線', () => {
  const drawnTexts = [];
  const mockCtx = {
    save: () => {},
    restore: () => {},
    clearRect: () => {},
    scale: () => {},
    translate: () => {},
    rotate: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    rect: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    clip: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: (text, x, y) => {
      drawnTexts.push({ text, x, y });
    },
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    roundRect: () => {}
  };

  const mockCanvas = {
    width: 360,
    height: 640,
    style: { width: '360px', height: '640px' },
    getContext: () => mockCtx
  };

  const engine = new MasterVisualEngine(mockCanvas, null, 'OBSIDIAN_GOLD', '9:16');
  engine.setCandidates(['林小華', '張志豪', '陳冠宇', '王大明']);

  // 繪製直屏模式下的拉霸機
  assert.doesNotThrow(() => {
    engine._drawSlotStatic('陳冠宇', 1, true, 0, 0, '林小華', '張志豪', 0);
  });

  const winnerDraw = drawnTexts.find(d => d.text === '陳冠宇');
  assert.ok(winnerDraw, '直屏拉霸機必須繪製出中獎人姓名「陳冠宇」');
  assert.ok(Math.abs(winnerDraw.y) <= 2, '直屏模式下中獎人姓名仍必須精確位於名牌正中央 (y ≈ 0)');

  // 繪製其餘模式無拋錯
  assert.doesNotThrow(() => {
    engine.setMode('RIBBON_TAPE');
    engine.setMode('LOTTO_EGG');
    engine.setMode('SPLIT_FLAP');
    engine.setMode('HYPERSPACE');
  });
});
