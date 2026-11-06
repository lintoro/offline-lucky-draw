const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const RenderEngine = require('../src/renderEngine.js');
const AudioSynthesizer = require('../src/audioSynthesizer.js');
const ConfettiEngine = require('../src/confetti.js');

test('RenderEngine - 1. 自適應雙模門檻切換 (<= 30 為 WHEEL, > 30 為 SLOT)', () => {
  const engine = new RenderEngine(null, null, null);

  // 10 人 -> WHEEL
  const list10 = Array.from({ length: 10 }, (_, i) => `User_${i}`);
  assert.equal(engine.setCandidates(list10), 'WHEEL');

  // 恰好 30 人 -> WHEEL
  const list30 = Array.from({ length: 30 }, (_, i) => `User_${i}`);
  assert.equal(engine.setCandidates(list30), 'WHEEL');

  // 31 人 -> 自動切換為 SLOT
  const list31 = Array.from({ length: 31 }, (_, i) => `User_${i}`);
  assert.equal(engine.setCandidates(list31), 'SLOT');

  // 500 人大名單 -> SLOT
  const list500 = Array.from({ length: 500 }, (_, i) => `User_${i}`);
  assert.equal(engine.setCandidates(list500), 'SLOT');
});

test('RenderEngine - 2. 動畫停止與緩衝區清理防洩漏', () => {
  const engine = new RenderEngine(null, null, null);
  engine.isSpinning = true;
  engine.animationId = 999;

  engine.stop();
  assert.equal(engine.isSpinning, false);
  assert.equal(engine.animationId, null);
});

test('AudioSynthesizer - 3. 無音訊環境或阻擋時平滑降級無拋錯', () => {
  const audio = new AudioSynthesizer();
  // 在 Node 環境中沒有原生 AudioContext，測試呼叫時是否完全不崩潰
  assert.doesNotThrow(() => {
    audio.init();
    audio.playTick();
    audio.playFanfare();
    audio.close();
  });
});

test('ConfettiEngine - 4. 粒子引擎狀態重置與停止防禦', () => {
  const confetti = new ConfettiEngine(null);
  assert.equal(confetti.isActive, false);

  // 無 Canvas 時安全呼叫
  assert.doesNotThrow(() => {
    confetti.fire(50);
    confetti.stop();
  });
});

test('Stage 2 資安與零外部依賴檢驗 (Zero External Assets)', () => {
  const files = [
    '../src/audioSynthesizer.js',
    '../src/confetti.js',
    '../src/renderEngine.js'
  ];

  for (const file of files) {
    const raw = fs.readFileSync(require.resolve(file), 'utf-8');
    const code = raw.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

    assert.ok(!code.includes('http://'), `${file} 不得包含 http 外部連結`);
    assert.ok(!code.includes('https://'), `${file} 不得包含 https 外部連結`);
    assert.ok(!code.includes('.mp3'), `${file} 不得依賴外部 mp3 音檔`);
    assert.ok(!code.includes('.wav'), `${file} 不得依賴外部 wav 音檔`);
    assert.ok(!code.includes('localStorage'), `${file} 嚴禁使用 localStorage`);
  }
});
