# 純前端單檔離線抽獎 Web 應用 (Offline Lucky Draw Web App)

> **版本**：v1.1.0  
> **技術特性**：純前端、零依賴、離線可用、關閉即焚、單檔 HTML (< 65 KB)  
> **線上儲存庫**：[lintoro/offline-lucky-draw](https://github.com/lintoro/offline-lucky-draw)

---

## 專案亮點與核心價值

1. **企業級關閉即焚 (Zero Persistence)**：
   - 絕不使用 `localStorage`、`sessionStorage`、`indexedDB` 或 `Cookie`。
   - 所有名單資料僅在瀏覽器記憶體 (RAM) 中運作，關閉分頁或重新整理即物理蒸發，杜絕個資洩漏。
2. **絕對離線可用 (Zero External Requests)**：
   - 內嵌嚴格 CSP：`default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';`。
   - 零外部 CDN、零外部字型、零外部 mp3 音檔，完全斷網（飛航模式）下 100% 正常運作。
3. **自適應雙模渲染 (Adaptive Dual-Mode Engine)**：
   - **$\le 30$ 人**：Canvas 扇形彩色輪盤，指針撥動與減速物理曲線。
   - **$> 30$ 人**：自動切換至 Slot Reel 跑馬燈卡片滾輪，字體絕不擠壓破圖。
4. **原生合成音效與粒子動效**：
   - **Web Audio API**：原生振盪器合成轉盤「噠噠聲」與中獎「大三和弦慶祝聲」。
   - **Canvas Confetti**：全螢幕彩色紙花物理噴發。
5. **自克隆安全匯出 (Self-Cloning HTML)**：
   - 一鍵將目前名單與獎項設定 Base64 封裝並匯出為新的單檔 HTML，隨插即用。
6. **防亂碼與防公式注入 CSV 報表**：
   - 前置 UTF-8 BOM (`\uFEFF`)，Windows / Mac 繁中 Excel 開啟零亂碼。
   - 自動轉義 `=`, `+`, `-`, `@` 首字，防止 CSV 公式注入（Formula Injection）。

---

## 檔案結構

```text
├── docs/
│   └── SPEC_v1.1.0.md          # 完整企劃與設計規格書
├── src/
│   ├── stateManager.js          # 純記憶體狀態機與 CSPRNG
│   ├── audioSynthesizer.js      # Web Audio 原生音效合成器
│   ├── confetti.js              # Canvas 紙花粒子物理引擎
│   ├── renderEngine.js          # 雙模渲染引擎 (輪盤 / 跑馬燈)
│   └── exporter.js              # CSV BOM 報表與 Base64 自克隆匯出
├── tests/
│   ├── stateManager.test.js     # 狀態機與 10,000 次蒙地卡羅卡方檢驗
│   ├── audioAndRender.test.js   # 雙模門檻與音訊降級測試
│   ├── exporter.test.js         # CSV BOM 與公式注入防護測試
│   └── acceptance.test.js       # 全功能 F01~F08 與 NFR 體積掃描
├── PROGRESS.md                  # 開發進度與異地接續指引
├── index.html                   # 最終發佈版：53 KB 純前端自包含單檔 HTML
└── .gitignore
```

---

## 執行自動化測試

本專案使用 Node.js 原生測試執行器（Zero Dependency）：

```bash
node --test tests/*.test.js
```

### 驗證結果
- **測試總數**：22 項單元與整合測試
- **通過率**：100%
- **HTML 單檔體積**：約 53 KB（符合 $\le 65 \text{ KB}$ 規範）

---

## 如何使用

1. 下載 `index.html`。
2. 即使在**斷網環境**或隨身碟中，直接以任何現代瀏覽器（Chrome, Edge, Safari, Firefox）雙擊開啟即可。
3. 貼入名單、配置獎項後，可直接於現場投影抽獎，或點擊「匯出獨立單檔 HTML」預先做好抽獎專用檔。
