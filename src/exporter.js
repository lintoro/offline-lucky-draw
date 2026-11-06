/**
 * 純前端單檔離線抽獎 Web 應用 - 匯出引擎 (BlobExporter & CsvExporter)
 * 規格版本: v1.1.0
 * 
 * 資安與規範:
 * - RFC 4180 標準相容
 * - 前置 UTF-8 BOM (\uFEFF) 保證 Excel 繁體中文零亂碼
 * - Formula Injection 防公式注入：首字 =, +, -, @ 強制前綴單引號
 * - 自克隆 HTML Base64 安全注入，防止 </script> 標籤提早截斷
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Exporter = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CSV_HEADER = '序號,獎項名稱,中獎姓名,抽獎時間';

  /**
   * 清理並跳脫 CSV 單個儲存格內容
   * 1. 阻絕 Excel 公式注入 (Formula Injection)
   * 2. RFC 4180 引號跳脫處理
   * @param {*} val
   * @returns {string}
   */
  function sanitizeCsvCell(val) {
    if (val === null || val === undefined) return '""';
    var str = String(val);

    // 防範 Excel / CSV 公式注入 (首字為 =, +, -, @)
    if (/^[=+\-@]/.test(str)) {
      str = "'" + str;
    }

    // 若包含逗號、雙引號、換行符號，需以雙引號包裹，並將內部雙引號置換為兩個雙引號
    if (/[",\r\n]/.test(str)) {
      str = '"' + str.replace(/"/g, '""') + '"';
    } else {
      str = '"' + str + '"';
    }

    return str;
  }

  /**
   * 生成符合 RFC 4180 + UTF-8 BOM 的 CSV 字串
   * @param {Array<object>} historyRecords
   * @returns {string}
   */
  function generateCsv(historyRecords) {
    var lines = ['\uFEFF' + CSV_HEADER]; // 前置 UTF-8 BOM 防 Excel 亂碼

    if (Array.isArray(historyRecords)) {
      for (var i = 0; i < historyRecords.length; i++) {
        var rec = historyRecords[i];
        var row = [
          sanitizeCsvCell(rec.sequence !== undefined ? rec.sequence : i + 1),
          sanitizeCsvCell(rec.prizeName || '未命名獎項'),
          sanitizeCsvCell(rec.winnerName || '未填寫姓名'),
          sanitizeCsvCell(rec.timestamp || new Date().toISOString())
        ];
        lines.push(row.join(','));
      }
    }

    return lines.join('\r\n');
  }

  /**
   * 觸發瀏覽器下載 Blob 檔案
   * @param {string|Blob} content
   * @param {string} filename
   * @param {string} mimeType
   */
  function downloadBlob(content, filename, mimeType) {
    if (typeof window === 'undefined' || !window.document) return false;

    var blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    var url = window.URL.createObjectURL(blob);
    var a = window.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    window.document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
    return true;
  }

  /**
   * 下載中獎報表 CSV
   * @param {Array<object>} historyRecords
   * @param {string} [filename]
   */
  function downloadCsvReport(historyRecords, filename) {
    var csvContent = generateCsv(historyRecords);
    var name = filename || ('抽獎中獎名單_' + new Date().toISOString().slice(0, 10) + '.csv');
    return downloadBlob(csvContent, name, 'text/csv;charset=utf-8;');
  }

  /**
   * 生成注入 Base64 狀態的自克隆 HTML 內容
   * @param {string} fullHtmlSource 原始 HTML 字串
   * @param {string} base64Bundle Base64 編碼之狀態包
   * @returns {string}
   */
  function injectBundleIntoHtml(fullHtmlSource, base64Bundle) {
    if (typeof fullHtmlSource !== 'string') return '';
    var safeBase64 = String(base64Bundle || '').trim();
    var bundleTag = '<script id="__INITIAL_BUNDLE__" type="text/plain">\n' + safeBase64 + '\n</script>';

    // 若原始 HTML 內已存在 __INITIAL_BUNDLE__ 標籤，則精準取代其內容
    var bundleRegex = /<script\s+id="__INITIAL_BUNDLE__"\s+type="text\/plain">[\s\S]*?<\/script>/i;
    if (bundleRegex.test(fullHtmlSource)) {
      return fullHtmlSource.replace(bundleRegex, bundleTag);
    }

    // 否則注入於 </head> 之前，或 </body> 之前
    if (fullHtmlSource.indexOf('</head>') !== -1) {
      return fullHtmlSource.replace('</head>', bundleTag + '\n</head>');
    } else if (fullHtmlSource.indexOf('</body>') !== -1) {
      return fullHtmlSource.replace('</body>', bundleTag + '\n</body>');
    }

    return fullHtmlSource + '\n' + bundleTag;
  }

  /**
   * 下載自克隆獨立單檔 HTML
   * @param {string} htmlTemplate 頁面 HTML 源碼
   * @param {string} base64Bundle
   * @param {string} [filename]
   */
  function downloadClonedHtml(htmlTemplate, base64Bundle, filename) {
    var outputHtml = injectBundleIntoHtml(htmlTemplate, base64Bundle);
    var name = filename || ('offline-lucky-draw-bundle.html');
    return downloadBlob(outputHtml, name, 'text/html;charset=utf-8;');
  }

  return {
    sanitizeCsvCell: sanitizeCsvCell,
    generateCsv: generateCsv,
    downloadCsvReport: downloadCsvReport,
    injectBundleIntoHtml: injectBundleIntoHtml,
    downloadClonedHtml: downloadClonedHtml
  };
});
