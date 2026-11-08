const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const FestiveAmbiance = require('../src/festiveAmbiance.js');

test('FestiveAmbiance - 1. 初始化與安全降級 (無 Canvas 不崩潰)', () => {
  const ambiance = new FestiveAmbiance(null, 'OBSIDIAN_GOLD');
  assert.equal(ambiance.isActive, false);

  assert.doesNotThrow(() => {
    ambiance.start();
    ambiance.triggerCelebration();
    ambiance.stop();
  });
  assert.equal(ambiance.isActive, false);
});

test('FestiveAmbiance - 2. 四大主題配色切換驗證', () => {
  const ambiance = new FestiveAmbiance(null, 'OBSIDIAN_GOLD');
  assert.equal(ambiance.palette.name, 'OBSIDIAN_GOLD');

  ambiance.setTheme('ROYAL_CRIMSON');
  assert.equal(ambiance.palette.name, 'ROYAL_CRIMSON');
  assert.ok(ambiance.palette.balloonColors.includes('#e53e3e'));

  ambiance.setTheme('MIDNIGHT_SAPPHIRE');
  assert.equal(ambiance.palette.name, 'MIDNIGHT_SAPPHIRE');
  assert.ok(ambiance.palette.balloonColors.includes('#38bdf8'));

  ambiance.setTheme('EMERALD_PALACE');
  assert.equal(ambiance.palette.name, 'EMERALD_PALACE');
  assert.ok(ambiance.palette.balloonColors.includes('#10b981'));

  // 未知主題預設降級為 OBSIDIAN_GOLD
  ambiance.setTheme('UNKNOWN_THEME');
  assert.equal(ambiance.palette.name, 'OBSIDIAN_GOLD');
});

test('FestiveAmbiance - 3. 歡樂飾品物體初始化與慶祝彈跳衝量 (triggerCelebration)', () => {
  const ambiance = new FestiveAmbiance(null, 'OBSIDIAN_GOLD');
  ambiance._initProps();
  assert.ok(ambiance.props.length >= 20, '應生成至少 20 件慶典飾品');

  const types = new Set(ambiance.props.map(p => p.type));
  assert.ok(types.has('balloon'), '應包含金屬光澤氣球');
  assert.ok(types.has('coin'), '應包含 3D 旋轉金幣');
  assert.ok(types.has('dice'), '應包含幸運骰子');
  assert.ok(types.has('gift'), '應包含緞帶禮盒');
  assert.ok(types.has('starburst'), '應包含十字星芒');

  // 測試衝量觸發
  ambiance.triggerCelebration();
  const bouncyProps = ambiance.props.filter(p => p.vy < 0);
  assert.ok(bouncyProps.length > 0, '慶典衝量應賦予飾品向上負速度');
});

test('FestiveAmbiance - 4. Mock Canvas 渲染與物理迴圈無拋錯檢驗', () => {
  // 建立輕量 mock canvas 與 2D context
  const mockCtx = {
    clearRect: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    bezierCurveTo: () => {},
    arc: () => {},
    rect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fill: () => {},
    stroke: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    roundRect: () => {}
  };

  const mockCanvas = {
    width: 800,
    height: 600,
    getContext: () => mockCtx
  };

  const ambiance = new FestiveAmbiance(mockCanvas, 'OBSIDIAN_GOLD');
  assert.doesNotThrow(() => {
    ['OBSIDIAN_GOLD', 'ROYAL_CRIMSON', 'MIDNIGHT_SAPPHIRE', 'EMERALD_PALACE'].forEach(theme => {
      ambiance.setTheme(theme);
      ambiance._update();
      ambiance._render();
    });
    ambiance.triggerCelebration();
    ambiance._update();
    ambiance._render();
    ambiance.stop();
  });
});

test('FestiveAmbiance - 5. 零外部依賴與離線單檔規範檢驗 (Zero External Assets)', () => {
  const code = fs.readFileSync('src/festiveAmbiance.js', 'utf-8');
  assert.doesNotMatch(code, /https?:\/\//i, '不得包含任何外部 HTTP/HTTPS 依賴');
  assert.doesNotMatch(code, /fetch\(|XMLHttpRequest/i, '不得包含網路請求');
  assert.doesNotMatch(code, /<script|<link|<img/i, '不得動態注入外部標籤');
});

test('MasterVisualEngine - 6. 拉霸機 (SLOT_MACHINE) 停止時人名 100% 正對指針中心 (零壓線驗證)', () => {
  const MasterVisualEngine = require('../src/masterVisualEngine.js');
  const drawnTexts = [];
  const mockCtx = {
    clearRect: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    bezierCurveTo: () => {},
    arc: () => {},
    rect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fill: () => {},
    stroke: () => {},
    clip: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    fillText: (text, x, y) => {
      drawnTexts.push({ text, x, y });
    },
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    roundRect: () => {}
  };

  const mockCanvas = {
    width: 640,
    height: 480,
    getContext: () => mockCtx
  };

  const engine = new MasterVisualEngine(mockCanvas, null, 'OBSIDIAN_GOLD');
  engine.setCandidates(['王大明', '林小華', '張志豪', '陳冠宇']);

  // 繪製鎖定狀態的拉霸機 (slotPixelOffset = 0)
  engine._drawSlotStatic('陳冠宇', 1, true, 0, 0, '林小華', '張志豪', 0);

  const winnerDraw = drawnTexts.find(d => d.text === '陳冠宇');
  assert.ok(winnerDraw, '必須繪製出中獎人姓名「陳冠宇」');
  assert.ok(Math.abs(winnerDraw.y) <= 2, '中獎人姓名必須精確位於名牌與指針正中央 (y ≈ 0)，絕不可壓在名牌分界黑線上');
});

