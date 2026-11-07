const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

test('E2E DOM 模擬抽獎完整流程驗證', async () => {
  const htmlPath = path.resolve(__dirname, '../index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Create JSDOM instance with scripts enabled and mock canvas / audio
  const dom = new JSDOM(htmlContent, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost/'
  });

  const { window } = dom;
  const { document } = window;

  // Mock requestAnimationFrame & cancelAnimationFrame
  let nextFrameId = 1;
  const activeFrames = new Map();
  window.requestAnimationFrame = (callback) => {
    const id = nextFrameId++;
    const timer = setTimeout(() => {
      activeFrames.delete(id);
      callback(Date.now());
    }, 16);
    activeFrames.set(id, timer);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    const timer = activeFrames.get(id);
    if (timer) {
      clearTimeout(timer);
      activeFrames.delete(id);
    }
  };

  // Mock AudioContext
  window.AudioContext = window.webkitAudioContext = class {
    constructor() {
      this.state = 'running';
      this.currentTime = 0;
      this.destination = {};
    }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createOscillator() {
      return {
        type: 'sine',
        frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {}
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {}
      };
    }
  };

  // Mock Canvas getContext
  const mockCtx = {
    clearRect: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    beginPath: () => {},
    closePath: () => {},
    arc: () => {},
    rect: () => {},
    roundRect: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {},
    fillText: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    bezierCurveTo: () => {},
    measureText: () => ({ width: 100 })
  };
  const canvases = document.querySelectorAll('canvas');
  canvases.forEach(c => {
    c.getContext = () => mockCtx;
  });

  // Allow DOM scripts to execute
  await new Promise(resolve => setTimeout(resolve, 50));

  // Step 1: Verify initial DOM elements
  const btnLoadSample = document.getElementById('btn-load-sample');
  const btnStartStage = document.getElementById('btn-start-stage');
  const inputCandidates = document.getElementById('input-candidates');
  const viewSetup = document.getElementById('view-setup');
  const viewStage = document.getElementById('view-stage');
  const btnSpin = document.getElementById('btn-spin');
  const winnerModal = document.getElementById('winner-modal-overlay');
  const modalWinnerName = document.getElementById('modal-winner-name');
  const btnModalContinue = document.getElementById('btn-modal-continue');

  assert.ok(btnLoadSample, 'btn-load-sample must exist');
  assert.ok(btnStartStage, 'btn-start-stage must exist');
  assert.ok(btnSpin, 'btn-spin must exist');
  assert.ok(winnerModal, 'winner-modal-overlay must exist');

  // Step 2: Click "載入範例名單" (30 people)
  btnLoadSample.click();
  const candidateLines = inputCandidates.value.trim().split('\n').filter(Boolean);
  assert.equal(candidateLines.length, 30, 'Sample candidate count should be 30');

  // Step 3: Enter stage theater
  btnStartStage.click();
  assert.ok(viewStage.classList.contains('active'), 'Stage view should be active');
  assert.ok(!viewSetup.classList.contains('active'), 'Setup view should be inactive');
  assert.equal(btnSpin.textContent.trim(), '開始抽獎', 'Spin button should say 開始抽獎');
  assert.equal(btnSpin.disabled, false, 'Spin button should not be disabled');

  // Fast-forward animation in spinTo by overriding duration to 20ms during test
  // Step 4: Click "開始抽獎"
  btnSpin.click();

  // Button should immediately show spinning state
  assert.equal(btnSpin.disabled, true, 'Spin button should be disabled during spin');
  assert.equal(btnSpin.textContent.trim(), '搖獎中...', 'Button text should be 搖獎中...');

  // Wait for animation and celebration to finish (spin duration + 800ms celebration)
  // We wait for winnerModal to become active
  let modalPopped = false;
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (winnerModal.classList.contains('active')) {
      modalPopped = true;
      break;
    }
  }

  assert.ok(modalPopped, 'Winner modal overlay should become active after draw finishes');
  assert.ok(modalWinnerName.textContent.trim().length > 0, 'Winner name should be populated');
  const firstWinner = modalWinnerName.textContent.trim();
  assert.ok(candidateLines.includes(firstWinner), `Winner ${firstWinner} must be one of the candidates`);

  // Step 5: Continue next round via btnModalContinue click
  btnModalContinue.click();
  assert.ok(!winnerModal.classList.contains('active'), 'Modal should close after continue');

  // Step 6: Test Space key trigger for next spin
  const spaceEvent = new window.KeyboardEvent('keydown', { code: 'Space', bubbles: true });
  window.dispatchEvent(spaceEvent);

  assert.equal(btnSpin.disabled, true, 'Spin button should be disabled when spinning via Space');
  assert.equal(btnSpin.textContent.trim(), '搖獎中...');

  // Wait for next winner modal
  modalPopped = false;
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (winnerModal.classList.contains('active')) {
      modalPopped = true;
      break;
    }
  }
  assert.ok(modalPopped, 'Second winner modal overlay should become active');
  const secondWinner = modalWinnerName.textContent.trim();
  assert.ok(secondWinner.length > 0, 'Second winner name should be populated');

  // Close modal with Space key
  window.dispatchEvent(spaceEvent);
  assert.ok(!winnerModal.classList.contains('active'), 'Modal should close when Space pressed');

  console.log('E2E DOM Draw flow verified successfully! First winner:', firstWinner, ', Second winner:', secondWinner);
});

test('全景開箱滑軌 (RIBBON_TAPE) - 100人以上名冊容納與滾動對齊驗證', async () => {
  const MasterVisualEngine = require('../src/masterVisualEngine.js');
  const StateManager = require('../src/stateManager.js');

  // 生成 120 位真實候選人
  const hundredList = Array.from({ length: 120 }, (_, i) => `同仁編號_${(i + 1).toString().padStart(3, '0')}`);
  const sm = new StateManager({
    candidatePool: hundredList,
    prizes: [{ id: 'p1', name: '特獎 iPhone 16 Pro', totalQuota: 1 }]
  });

  assert.equal(sm.candidatePool.length, 120, '名冊人數必須為 120 人');
  assert.ok(sm.ANIMATION_MODES.includes('RIBBON_TAPE'), '5大開獎模式必須包含 RIBBON_TAPE');

  // 驗證 VisualEngine 初始化與捲帶產生
  const mockCanvas = { width: 640, height: 480, getContext: () => null };
  const engine = new MasterVisualEngine(mockCanvas);
  engine.setCandidates(hundredList);
  engine.setMode('RIBBON_TAPE');

  assert.equal(engine.currentMode, 'RIBBON_TAPE', '當前模式必須為 RIBBON_TAPE');

  // 模擬啟動抽獎
  const pending = sm.startSpin();
  assert.ok(hundredList.includes(pending.winnerName), '得獎者必須在 120 人名單之內');

  let spinCompleted = false;
  engine.spinTo('RIBBON_TAPE', pending.winnerIndex, pending.winnerName, 100, () => {
    spinCompleted = true;
  });

  await new Promise(r => setTimeout(r, 120));
  assert.ok(spinCompleted, '120人名冊抽獎必須正常平滑完成無拋錯');
  assert.ok(engine.ribbonStrip.length >= 120, '滑軌卡片清單必須容納百人候選名冊');
});

