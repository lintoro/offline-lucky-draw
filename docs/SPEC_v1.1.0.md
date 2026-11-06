# 純前端單檔離線抽獎 Web 應用 (Offline Lucky Draw Web App) 完整企劃與設計規格書

> **專案版本**：v1.1.0  
> **專案狀態**：Approved (已完成 EGM 盲審與補丁閉環，具備 100% 可執行性)  
> **技術定位**：純前端、零依賴、離線可用、關閉即焚單檔 HTML 互動工具

---

## 一、 專案背景與核心價值 (Project Context & Value)

在各類型尾牙、春酒、講座、派對或內部行銷活動中，主辦方經常需要一套兼具**視覺張力（轉盤/拉霸動畫、紙花特效）與互動即時性**的抽獎工具。然而市面現有方案多半存在以下痛點：

1. **隱私與個資洩漏疑慮**：名單需上傳第三方伺服器，違反企業資安政策。  
2. **網路依賴性高**：現場 Wi-Fi 不穩或斷網時導致活動中斷卡死。  
3. **部署與維護門檻高**：需要搭建 Node.js、Python 或資料庫環境，非技術人員無法獨立攜帶使用。

本專案旨在提供一份\*\*「零依賴、純前端單檔 HTML (Self-Contained Single-File HTML)」\*\*的標準模板。使用者僅需在單一介面中貼入名單與設定獎項，即可：

- 在本地瀏覽器即時呈現流暢的物理抽獎動畫。  
- 一鍵將「包含已設定資料」的狀態打包為另一個獨立的 `.html` 檔案下載帶走（隨身碟隨插即用）。  
- 抽獎結束後匯出不亂碼的標準 CSV 報表。  
- **關閉分頁即物理蒸發**：完全不將個資寫入本機硬碟、Cookie 或 Storage，確保企業級隱私。

---

## 二、 核心架構與狀態機 (Architecture & State Machine)

### 2.1 系統架構簡述

系統內部所有樣式 (CSS)、邏輯 (Vanilla JS)、圖示 (Inline SVG)、音效合成 (Web Audio API) 與動態粒子 (Canvas API) 均 100% 內嵌於單一 HTML 檔案，不發送任何外部網路請求。

```
graph TD
    A[使用者輸入 / 本地檔案匯入] --> B[資料正規化與驗證模組]
    B --> C[狀態管理器 StateManager (In-Memory)]
    C --> D[自克隆安全匯出引擎 (Base64 Blob Exporter)]
    C --> E[抽獎舞台渲染引擎 (雙模: Canvas Wheel / Slot Reel)]
    E --> F[Web Audio 音效合成器 (OscillatorNode)]
    E --> G[Canvas Confetti 粒子引擎]
    E --> H[中獎結果收集器]
    H --> I[UTF-8 BOM CSV 匯出模組]
    C --> J[緊急重置與中途編輯模組]
```

#### 元件職責劃分

- **StateManager**：純記憶體運行的核心狀態機，負責維持名單、獎項、抽獎狀態與中獎歷程。  
- **RenderEngine**：自適應雙模渲染引擎。名單 \$\\le 30\$ 人時啟用高流暢 Canvas 扇形轉盤；名單 \$\> 30\$ 人時自動平滑切換至跑馬燈滾輪卡片 (Slot Reel)，防止字體壓縮重疊。  
- **AudioSynthesizer**：利用瀏覽器原生 Web Audio API 合成指針轉動「噠噠聲」與中獎「慶祝和弦聲」，零外部音檔依賴。  
- **BlobExporter**：負責將目前記憶體中的資料安全編碼注入 HTML 骨架，生成獨立帶走的單檔檔案。  
- **CsvExporter**：依據 RFC 4180 標準編譯中獎清單，內嵌 UTF-8 BOM 與公式注入防護。

---

### 2.2 核心狀態機定義 (State Lifecycle)

```
stateDiagram-v2
    [*] --> SETUP: 頁面載入 / 初始化
    SETUP --> READY: 名單與獎項驗證通過
    READY --> SETUP: 修改參數 / 重新載入
    READY --> EXPORTING_HTML: 觸發匯出獨立單檔
    EXPORTING_HTML --> READY: 下載完成
    READY --> SPINNING: 觸發抽獎 (Click / Spacebar)
    SPINNING --> REVEALED: 旋轉動畫物理減速定格
    REVEALED --> SPINNING: 抽取下一位 (名額未滿)
    REVEALED --> PARTIAL_FILLED: 候選池用罄但名額未滿
    REVEALED --> COMPLETED: 全部獎項與名額抽取完畢
    REVEALED --> SETUP: 中途緊急編輯 (保留現有輸入)
    COMPLETED --> EXPORTING_CSV: 匯出中獎報表
    EXPORTING_CSV --> COMPLETED: 下載完成
    COMPLETED --> SETUP: 完整重置 (銷毀歷程)
    SETUP --> [*]: 關閉分頁 (記憶體物理釋放)
```

#### 狀態轉移與觸發條件矩陣

