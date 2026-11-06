const test = require('node:test');
const assert = require('node:assert/strict');
const Exporter = require('../src/exporter.js');

test('Exporter - 1. UTF-8 BOM 前置防亂碼檢驗', () => {
  const csv = Exporter.generateCsv([]);
  assert.equal(csv.charCodeAt(0), 0xFEFF, 'CSV 第一個字元必須是 UTF-8 BOM (0xFEFF)');
  assert.ok(csv.startsWith('\uFEFF序號,獎項名稱,中獎姓名,抽獎時間'));
});

test('Exporter - 2. Excel 公式注入防護 (Formula Injection Prevention)', () => {
  const maliciousCandidates = [
    '=cmd|\'/C calc\'!A0',
    '+1234567890',
    '-cmd.exe',
    '@SUM(1+1)'
  ];

  const records = maliciousCandidates.map((name, i) => ({
    sequence: i + 1,
    prizeName: '安全測試獎',
    winnerName: name,
    timestamp: '2026-11-06T00:00:00Z'
  }));

  const csv = Exporter.generateCsv(records);

  // 驗證首字是否全數被前置單引號 '
  assert.ok(csv.includes("'=cmd|"), '= 開頭必須被單引號跳脫');
  assert.ok(csv.includes("'+1234567890"), '+ 開頭必須被單引號跳脫');
  assert.ok(csv.includes("'-cmd.exe"), '- 開頭必須被單引號跳脫');
  assert.ok(csv.includes("'@SUM(1+1)"), '@ 開頭必須被單引號跳脫');
});

test('Exporter - 3. RFC 4180 特殊字元與雙引號跳脫檢驗', () => {
  const records = [
    {
      sequence: 1,
      prizeName: '特獎 "極致版"',
      winnerName: '王大明, 小名阿明',
      timestamp: '2026-11-06T12:00:00Z'
    }
  ];

  const csv = Exporter.generateCsv(records);
  const rows = csv.split('\r\n');
  assert.equal(rows.length, 2);

  // 檢查雙引號是否置換為 "" 且全欄被引號包裹
  assert.ok(rows[1].includes('"特獎 ""極致版"""'));
  // 檢查含逗號者被雙引號包裹
  assert.ok(rows[1].includes('"王大明, 小名阿明"'));
});

test('Exporter - 4. 自克隆 HTML Base64 Bundle 注入與覆蓋替換', () => {
  const sampleHtml = '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>App</h1></body></html>';
  const bundleData = 'eyJjYW5kaWRhdGVzIjpbIkFsaWNlIl19'; // {"candidates":["Alice"]}

  // 初次注入
  const injectedHtml = Exporter.injectBundleIntoHtml(sampleHtml, bundleData);
  assert.ok(injectedHtml.includes('<script id="__INITIAL_BUNDLE__" type="text/plain">'));
  assert.ok(injectedHtml.includes(bundleData));

  // 二次注入覆寫
  const newBundleData = 'eyJjYW5kaWRhdGVzIjpbIkJvYiJdfQ=='; // {"candidates":["Bob"]}
  const overwrittenHtml = Exporter.injectBundleIntoHtml(injectedHtml, newBundleData);
  assert.ok(overwrittenHtml.includes(newBundleData));
  assert.ok(!overwrittenHtml.includes(bundleData), '舊的 Bundle 應被乾淨覆蓋');
});
