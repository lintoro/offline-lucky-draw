/**
 * 純前端單檔離線抽獎 Web 應用 - 核心狀態管理器 (StateManager)
 * 規格版本: v1.1.0
 * 
 * 資安規範:
 * - 100% 純記憶體運行，杜絕持久化儲存 API
 * - 隨機數強制使用 CSPRNG (Web Crypto API: crypto.getRandomValues)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js / CommonJS
    module.exports = factory();
  } else {
    // Browser global
    root.StateManager = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * 使用 CSPRNG 取安全的均勻隨機整數 [0, max - 1]
   * 具備 Rejection Sampling (捨棄採樣) 機制，徹底消除 Modulo Bias (模運算偏差)
   * @param {number} max
   * @returns {number}
   */
  function getSecureRandomIndex(max) {
    if (typeof max !== 'number' || max <= 1) return 0;
    
    var cryptoObj = null;
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
      cryptoObj = globalThis.crypto;
    } else if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      cryptoObj = window.crypto;
    }

    if (!cryptoObj) {
      throw new Error('[Security Exception] CSPRNG is unavailable. Web Crypto API is required.');
    }

    var limit = Math.floor(0x100000000 / max) * max;
    var array = new Uint32Array(1);
    var randVal;
    do {
      cryptoObj.getRandomValues(array);
      randVal = array[0];
    } while (randVal >= limit);

    return randVal % max;
  }

  /**
   * 解析並正規化名單字串：過濾空白行、修剪頭尾空格
   * @param {string} rawText
   * @returns {string[]}
   */
  function parseCandidateText(rawText) {
    if (!rawText || typeof rawText !== 'string') return [];
    return rawText
      .split(/\r?\n/)
      .map(function (line) { return line.trim(); })
      .filter(function (line) { return line.length > 0; });
  }

  /**
   * 產生唯一 ID (純亂數生成，非時間序敏感)
   * @returns {string}
   */
  function generateId() {
    var arr = new Uint8Array(8);
    var cryptoObj = (typeof globalThis !== 'undefined' && globalThis.crypto) || (typeof window !== 'undefined' && window.crypto);
    if (cryptoObj && cryptoObj.getRandomValues) {
      cryptoObj.getRandomValues(arr);
      return Array.from(arr).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }
    throw new Error('[Security Exception] Crypto API required for ID generation.');
  }

  /**
   * StateManager 建構式
   * @param {object} [initialOptions]
   */
  function StateManager(initialOptions) {
    var opts = initialOptions || {};
    
    // 原始輸入暫存
    this.rawInputText = typeof opts.rawInputText === 'string' ? opts.rawInputText : '';
    
    // 候選人池 (目前可參與抽取者)
    this.candidatePool = Array.isArray(opts.candidatePool) ? opts.candidatePool.slice() : parseCandidateText(this.rawInputText);
    
    // 完整初始名單陣列 (用於比對或重新填充)
    this.initialCandidates = Array.isArray(opts.candidatePool) ? opts.candidatePool.slice() : parseCandidateText(this.rawInputText);

    // 獎項清單 (PrizeTier[])
    this.prizes = Array.isArray(opts.prizes) ? opts.prizes.map(function (p) {
      return {
        id: p.id || generateId(),
        name: String(p.name || '預設獎項'),
        totalQuota: Math.max(1, parseInt(p.totalQuota, 10) || 1),
        remainingQuota: typeof p.remainingQuota === 'number' ? Math.max(0, parseInt(p.remainingQuota, 10)) : (parseInt(p.totalQuota, 10) || 1)
      };
    }) : [];

    // 全域抽獎參數 (LuckyDrawConfig)
    this.config = {
      allowDuplicates: Boolean(opts.config && opts.config.allowDuplicates),
      autoSwitchTier: opts.config && typeof opts.config.autoSwitchTier === 'boolean' ? opts.config.autoSwitchTier : true,
      drawOrder: opts.config && opts.config.drawOrder ? opts.config.drawOrder : 'BOTTOM_UP', // 'BOTTOM_UP' (小獎至大獎) | 'TOP_DOWN' (大獎至小獎)
      currentPrizeId: opts.config && opts.config.currentPrizeId ? opts.config.currentPrizeId : '',
      spinDurationMs: opts.config && typeof opts.config.spinDurationMs === 'number' ? opts.config.spinDurationMs : 4000
    };

    // 若未指定 currentPrizeId，依照抽獎順序指定初始獎項
    if (!this.config.currentPrizeId && this.prizes.length > 0) {
      var initialOrdered = this.getOrderedPrizes();
      if (initialOrdered.length > 0) {
        this.config.currentPrizeId = initialOrdered[0].id;
      }
    }

    // 中獎歷程 (WinnerRecord[])
    this.history = Array.isArray(opts.history) ? opts.history.slice() : [];

    // 狀態機: 'SETUP' | 'READY' | 'SPINNING' | 'REVEALED' | 'PARTIAL_FILLED' | 'COMPLETED'
    this.status = opts.status || 'SETUP';

    // 旋轉中暫存資訊 (當前輪次鎖定之中獎目標)
    this._pendingSpin = null;

    // 狀態變更監聽者陣列
    this._listeners = [];

    // 自動初次驗證
    if (this.status === 'SETUP' && (this.candidatePool.length > 0 && this.prizes.length > 0)) {
      this.validate();
    }
  }

  // 註冊監聽器
  StateManager.prototype.subscribe = function (fn) {
    if (typeof fn === 'function') {
      this._listeners.push(fn);
    }
    var self = this;
    return function unsubscribe() {
      self._listeners = self._listeners.filter(function (l) { return l !== fn; });
    };
  };

  StateManager.prototype._notify = function (eventName, data) {
    var state = this.getState();
    for (var i = 0; i < this._listeners.length; i++) {
      try {
        this._listeners[i](eventName, state, data);
      } catch (err) {
        console.error('[StateManager Listener Error]', err);
      }
    }
  };

  // 取得快照 (Deep clone 狀態以防止外部竄改)
  StateManager.prototype.getState = function () {
    return {
      rawInputText: this.rawInputText,
      candidatePool: this.candidatePool.slice(),
      initialCandidates: this.initialCandidates.slice(),
      prizes: this.prizes.map(function (p) { return Object.assign({}, p); }),
      config: Object.assign({}, this.config),
      history: this.history.map(function (h) { return Object.assign({}, h); }),
      status: this.status,
      pendingSpin: this._pendingSpin ? Object.assign({}, this._pendingSpin) : null
    };
  };

  // 設定原始人名文字
  StateManager.prototype.setInputText = function (text) {
    this.rawInputText = String(text || '');
    this.candidatePool = parseCandidateText(this.rawInputText);
    this.initialCandidates = this.candidatePool.slice();
    this.validate();
    this._notify('INPUT_CHANGED');
  };

  // 設定/替換獎項清單
  StateManager.prototype.setPrizes = function (prizes) {
    if (!Array.isArray(prizes)) return;
    this.prizes = prizes.map(function (p) {
      var total = Math.max(1, parseInt(p.totalQuota, 10) || 1);
      return {
        id: p.id || generateId(),
        name: String(p.name || '未命名獎項'),
        totalQuota: total,
        remainingQuota: typeof p.remainingQuota === 'number' ? Math.max(0, parseInt(p.remainingQuota, 10)) : total
      };
    });

    var ordered = this.getOrderedPrizes();
    var firstAvailable = ordered.find(function (p) { return p.remainingQuota > 0; });
    this.config.currentPrizeId = firstAvailable ? firstAvailable.id : (this.prizes[0] ? this.prizes[0].id : '');

    this.validate();
    this._notify('PRIZES_CHANGED');
  };

  // 新增單個獎項
  StateManager.prototype.addPrize = function (name, totalQuota) {
    var total = Math.max(1, parseInt(totalQuota, 10) || 1);
    var prize = {
      id: generateId(),
      name: String(name || '新獎項'),
      totalQuota: total,
      remainingQuota: total
    };
    this.prizes.push(prize);
    var ordered = this.getOrderedPrizes();
    var firstAvailable = ordered.find(function (p) { return p.remainingQuota > 0; });
    if (firstAvailable) {
      this.config.currentPrizeId = firstAvailable.id;
    }
    this.validate();
    this._notify('PRIZE_ADDED', prize);
    return prize;
  };

  // 移除單個獎項
  StateManager.prototype.removePrize = function (prizeId) {
    this.prizes = this.prizes.filter(function (p) { return p.id !== prizeId; });
    if (this.config.currentPrizeId === prizeId) {
      var nextPrize = this.prizes.find(function (p) { return p.remainingQuota > 0; }) || this.prizes[0];
      this.config.currentPrizeId = nextPrize ? nextPrize.id : '';
    }
    this.validate();
    this._notify('PRIZE_REMOVED', prizeId);
  };

  // 更新配置參數
  StateManager.prototype.updateConfig = function (partial) {
    if (!partial || typeof partial !== 'object') return;
    if (typeof partial.allowDuplicates === 'boolean') {
      this.config.allowDuplicates = partial.allowDuplicates;
    }
    if (typeof partial.autoSwitchTier === 'boolean') {
      this.config.autoSwitchTier = partial.autoSwitchTier;
    }
    if (typeof partial.currentPrizeId === 'string') {
      var exists = this.prizes.some(function (p) { return p.id === partial.currentPrizeId; });
      if (exists) this.config.currentPrizeId = partial.currentPrizeId;
    }
    if (partial.drawOrder === 'BOTTOM_UP' || partial.drawOrder === 'TOP_DOWN') {
      this.config.drawOrder = partial.drawOrder;
      var curPrize = this.getCurrentPrize();
      if (curPrize) this.config.currentPrizeId = curPrize.id;
    }
    if (typeof partial.spinDurationMs === 'number' && partial.spinDurationMs > 0) {
      this.config.spinDurationMs = partial.spinDurationMs;
    }
    this.validate();
    this._notify('CONFIG_UPDATED');
  };

  // 驗證狀態機轉移條件 (SETUP <-> READY)
  StateManager.prototype.validate = function () {
    if (this.status === 'SPINNING') return false;

    var hasCandidates = this.candidatePool.length >= 1;
    var totalRemaining = this.prizes.reduce(function (sum, p) { return sum + p.remainingQuota; }, 0);
    var hasQuota = totalRemaining > 0;

    if (hasCandidates && hasQuota && this.prizes.length >= 1) {
      if (this.status === 'SETUP' || this.status === 'PARTIAL_FILLED') {
        this.status = 'READY';
      }
      return true;
    } else {
      if (this.status === 'READY') {
        this.status = 'SETUP';
      }
      return false;
    }
  };

  // 依據抽獎順序設定取得排序後的獎項
  StateManager.prototype.getOrderedPrizes = function () {
    var list = this.prizes.slice();
    if (this.config.drawOrder === 'BOTTOM_UP') {
      return list.reverse();
    }
    return list;
  };

  // 調整獎項上下順序
  StateManager.prototype.movePrize = function (fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.prizes.length || toIndex < 0 || toIndex >= this.prizes.length) return;
    var item = this.prizes.splice(fromIndex, 1)[0];
    this.prizes.splice(toIndex, 0, item);
    var cur = this.getCurrentPrize();
    if (cur) this.config.currentPrizeId = cur.id;
    this.validate();
    this._notify('PRIZES_REORDERED');
  };

  // 手動結束抽獎 (例如候選池不足 PARTIAL_FILLED 時進入 COMPLETED 結算)
  StateManager.prototype.finishDraw = function () {
    this._pendingSpin = null;
    this.status = 'COMPLETED';
    this._notify('ALL_QUOTA_FILLED');
    return this.status;
  };

  // 取得目前正在抽取的獎項 (遵循抽獎順序)
  StateManager.prototype.getCurrentPrize = function () {
    var id = this.config.currentPrizeId;
    var prize = this.prizes.find(function (p) { return p.id === id; });
    if ((!prize || prize.remainingQuota <= 0) && this.prizes.length > 0) {
      var ordered = this.getOrderedPrizes();
      prize = ordered.find(function (p) { return p.remainingQuota > 0; }) || ordered[0];
      if (prize) this.config.currentPrizeId = prize.id;
    }
    return prize || null;
  };

  /**
   * 觸發抽獎 (START_SPIN: READY -> SPINNING)
   * 藉由 CSPRNG 先行決定中獎者，以便動畫引擎計算減速終點角度
   * @returns {object} { winnerName, winnerIndex, prize }
   */
  StateManager.prototype.startSpin = function () {
    if (this.status !== 'READY') {
      throw new Error('[Invalid State] Can only start spin from READY state, current is: ' + this.status);
    }

    var prize = this.getCurrentPrize();
    if (!prize || prize.remainingQuota <= 0) {
      throw new Error('[Invalid Operation] Current prize has no remaining quota.');
    }

    if (this.candidatePool.length === 0) {
      this.status = 'PARTIAL_FILLED';
      this._notify('POOL_DEPLETED');
      throw new Error('[Pool Depleted] Candidate pool is empty.');
    }

    var winnerIndex = getSecureRandomIndex(this.candidatePool.length);
    var winnerName = this.candidatePool[winnerIndex];

    this.status = 'SPINNING';
    this._pendingSpin = {
      winnerIndex: winnerIndex,
      winnerName: winnerName,
      prizeId: prize.id,
      prizeName: prize.name
    };

    this._notify('SPIN_STARTED', this._pendingSpin);
    return this._pendingSpin;
  };

  /**
   * 動畫結束定格 (ANIMATION_END: SPINNING -> REVEALED)
   * 寫入中獎陣列、扣減配額、依條件移出池子
   * @returns {object} WinnerRecord
   */
  StateManager.prototype.revealWinner = function () {
    if (this.status !== 'SPINNING' || !this._pendingSpin) {
      throw new Error('[Invalid State] Can only reveal winner from SPINNING state.');
    }

    var pending = this._pendingSpin;
    var prize = this.prizes.find(function (p) { return p.id === pending.prizeId; });

    if (prize && prize.remainingQuota > 0) {
      prize.remainingQuota -= 1;
    }

    // 若不允許重複中獎，則將中獎者移出候選池
    if (!this.config.allowDuplicates) {
      this.candidatePool.splice(pending.winnerIndex, 1);
    }

    // 建立中獎紀錄
    var record = {
      sequence: this.history.length + 1,
      prizeName: pending.prizeName,
      winnerName: pending.winnerName,
      timestamp: new Date().toISOString()
    };
    this.history.push(record);

    this.status = 'REVEALED';
    this._pendingSpin = null;

    this._notify('WINNER_REVEALED', record);
    return record;
  };

  /**
   * 繼續下一輪抽取 (CONTINUE_SPIN: REVEALED -> READY / PARTIAL_FILLED / COMPLETED)
   */
  StateManager.prototype.continueSpin = function () {
    if (this.status !== 'REVEALED') {
      throw new Error('[Invalid State] Can only continue spin from REVEALED state.');
    }

    var curPrize = this.getCurrentPrize();

    // 若當前獎項抽滿且開啟自動切換
    if (curPrize && curPrize.remainingQuota <= 0 && this.config.autoSwitchTier) {
      var ordered = this.getOrderedPrizes();
      var nextPrize = ordered.find(function (p) { return p.remainingQuota > 0; });
      if (nextPrize) {
        this.config.currentPrizeId = nextPrize.id;
        curPrize = nextPrize;
      }
    }

    var totalRemainingQuota = this.prizes.reduce(function (sum, p) { return sum + p.remainingQuota; }, 0);

    // 1. 全部獎項與配額抽完 -> COMPLETED
    if (totalRemainingQuota <= 0) {
      this.status = 'COMPLETED';
      this._notify('ALL_QUOTA_FILLED');
      return this.status;
    }

    // 2. 候選池用罄但仍有配額 -> PARTIAL_FILLED
    if (this.candidatePool.length === 0) {
      this.status = 'PARTIAL_FILLED';
      this._notify('POOL_DEPLETED');
      return this.status;
    }

    // 3. 正常進入下一抽
    this.status = 'READY';
    this._notify('READY_FOR_NEXT');
    return this.status;
  };

  /**
   * 緊急中途返回編輯 (EMERGENCY_EDIT: ANY -> SETUP)
   * 保留名單原始文字與獎項設定，但重置進行中的動畫與暫存
   */
  StateManager.prototype.emergencyEdit = function () {
    this._pendingSpin = null;
    this.status = 'SETUP';
    this._notify('EMERGENCY_EDIT');
  };

  /**
   * 完全重置銷毀歷程 (RESET: ANY -> SETUP)
   */
  StateManager.prototype.reset = function () {
    this._pendingSpin = null;
    this.history = [];
    this.candidatePool = this.initialCandidates.slice();
    this.prizes.forEach(function (p) {
      p.remainingQuota = p.totalQuota;
    });
    this.status = 'SETUP';
    this.validate();
    this._notify('RESET_COMPLETED');
  };

  /**
   * 匯出序列化狀態 (供自克隆 HTML Base64 封裝)
   * @returns {string} Base64 字串
   */
  StateManager.prototype.exportBundleBase64 = function () {
    var bundle = {
      rawInputText: this.rawInputText,
      candidatePool: this.candidatePool,
      prizes: this.prizes,
      config: this.config,
      history: this.history,
      exportedAt: new Date().toISOString()
    };
    var jsonStr = JSON.stringify(bundle);
    if (typeof btoa === 'function') {
      return btoa(unescape(encodeURIComponent(jsonStr)));
    } else if (typeof Buffer !== 'undefined') {
      return Buffer.from(jsonStr, 'utf-8').toString('base64');
    }
    throw new Error('Base64 encoding not supported in current environment.');
  };

  /**
   * 從 Base64 載入初始設定 (若存在 Initial Bundle 則自動 Hydrate)
   * @param {string} base64Str
   * @returns {boolean}
   */
  StateManager.prototype.importBundleBase64 = function (base64Str) {
    if (!base64Str || typeof base64Str !== 'string') return false;
    try {
      var jsonStr = '';
      if (typeof atob === 'function') {
        jsonStr = decodeURIComponent(escape(atob(base64Str.trim())));
      } else if (typeof Buffer !== 'undefined') {
        jsonStr = Buffer.from(base64Str.trim(), 'base64').toString('utf-8');
      }
      var bundle = JSON.parse(jsonStr);
      if (bundle && typeof bundle === 'object') {
        if (typeof bundle.rawInputText === 'string') this.rawInputText = bundle.rawInputText;
        if (Array.isArray(bundle.candidatePool)) {
          this.candidatePool = bundle.candidatePool.slice();
          this.initialCandidates = this.candidatePool.slice();
        }
        if (Array.isArray(bundle.prizes)) this.setPrizes(bundle.prizes);
        if (bundle.config && typeof bundle.config === 'object') this.updateConfig(bundle.config);
        if (Array.isArray(bundle.history)) this.history = bundle.history.slice();
        this.status = 'SETUP';
        this.validate();
        this._notify('BUNDLE_IMPORTED');
        return true;
      }
    } catch (e) {
      console.warn('[StateManager] Failed to import bundle Base64:', e);
    }
    return false;
  };

  return StateManager;
});