| 當前狀態 | 觸發事件 | 轉移條件 | 目標狀態 | 具體執行動作 |
| :---- | :---- | :---- | :---- | :---- |
| `SETUP` | `VALIDATE_INPUT` | 有效名單數 \$\\ge 1\$ 且獎項名額 \$\\ge 1\$ | `READY` | 驗證通過，解鎖舞台按鈕，依人數判定渲染模式 |
| `READY` | `START_SPIN` | 點擊開始或按下空白鍵 | `SPINNING` | 鎖定操作面板 (Debounce)，啟動音效與動畫迴圈 |
| `SPINNING` | `ANIMATION_END` | 動畫緩速達到定格角度 | `REVEALED` | 寫入中獎陣列、扣減剩餘名額、觸發紙花特效 |
| `REVEALED` | `CONTINUE_SPIN` | 剩餘名額 \$\> 0\$ 且池內人數 \$\> 0\$ | `READY` | 準備下一輪抽取 |
| `REVEALED` | `POOL_DEPLETED` | 池內人數 \$= 0\$ 且剩餘名額 \$\> 0\$ | `PARTIAL_FILLED` | 停用抽取按鈕，提示「候選池已空，已抽出全部可用人員」 |
| `REVEALED` | `ALL_QUOTA_FILLED` | 全部獎項剩餘配額均為 0 | `COMPLETED` | 進入結算畫面，顯示匯出 CSV 按鈕 |
| `ANY` | `EMERGENCY_EDIT` | 使用者點擊「返回編輯」 | `SETUP` | 取消所有動畫 frame，保留原始字串，重置中獎池 |
| `ANY` | `TEARDOWN` | 關閉分頁或點擊完全重置 | `DESTROY` / `SETUP` | 釋放記憶體，重置 AudioContext 與 Canvas Buffer |

---

## 三、 資料結構與契約規格 (Data Contract & Schema)

### 3.1 記憶體資料模型 (In-Memory TypeScript Schema)

```ts
// 獎項階層定義
interface PrizeTier {
  id: string;              // 唯一識別碼 (時間戳或隨機字串)
  name: string;            // 獎項名稱 (例如: "特獎 - iPhone 16")
  totalQuota: number;      // 該獎項總配額 (整數 >= 1)
  remainingQuota: number;  // 剩餘配額 (整數 >= 0)
}

// 全域抽獎參數配置
interface LuckyDrawConfig {
  allowDuplicates: boolean;     // 是否允許重複中獎 (預設: false)
  autoSwitchTier: boolean;      // 抽滿後自動切換下一獎項 (預設: true)
  currentPrizeId: string;       // 目前正在抽取之獎項 ID
  spinDurationMs: number;       // 旋轉動態持續時間 (預設: 4000ms)
}

// 中獎紀錄項目
interface WinnerRecord {
  sequence: number;        // 中獎順位 (1, 2, 3...)
  prizeName: string;       // 獎項名稱
  winnerName: string;      // 中獎者名稱
  timestamp: string;       // ISO 8601 時間字串
}

// 頂層 State 容器
interface AppState {
  rawInputText: string;            // 原始文字輸入暫存
  candidatePool: string[];         // 目前抽獎池陣列
  prizes: PrizeTier[];             // 獎項設定陣列
  config: LuckyDrawConfig;         // 抽獎參數設定
  history: WinnerRecord[];         // 中獎歷程
  status: 'SETUP' | 'READY' | 'SPINNING' | 'REVEALED' | 'PARTIAL_FILLED' | 'COMPLETED';
}
```

---

### 3.2 匯出與封裝安全契約 (Export & Security Contracts)

#### 1\. 加密級安全隨機抽樣 (CSPRNG)

嚴禁使用 `Math.random()` 偽隨機數。抽樣演算法強制採用 `window.crypto.getRandomValues()`，確保公平性不可被預測：

```js
function getSecureRandomIndex(max) {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return array[0] % max;
}
```

#### 2\. 自克隆 HTML 安全封裝 (Base64 Injection)

為防止名單內含 `</script>` 或特殊符號造成 HTML 解析中斷或 XSS 注入，資料容器採用 Base64 序列化：

```html
<script id="__INITIAL_BUNDLE__" type="text/plain">
BASE64_ENCODED_JSON_STRING
</script>
```

頁面重新載入時透過 `atob()` 解碼，若資料不存在或格式毀損則自動平滑降級進入 `SETUP` 介面。

#### 3\. CSV 匯出防亂碼與注入 (RFC 4180 \+ BOM)

- **檔頭前置 Byte**：`\uFEFF` (UTF-8 BOM)，保證 Windows / Mac 繁體中文 Excel 開啟零亂碼。  
- **欄位契約**：`序號,獎項名稱,中獎姓名,抽獎時間`。  
- **防公式注入 (Formula Injection)**：人名首字若為 `=`, `+`, `-`, `@`，前端自動前綴單引號 `'` 防止 Excel 執行惡意公式。

---

## 四、 安全邊界與存取控制 (Security & Access Gates)

1. **嚴格無持久化原則 (Zero Persistence)**：  
   - 程式碼內部強制禁用 `localStorage`、`sessionStorage`、`indexedDB` 與 `document.cookie`。  
   - 所有資料只存在於 RAM。分頁關閉後資料物理性蒸發。  
