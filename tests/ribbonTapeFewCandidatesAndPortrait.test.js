const { test } = require('node:test');
const assert = require('node:assert/strict');

// Mock requestAnimationFrame for node test runner
if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}

const MasterVisualEngine = require('../src/masterVisualEngine.js');

function createMockCanvas() {
  const renderedTexts = [];
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
    fillText: (text, x, y) => {
      renderedTexts.push({ text: String(text), x, y });
    },
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    roundRect: () => {}
  };

  const canvas = {
    width: 360,
    height: 640,
    style: { width: '360px', height: '640px' },
    getContext: () => mockCtx
  };

  return { canvas, mockCtx, renderedTexts };
}

test('RIBBON_TAPE - 1. 9:16 手機直屏下，僅剩 1 位候選人時全景開箱軌道絕不黑屏且準確置中', () => {
  const { canvas, renderedTexts } = createMockCanvas();
  const engine = new MasterVisualEngine(canvas, null, 'OBSIDIAN_GOLD', '9:16');
  
  // 模擬抽到最後壓軸大獎：候選池僅剩 1 人，大會原名冊有 5 人
  const remaining = ['壓軸幸運兒'];
  const allCandidates = ['陳大明', '林小華', '張志豪', '黃美麗', '壓軸幸運兒'];
  engine.setCandidates(remaining, allCandidates);

  assert.equal(engine.aspectRatio, '9:16');
  assert.equal(engine.logicalW, 360);
  assert.equal(engine.logicalH, 640);

  // 靜態渲染測試 (offset = 0)
  renderedTexts.length = 0;
  engine._drawRibbonStatic(0, 1, null, false);
  assert.ok(renderedTexts.length >= 3, '靜態狀態下可視範圍必須至少渲染 3 張以上名牌');
  assert.ok(
    renderedTexts.some(t => allCandidates.includes(t.text)),
    '可視名牌中必須出現人員名冊姓名，不可為黑屏或空缺'
  );

  // 執行 spinTo
  let spinDone = false;
  engine.spinTo('RIBBON_TAPE', 0, '壓軸幸運兒', 50, () => {
    spinDone = true;
  });

  // 驗證步幅與終點偏移量同源 (9:16 步幅 stride 必須為 120 + 12 = 132)
  const expectedStride = 132;
  const targetK = engine.ribbonTargetIndex;
  assert.equal(engine.ribbonFinalOffset, targetK * expectedStride, '終點偏移量必須精確使用 9:16 的 132 步幅');
  assert.ok(engine.ribbonStrip.length >= targetK + 40, '滾動帶必須具備足夠的右側安全緩衝卡槽');

  // 繪製終點狀態 (offset = finalOffset)
  renderedTexts.length = 0;
  engine._drawRibbonStatic(engine.ribbonFinalOffset, 1, '壓軸幸運兒', true);

  // 驗證終點時可視卡片不為 0（杜絕黑屏根本原因！）
  const nameTexts = renderedTexts.filter(t => !t.text.startsWith('NO.') && !t.text.includes('★') && !t.text.includes('◈'));
  assert.ok(nameTexts.length >= 3, `終點狀態可視卡片數必須 >= 3，實測為 ${nameTexts.length}，絕不可黑屏`);

  // 驗證得主名字被正確渲染
  assert.ok(
    renderedTexts.some(t => t.text === '壓軸幸運兒'),
    '準心鎖定中心必須出現得獎者姓名「壓軸幸運兒」'
  );
  assert.ok(
    renderedTexts.some(t => t.text === '★ WINNER LOCKED ★'),
    '必須包含中獎鎖定標籤'
  );
});

test('RIBBON_TAPE - 2. 16:9 寬螢幕下，名冊抽空極端邊界測試 (動態環形安全兜底)', () => {
  const { canvas, renderedTexts } = createMockCanvas();
  canvas.width = 640;
  canvas.height = 480;
  const engine = new MasterVisualEngine(canvas, null, 'OBSIDIAN_GOLD', '16:9');
  
  // 極端測試：名冊全部為空
  engine.setCandidates([], []);

  // 測試任意極端偏移量（如 offset = 9999999 或 offset = -9999999）
  for (const extremeOffset of [0, 8800, 999999, -5000]) {
    renderedTexts.length = 0;
    assert.doesNotThrow(() => {
      engine._drawRibbonStatic(extremeOffset, 1, '唯一孤勇者', true);
    }, '任何極端偏移量下 _drawRibbonStatic 絕對不得拋出異常');

    const cardNames = renderedTexts.filter(t => !t.text.startsWith('NO.') && !t.text.includes('★') && !t.text.includes('◈'));
    assert.ok(cardNames.length >= 3, `偏移量 ${extremeOffset} 時卡片數必須 >= 3，杜絕黑屏穿幫`);
    // 驗證沒有任何 undefined 或 NaN
    assert.ok(!renderedTexts.some(t => t.text.includes('undefined') || t.text.includes('NaN')));
  }
});
