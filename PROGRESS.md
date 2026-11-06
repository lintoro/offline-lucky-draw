# 專案開發進度與異地接續指南 (Project Progress & Resumption Guide)

## 專案基本資訊
- **專案名稱**：純前端單檔離線抽獎 Web 應用 (Offline Lucky Draw Web App)
- **版本目標**：v1.1.0
- **儲存庫**：https://github.com/lintoro/offline-lucky-draw
- **技術架構**：零依賴、純前端單檔 HTML、Web Audio API、Canvas 雙模渲染、CSPRNG 加密級隨機、關閉即焚 (Zero Persistence)

---

## 異地換機接續指引 (For Remote / New Agents)
若在其他電腦或新會話開啟本專案，請按以下步驟接續：
1. 確認工作目錄為 `offline-lucky-draw`。
2. 閱讀 `docs/SPEC_v1.1.0.md` 掌握整體規格與驗收標準。
3. 閱讀本檔案下方之「目前完成階段與測試狀態」，執行 `node --test tests/` 確認所有既有測試通過。
4. 接續執行「進行中 / 下一階段任務」。

---

## 里程碑階段與狀態

| 階段 | 模組名稱 | 描述 | 狀態 | 測試覆蓋 |
| :--- | :--- | :--- | :--- | :--- |
| **Stage 1** | **核心狀態機與 CSPRNG (StateManager)** | 純記憶體狀態流轉、CSPRNG 加密級隨機抽獎、名單正規化驗證、多階層獎項配額控管、緊急編輯與防呆 | 已完成 (Completed) | 9/9 通過 (100%) |
| **Stage 2** | **雙模渲染與特效引擎 (RenderEngine & Audio)** | Canvas 彩色扇形輪盤（$\le 30$ 人）、Slot Reel 跑馬燈卡片（$> 30$ 人）、Web Audio 振盪器音效、Canvas Confetti 粒子 | 已完成 (Completed) | 5/5 通過 (100%) |
| **Stage 3** | **安全匯出引擎 (BlobExporter & CsvExporter)** | Base64 安全自克隆 HTML 封裝、UTF-8 BOM RFC 4180 CSV 報表匯出與 Excel 公式注入防護 | 已完成 (Completed) | 4/4 通過 (100%) |
| **Stage 4** | **單檔打包整合與 UI/UX (Single-File Assembly)** | 響應式投屏介面、鍵盤快捷鍵、嚴格 CSP 標頭嵌入、關閉即焚安全檢驗、全功能驗收清單驗證 | 進行中 (In Progress) | 待執行 |

---

## 測試矩陣檢驗紀錄 (Test Verification Log)
### Stage 1: StateManager & CSPRNG (2026-11-06)
- [x] **T01** 名單解析與空行修剪過濾（`\r\n` CRLF 與頭尾空格自動修剪）
- [x] **T02** 狀態機雙向合法轉移（`SETUP` <-> `READY` 邊界防呆）
- [x] **T03** CSPRNG 蒙地卡羅 10,000 次均勻分佈檢驗（卡方檢定 $\chi^2 < 18.47$，無 Modulo Bias）
- [x] **T04** 抽獎流程扣減與去重抽樣（`allowDuplicates: false` 候選人中獎即剔除）
- [x] **T05** 候選人名額不足防呆處理（切換至 `PARTIAL_FILLED` 攔截後續無效抽取）
- [x] **T06** 多階層獎項配額自動切換（`autoSwitchTier: true` 連續抽獎）
- [x] **T07** 緊急中途編輯中斷（`EMERGENCY_EDIT` 安全取消狀態並保留輸入）
- [x] **T08** 自克隆 Base64 安全封裝還原（Round-trip 雙向測試）
- [x] **T09** 靜態資安掃描（零持久化檢測：無 `localStorage`、`sessionStorage`、`indexedDB`、`cookie`，無偽隨機 `Math.random`）

### Stage 2: RenderEngine & AudioSynthesizer (2026-11-06)
- [x] **T10** 自適應雙模臨界切換（$\le 30$ 為 WHEEL 輪盤，$> 30$ 自動切換為 SLOT 跑馬燈）
- [x] **T11** 動畫幀與緩衝區清理（`stop()` 清除 `animationId`，防 GPU / CPU 洩漏）
- [x] **T12** Web Audio 合成器原生降級（無音訊硬體或政策阻擋時平滑降級無拋錯）
- [x] **T13** Canvas Confetti 粒子生命週期（重力、空氣阻力與銷毀清理）
- [x] **T14** Stage 2 零外部依賴與零網路請求靜態掃描（無外部 mp3/wav/url）

### Stage 3: Exporter & Security Contracts (2026-11-06)
- [x] **T15** UTF-8 BOM 前置防亂碼檢驗（`\uFEFF` 開頭，確保 Excel 繁體中文零亂碼）
- [x] **T16** Excel 公式注入防護（Formula Injection 檢測，首字為 `=`, `+`, `-`, `@` 自動跳脫前綴 `'`）
- [x] **T17** RFC 4180 標準跳脫（逗號、雙引號、換行符雙重引號包裹）
- [x] **T18** 自克隆 HTML Base64 Bundle 注入與覆蓋替換驗證