2. **純本地離線執行 (Zero External Requests)**：  
   - 頁面內嵌 CSP 標頭：

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
```

   - 禁絕任何外部 CDN、外部字型、外部 Analytics 或外部圖片請求。  
3. **DOM 注入防禦**：  
   - 所有動態人名文字只透過 `element.textContent` 或 Canvas `fillText()` 繪製，禁止使用 `innerHTML` 拼接外部名單。

---

## 五、 錯誤處理與降級機制 (Error Handling & Fallback)

| 例外情境 | 觸發條件 | 防護與降級處置 |
| :---- | :---- | :---- |
| **大名單效能瓶頸** | `candidatePool.length > 30` | 停止繪製密集扇形轉盤，自動切換至「跑馬燈滾輪卡片 (Slot Reel)」，DOM 僅維持 3\~5 個視覺節點高頻更換文字。 |
| **音訊自動播放阻擋** | 瀏覽器安全原則阻擋 Web Audio | 於第一次使用者點擊畫面時呼叫 `audioCtx.resume()`；若環境不支援 Web Audio，自動靜默跳過，主抽獎動畫不受阻。 |
| **候選人名額不足** | 候選池人數 \$\<\$ 獎項名額 | 抽至池內最後一人後自動定格，將狀態切換至 `PARTIAL_FILLED`，彈窗提醒「名額不足，已抽出所有候選人」。 |
| **記憶體與動畫洩漏** | 頻繁切換畫面 | 進入新狀態前強制呼叫 `cancelAnimationFrame(currentFrameId)`，並清空 Canvas 寬高以強制釋放 GPU Buffer。 |

---

## 六、 驗收標準清單 (Acceptance Criteria / Checklist)

### 6.1 功能驗收標準 (Functional Checklist)

- [ ] **F01 \- 絕對離線單檔執行**：拔掉實體網路線（或開啟飛航模式），雙擊 HTML 檔案，所有切版、轉盤動畫、拉炮與音效 100% 正常。  
- [ ] **F02 \- 名單解析與防呆**：  
  - [ ] 支援多行文字貼入，自動濾除空白行與頭尾空格。  
  - [ ] 支援直接讀取本機 `.txt` 與 `.csv` 匯入名單。  
- [ ] **F03 \- 獎項管理**：支援動態增刪獎項階層（如：特獎 1 名、頭獎 2 名、普獎 10 名）。  
- [ ] **F04 \- 雙模視覺切換**：  
  - [ ] \$\\le 30\$ 人時渲染完整 Canvas 彩色扇形輪盤。  
  - [ ] \$\> 30\$ 人時平滑切換為跑馬燈滾輪拉霸，文字不擠壓、不破圖。  
- [ ] **F05 \- 加密級抽獎與動效**：  
  - [ ] 使用 `window.crypto` 取隨機數。  
  - [ ] 抽獎過程具備防連點鎖定 (Debounce) 與物理減速。  
  - [ ] 定格開獎時伴隨 Web Audio 合成慶祝和弦與 Canvas 多彩紙花。  
- [ ] **F06 \- 自克隆單檔下載**：點擊「匯出獨立 HTML」可下載帶有目前名單與獎項設定的 HTML，重新開啟後無需重複輸入直接進入抽獎。  
- [ ] **F07 \- 安全 CSV 下載**：匯出 CSV 檔自帶 UTF-8 BOM，繁中 Excel 開啟零亂碼，且首字特殊符號已自動轉義防公式注入。  
- [ ] **F08 \- 關閉即焚**：關閉分頁或重新整理後，F12 Application 面板中無任何 `Storage` 或 `Cookie` 殘留，名單完全銷毀。

### 6.2 非功能性指標 (NFR Criteria)

- **檔案體積**：最終單檔 HTML 原始碼 \$\\le 65 \\text{ KB}\$。  
- **渲染幀率**：在 1080p 投屏解析度下，轉盤旋轉與紙花全螢幕噴發時維持平均 \$\\ge 55 \\text{ FPS}\$。  
- **解析效能**：匯入 \$1,000\$ 筆人名時，解析與驗證耗時 \$\\le 100 \\text{ ms}\$。

---

## 七、 修訂歷程 (Changelog)

- **v1.0.0**：初始 SDD 規格書草案。  
- **v1.1.0**：  
  - \[Fix\] 補齊自克隆 HTML 的 Base64 安全容器，防範 `</script>` 標籤提前截斷 (P0 阻斷級問題)。  
  - \[Fix\] 抽獎核心強制改用 `window.crypto.getRandomValues()` 加密級隨機來源 (P0 阻斷級問題)。  
  - \[Add\] 狀態機補齊 `PARTIAL_FILLED`（名額不足部分抽取）與 `EMERGENCY_EDIT`（中途編輯）（P1 建議級）。  
  - \[Add\] 補齊 Canvas 緩衝區釋放與 `cancelAnimationFrame` 清理機制（P1 建議級）。  
  - \[Add\] CSV 匯出補齊防止 Excel 公式注入（Formula Injection）的前置跳脫防護（P1 建議級）。