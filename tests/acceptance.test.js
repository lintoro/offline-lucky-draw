const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML_PATH = path.resolve(__dirname, '../index.html');

test('Acceptance F01 & NFR - 單檔 HTML 體積與 CSP 安全性標頭檢驗', () => {
  assert.ok(fs.existsSync(HTML_PATH), 'index.html 必須存在於專案根目錄');
  const stats = fs.statSync(HTML_PATH);
  const sizeKb = stats.size / 1024;
  
  // NFR: 最終單檔 HTML 原始碼 <= 65 KB
  assert.ok(stats.size <= 65 * 1024, `檔案體積 ${sizeKb.toFixed(2)} KB 超過 65 KB 上限`);

  const html = fs.readFileSync(HTML_PATH, 'utf-8');

  // CSP 嚴格性
  assert.ok(
    html.includes(`content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';"`),
    '必須包含嚴格的 CSP 標頭'
  );

  // 零外部資源引用
  const scriptSrcs = html.match(/<script[^>]+src=["']([^"']+)["']/gi) || [];
  assert.equal(scriptSrcs.length, 0, '嚴禁引用外部 script 檔案');

  const linkCss = html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi) || [];
  assert.equal(linkCss.length, 0, '嚴禁引用外部 CSS 檔案');

  const externalUrls = html.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  assert.equal(externalUrls.length, 0, '不得包含任何外部 HTTP/HTTPS 請求位址');
});

test('Acceptance F08 - 關閉即焚 (Zero Persistence) 完整性掃描', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  // 移除註解以檢驗純程式碼行為
  const code = html.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

  assert.ok(!code.includes('localStorage'), 'index.html 嚴禁包含 localStorage');
  assert.ok(!code.includes('sessionStorage'), 'index.html 嚴禁包含 sessionStorage');
  assert.ok(!code.includes('indexedDB'), 'index.html 嚴禁包含 indexedDB');
  assert.ok(!code.includes('document.cookie'), 'index.html 嚴禁包含 cookie');
});

test('Acceptance F05 - 加密級公平隨機數 CSPRNG 規範檢驗', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  assert.ok(html.includes('getRandomValues'), '必須使用 crypto.getRandomValues 抽取中獎者');
});

test('Acceptance F06 & F07 - 自克隆錨點與 CSV 安全規範檢驗', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  assert.ok(html.includes('id="__INITIAL_BUNDLE__"'), '必須具備 __INITIAL_BUNDLE__ 錨點');
  assert.ok(html.includes('\\uFEFF'), 'CSV 匯出必須含有 UTF-8 BOM 防亂碼字元');
  assert.ok(html.includes('^[=+\\-@]'), 'CSV 匯出必須包含防 Excel 公式注入正則檢測');
});
