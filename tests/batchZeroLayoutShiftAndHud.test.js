const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const HTML_PATH = path.resolve(__dirname, '../index.html');

test('BatchHUD & ZeroLayoutShift - 1. 2A 架構頂部金色 HUD 徽章 DOM 與樣式驗證', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  const dom = new JSDOM(html, { runScripts: 'dangerously' });
  const { document } = dom.window;

  const spotlight = document.querySelector('.stage-spotlight');
  assert.ok(spotlight, '必須具備 .stage-spotlight 容器');

  const hud = document.getElementById('stage-batch-hud');
  assert.ok(hud, '必須具備 #stage-batch-hud 獨立頂部 HUD 徽章');
  assert.ok(spotlight.contains(hud), '#stage-batch-hud 必須位於舞台聚光燈容器內');

  const hudText = document.getElementById('stage-batch-hud-text');
  assert.ok(hudText, '必須具備 #stage-batch-hud-text 動態文字節點');

  // 驗證 CSS 中 1B 與 2A 規則
  assert.ok(html.includes('.stage-batch-hud{position:absolute;top:12px;left:50%'), '必須包含 HUD 頂部懸浮定位');
  assert.ok(html.includes('.stage-batch-hud.hidden{display:none'), '必須包含 HUD hidden 狀態');
  assert.ok(html.includes('.btn-stage-spin{width:220px;min-width:220px;max-width:220px;height:48px'), '開獎按鈕必須具備 220px x 48px 固定幾何尺寸，達成零位移 (1B)');
  assert.ok(html.includes('.batch-select{background:var(--bg-base);border:1px solid var(--border-focus);color:#fff;padding:6px 8px;border-radius:var(--radius-sm);font-size:0.84rem;outline:none;cursor:pointer;transition:border-color 0.2s;width:155px;min-width:155px;max-width:155px'), '模式選單必須具備 155px 固定寬度 (1B)');
  assert.ok(html.includes('.batch-mode-desc-hint{display:none !important}'), '伸縮說明字串必須隱藏，徹底避免版面推擠跳動 (1B)');
});

test('BatchHUD & ZeroLayoutShift - 2. 全開模式切換與抽獎時純姓名名牌零出血驗證 (2A)', async () => {
  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost/'
  });
  const { window } = dom;
  const { document } = window;

  // Mock Audio & Canvas
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

  const inputCandidates = document.getElementById('input-candidates');
  const candidateNames = ['陳大文', '林小明', '張三', '李四', '王五'];
  inputCandidates.value = candidateNames.join('\n');
  inputCandidates.oninput();

  const btnStartStage = document.getElementById('btn-start-stage');
  btnStartStage.click();

  const selMode = document.getElementById('stage-batch-mode-select');
  const btnSpin = document.getElementById('btn-spin');
  const hud = document.getElementById('stage-batch-hud');
  const hudText = document.getElementById('stage-batch-hud-text');

  // 1. 切換至 SINGLE 模式：HUD 隱藏
  selMode.value = 'SINGLE';
  selMode.onchange();
  assert.ok(hud.classList.contains('hidden'), '一般模式下 HUD 徽章應隱藏');
  assert.ok(btnSpin.textContent.includes('開始抽獎'), '一般模式按鈕文字');

  // 2. 切換至 BATCH_ALL 模式：HUD 亮起
  selMode.value = 'BATCH_ALL';
  selMode.onchange();
  assert.ok(!hud.classList.contains('hidden'), '全開模式下 HUD 徽章應顯示');
  assert.ok(hudText.textContent.includes('全開模式'), 'HUD 文字應提示全開模式');
  assert.ok(btnSpin.classList.contains('btn-stage-spin-batch'), '按鈕應具備全開主題樣式 .btn-stage-spin-batch');

  // 3. 執行全開抽獎
  btnSpin.click();
  assert.equal(btnSpin.textContent.trim(), '搖獎中...', '搖獎中按鈕文字保持固定穩定度');
  assert.ok(!hud.classList.contains('hidden'), '搖獎時 HUD 保持高亮');

  // 等待抽獎完成
  const winnerModal = document.getElementById('winner-modal-overlay');
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (winnerModal.classList.contains('active')) break;
  }
  assert.ok(winnerModal.classList.contains('active'), '彈窗已彈出');

  // 4. 驗證全開得獎名牌 (2A 規範)：
  // 4a. modalWinnerName 在多名額全開時隱藏
  const modalWinnerName = document.getElementById('modal-winner-name');
  assert.ok(modalWinnerName.classList.contains('hidden'), '全開多得主時單一名牌應隱藏，改由 3D 多名牌矩陣展示');

  // 4b. 驗證 modalBatchContainer 內的所有得獎名牌為純姓名，絕無「等N位」拼接
  const batchCards = Array.from(document.querySelectorAll('.batch-card-name')).map(el => el.textContent.trim());
  assert.ok(batchCards.length > 1, `應產生複數個中獎卡片 (實際: ${batchCards.length})`);
  batchCards.forEach(name => {
    assert.ok(candidateNames.includes(name), `卡片姓名 "${name}" 必須為原始候選人純姓名之一`);
    assert.ok(!/等\s*\d+\s*[位人]/.test(name), `卡片姓名絕不可包含「等N人/位」字串 (實際為: ${name})`);
  });
});
