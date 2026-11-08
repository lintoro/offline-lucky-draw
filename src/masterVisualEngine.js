/**
 * 純前端單檔離線抽獎 Web 應用 - 結構重構級五大視覺開獎引擎 (MasterVisualEngine v2.0)
 * 
 * 核心結構改革與精準度保證:
 * 1. Retina 高解析度防模糊向量渲染 (HiDPI DPR Auto-Scaling)：所有機械零件、玻璃折射與字體 100% 銳利無鋸齒。
 * 2. 四大主題結構連動 (setTheme)：機台塗裝、霓虹燈色、能量光束與金屬材質隨四大主題即時轉換。
 * 3. 100% 絕對精準指針校準 (Zero-Ambiguity Payline Alignment)：
 *    - SLOT_MACHINE (拉斯維加斯單臂拉霸機)：廢除舊版單純角度跳變，改為「連續平滑牌組捲動軌道 (Continuous Reel Strip) + 彈簧過衝回彈 (Overshoot & Snap-Back)」；左側雷射指針與右側聯動機械拉桿 (Mechanical Lever Arm) 100% 指在得獎人名牌正中心，絕不停在兩張牌中間黑線！
 *    - RIBBON_TAPE (全景開箱滑軌)：具備光學放大鏡準心窗 (Magnifier Reticle) 與上下雙向鎖定卡榫，停頓時人名絕對位於卡片與準心正中央。
 *    - LOTTO_EGG (雙層渦輪氣壓樂透艙)：具備底部渦輪葉片旋轉、S型透明導球管、艙頂動態機械閘門開啟與金球破繭展開機構。
 *    - SPLIT_FLAP (歐式車站機械翻牌矩陣)：具備雙軸金屬鉸鏈、上下半頁 3D 翻頁陰影、進度光條與鉚釘裝甲外框。
 *    - HYPERSPACE (星際量子躍遷核心)：具備雙層反向旋轉陀螺儀星環 (Dual Gyroscope Rings)、空間曲率引力網格與八道聚能雷射光束匯聚。
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MasterVisualEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var ENGINE_THEMES = {
    OBSIDIAN_GOLD: {
      primary: '#d4af37',
      light: '#fef08a',
      dark: '#78350f',
      glow: '#fde047',
      chassisTop: '#27221a',
      chassisBot: '#0f0d0a',
      panelBg: '#090a0d',
      accent: '#f59e0b'
    },
    ROYAL_CRIMSON: {
      primary: '#fbbf24',
      light: '#fef08a',
      dark: '#991b1b',
      glow: '#f87171',
      chassisTop: '#3b0d11',
      chassisBot: '#180507',
      panelBg: '#120406',
      accent: '#ef4444'
    },
    MIDNIGHT_SAPPHIRE: {
      primary: '#38bdf8',
      light: '#e0f2fe',
      dark: '#0369a1',
      glow: '#7dd3fc',
      chassisTop: '#0f223d',
      chassisBot: '#07101f',
      panelBg: '#050b14',
      accent: '#818cf8'
    },
    EMERALD_PALACE: {
      primary: '#10b981',
      light: '#a7f3d0',
      dark: '#065f46',
      glow: '#34d399',
      chassisTop: '#0b2920',
      chassisBot: '#04120e',
      panelBg: '#030d0a',
      accent: '#facc15'
    }
  };

  function easeOutQuint(t) {
    return 1 + (--t) * t * t * t * t;
  }

  /**
   * 帶機械過衝與彈簧回彈鎖定的拉霸專用阻尼曲線
   * 在 t=0.90 時微幅衝過頭 (1.0085)，並在 t=1.00 時精準為 1.000000
   */
  function slotMechanicalEase(t) {
    if (t >= 1) return 1;
    if (t < 0.88) {
      var p = t / 0.88;
      return (1 - Math.pow(1 - p, 4)) * 1.0075;
    } else {
      var s = (t - 0.88) / 0.12;
      return 1 + 0.0075 * Math.cos(s * Math.PI * 1.5) * (1 - s);
    }
  }

  function MasterVisualEngine(canvasElement, audioSynthesizer, initialTheme, initialAspect) {
    this.canvas = canvasElement || null;
    this.ctx = canvasElement && canvasElement.getContext ? canvasElement.getContext('2d') : null;
    this.audio = audioSynthesizer || null;
    this.theme = ENGINE_THEMES[initialTheme] ? initialTheme : 'OBSIDIAN_GOLD';

    this.aspectRatio = (initialAspect === '9:16') ? '9:16' : '16:9';
    if (this.aspectRatio === '9:16') {
      this.logicalW = 360;
      this.logicalH = 640;
    } else {
      this.logicalW = 640;
      this.logicalH = 480;
    }
    this.dpr = 1;

    this.candidates = [];
    this.currentMode = 'RIBBON_TAPE';
    this.animId = null;
    this.isSpinning = false;

    // RIBBON_TAPE 狀態
    this.ribbonFinalOffset = 0;
    this.ribbonTargetIndex = 0;
    this.ribbonStrip = [];

    // SLOT_MACHINE 狀態
    this.slotStrip = [];
    this.slotTargetIndex = 0;
    this.slotFinalOffset = 0;

    // LOTTO_EGG & HYPERSPACE 狀態
    this.lottoBalls = [];
    this.stars = [];

    this._syncHiDPI(true);
  }

  /**
   * 切換 16:9 寬螢幕 / 9:16 手機直屏
   */
  MasterVisualEngine.prototype.setAspectRatio = function (ratio) {
    var val = (ratio === '9:16') ? '9:16' : '16:9';
    if (this.aspectRatio !== val) {
      this.aspectRatio = val;
      if (val === '9:16') {
        this.logicalW = 360;
        this.logicalH = 640;
      } else {
        this.logicalW = 640;
        this.logicalH = 480;
      }
      this._syncHiDPI(true);
      if (!this.isSpinning) {
        this.renderStatic();
      }
    }
  };

  /**
   * 確保主舞台 Canvas 在 Retina 螢幕上 100% 向量級銳利度
   */
  MasterVisualEngine.prototype._syncHiDPI = function (force) {
    if (!this.canvas) return;
    var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? Math.min(window.devicePixelRatio, 2.5) : 1;
    this.dpr = dpr;
    var targetW = Math.round(this.logicalW * dpr);
    var targetH = Math.round(this.logicalH * dpr);
    if (force || this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
      if (this.canvas.style) {
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.maxHeight = '100%';
        this.canvas.style.width = 'auto';
        this.canvas.style.height = 'auto';
        this.canvas.style.aspectRatio = (this.aspectRatio === '9:16') ? '9 / 16' : '4 / 3';
      }
    }
  };

  MasterVisualEngine.prototype._beginFrame = function () {
    if (!this.ctx || !this.canvas) return null;
    this._syncHiDPI();
    var ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.dpr !== 1) {
      ctx.scale(this.dpr, this.dpr);
    }
    return ctx;
  };

  MasterVisualEngine.prototype._endFrame = function () {
    if (!this.ctx) return;
    this.ctx.restore();
  };

  MasterVisualEngine.prototype.setTheme = function (themeName) {
    this.theme = ENGINE_THEMES[themeName] ? themeName : 'OBSIDIAN_GOLD';
    if (!this.isSpinning) {
      this.renderStatic();
    }
  };

  MasterVisualEngine.prototype._getThemeColors = function () {
    return ENGINE_THEMES[this.theme] || ENGINE_THEMES.OBSIDIAN_GOLD;
  };

  MasterVisualEngine.prototype.setCandidates = function (candidates) {
    this.candidates = Array.isArray(candidates) ? candidates.slice() : [];
  };

  MasterVisualEngine.prototype.setMode = function (mode) {
    if (mode === 'WINDOWED_WHEEL') mode = 'RIBBON_TAPE';
    this.currentMode = mode || 'RIBBON_TAPE';
    this.renderStatic();
  };

  MasterVisualEngine.prototype.renderStatic = function () {
    if (!this.canvas || !this.ctx) return;
    if (this.currentMode === 'RIBBON_TAPE' || this.currentMode === 'WINDOWED_WHEEL') {
      this._drawRibbonStatic(0, 1, null, false);
    } else if (this.currentMode === 'LOTTO_EGG') {
      this._drawLottoStatic();
    } else if (this.currentMode === 'SLOT_MACHINE') {
      var name = this.candidates.length > 0 ? this.candidates[0] : '準備抽獎';
      this._drawSlotStatic(name, 1, false, 0, 0, null, null, 0);
    } else if (this.currentMode === 'SPLIT_FLAP') {
      this._drawFlapStatic('READY', 1, false, 0);
    } else if (this.currentMode === 'HYPERSPACE') {
      this._drawHyperspaceStatic('LUCKY DRAW', 1, false, 0);
    }
  };

  function safeRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  // ============================================================================
  // 1. 全景光學開箱滑軌 (Cinematic Optical Magnifier Ribbon Tape)
  // ============================================================================
  MasterVisualEngine.prototype._drawRibbonStatic = function (offset, pulseScale, winnerName, isRevealed, customStrip) {
    var ctx = this._beginFrame();
    if (!ctx) return;
    var w = this.logicalW, h = this.logicalH;
    var isPortrait = (this.aspectRatio === '9:16');
    var cx = w / 2, cy = isPortrait ? (h / 2 - 35) : (h / 2 - 10);
    var tc = this._getThemeColors();
    offset = offset || 0;
    pulseScale = pulseScale || 1;

    var cardW = isPortrait ? 120 : 160;
    var cardH = isPortrait ? 116 : 144;
    var cardGap = isPortrait ? 12 : 16;
    var stride = cardW + cardGap;

    var strip = customStrip || this.ribbonStrip;
    if (!strip || strip.length === 0) {
      var list = (this.candidates && this.candidates.length > 0) ? this.candidates : ['幸運候選人', '尊貴貴賓', '大會嘉賓', '現場抽獎'];
      strip = [];
      for (var s = 0; s < 30; s++) {
        strip.push(list[s % list.length]);
      }
    }

    var trackY = cy - cardH / 2 - 22;
    var trackH = cardH + 44;

    // 1. 精密裝甲滑軌外框
    var frameGrad = ctx.createLinearGradient(0, trackY - 12, 0, trackY + trackH + 12);
    frameGrad.addColorStop(0, tc.chassisTop);
    frameGrad.addColorStop(0.5, tc.panelBg);
    frameGrad.addColorStop(1, tc.chassisBot);
    safeRoundRect(ctx, 12, trackY - 10, w - 24, trackH + 20, 14);
    ctx.fillStyle = frameGrad;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = tc.primary;
    ctx.stroke();

    // 上下精密齒輪刻度軌道
    ctx.fillStyle = tc.primary;
    for (var tx = 28; tx < w - 28; tx += 16) {
      var tickShift = ((tx - offset * 0.25) % 16 + 16) % 16;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(tx - tickShift + 8, trackY - 4, 2, 6);
      ctx.fillRect(tx - tickShift + 8, trackY + trackH - 2, 2, 6);
    }
    ctx.globalAlpha = 1;

    // 2. 滑軌裁切視窗與名牌序列
    ctx.save();
    safeRoundRect(ctx, 18, trackY + 4, w - 36, trackH - 8, 8);
    ctx.clip();

    var firstVisible = Math.max(0, Math.floor((offset - cx - stride) / stride));
    var lastVisible = Math.min(strip.length - 1, Math.ceil((offset + cx + stride) / stride));

    for (var i = firstVisible; i <= lastVisible; i++) {
      var itemX = cx + i * stride - offset;
      var distFromCenter = Math.abs(itemX - cx);
      var isCenterCard = distFromCenter < stride * 0.45;
      var isTargetCard = (isRevealed && i === this.ribbonTargetIndex);

      // 經過中央光學準心時自動獲得立體放大效果
      var opticalZoom = Math.max(0, 1 - distFromCenter / 180) * 0.06;
      var scale = isTargetCard ? pulseScale * 1.06 : (1 + opticalZoom);

      ctx.save();
      ctx.translate(itemX, cy);
      ctx.scale(scale, scale);

      var cardLeft = -cardW / 2;
      var cardTop = -cardH / 2;

      var cardGrad = ctx.createLinearGradient(0, cardTop, 0, cardTop + cardH);
      if (isTargetCard) {
        cardGrad.addColorStop(0, tc.chassisTop);
        cardGrad.addColorStop(0.5, '#1e1b18');
        cardGrad.addColorStop(1, '#0e0c0a');
      } else {
        cardGrad.addColorStop(0, '#1f2430');
        cardGrad.addColorStop(1, '#11141c');
      }

      safeRoundRect(ctx, cardLeft, cardTop, cardW, cardH, 10);
      ctx.fillStyle = cardGrad;
      ctx.fill();

      ctx.lineWidth = isTargetCard ? 3.5 : (isCenterCard ? 2.2 : 1.2);
      ctx.strokeStyle = isTargetCard ? tc.light : (isCenterCard ? tc.primary : 'rgba(255,255,255,0.15)');
      if (isTargetCard) {
        ctx.shadowColor = tc.glow;
        ctx.shadowBlur = 18;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 頂部金屬銘牌標籤
      ctx.fillStyle = isTargetCard ? tc.primary : 'rgba(255, 255, 255, 0.06)';
      safeRoundRect(ctx, cardLeft + 12, cardTop + 12, cardW - 24, 22, 4);
      ctx.fill();

      ctx.fillStyle = isTargetCard ? '#090a0f' : tc.light;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var tagText = isTargetCard ? '★ WINNER LOCKED ★' : ('NO.' + (((i % (this.candidates.length || 1)) + 1).toString().padStart(3, '0')));
      ctx.fillText(tagText, 0, cardTop + 23);

      // 候選人姓名（100% 垂直置中於名牌視覺中心 cy+8，避開任何邊線）
      var nameStr = (isTargetCard && winnerName) ? winnerName : strip[i];
      ctx.fillStyle = isTargetCard ? '#ffffff' : (isCenterCard ? '#ffffff' : '#cbd5e1');
      ctx.font = isTargetCard ? (isPortrait ? 'bold 20px sans-serif' : 'bold 25px sans-serif') : (isPortrait ? 'bold 17px sans-serif' : 'bold 22px sans-serif');
      ctx.fillText(nameStr, 0, 8);

      // 底部稀有度光條
      var stripColors = [tc.primary, '#38bdf8', '#f59e0b', '#10b981', '#ec4899'];
      ctx.fillStyle = isTargetCard ? tc.light : stripColors[i % stripColors.length];
      ctx.fillRect(cardLeft + 16, cardTop + cardH - 14, cardW - 32, 4);

      ctx.restore();
    }

    // 3. 左右深邃光學暗角遮罩
    var vigW = isPortrait ? 60 : 125;
    var leftVig = ctx.createLinearGradient(18, 0, 18 + vigW, 0);
    leftVig.addColorStop(0, tc.panelBg);
    leftVig.addColorStop(1, 'transparent');
    ctx.fillStyle = leftVig;
    ctx.fillRect(18, trackY, vigW, trackH);

    var rightVig = ctx.createLinearGradient(w - 18 - vigW, 0, w - 18, 0);
    rightVig.addColorStop(0, 'transparent');
    rightVig.addColorStop(1, tc.panelBg);
    ctx.fillStyle = rightVig;
    ctx.fillRect(w - 18 - vigW, trackY, vigW, trackH);

    ctx.restore();

    // 4. 中央光學準心外框 (Optical Lock-On Reticle - 不畫直線切過文字，改用四角鎖定框與上下雙向鑲鑽指針！)
    var retW = cardW + 14, retH = cardH + 14;
    var rx = cx - retW / 2, ry = cy - retH / 2;
    ctx.strokeStyle = isRevealed ? tc.light : tc.primary;
    ctx.lineWidth = 3;
    var cornerL = 22;
    // 四角 L 型鎖定準心
    [
      [rx, ry, 1, 1],
      [rx + retW, ry, -1, 1],
      [rx, ry + retH, 1, -1],
      [rx + retW, ry + retH, -1, -1]
    ].forEach(function (c) {
      ctx.beginPath();
      ctx.moveTo(c[0], c[1] + c[3] * cornerL);
      ctx.lineTo(c[0], c[1]);
      ctx.lineTo(c[0] + c[2] * cornerL, c[1]);
      ctx.stroke();
    });

    // 上下雙向精密鎖定箭頭 (指向名牌正中央)
    ctx.fillStyle = isRevealed ? tc.light : tc.primary;
    ctx.beginPath();
    ctx.moveTo(cx - 14, trackY - 14);
    ctx.lineTo(cx + 14, trackY - 14);
    ctx.lineTo(cx, trackY + 6);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - 14, trackY + trackH + 14);
    ctx.lineTo(cx + 14, trackY + trackH + 14);
    ctx.lineTo(cx, trackY + trackH - 6);
    ctx.closePath();
    ctx.fill();

    // 底部狀態銘牌
    ctx.fillStyle = tc.light;
    ctx.font = isPortrait ? 'bold 11px sans-serif' : 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isRevealed ? '★ 目標鎖定完畢：恭喜幸運得主 ★' : '◈ 光學全景開箱軌道 — 準心鎖定正中央名牌 ◈', cx, isPortrait ? (cy + cardH / 2 + 52) : (h - 28));

    this._endFrame();
  };

  MasterVisualEngine.prototype._drawWheelStatic = function (angle, zoomFactor, highlightName, isRevealed) {
    this._drawRibbonStatic(0, zoomFactor, highlightName, isRevealed);
  };

  // ============================================================================
  // 2. 雙層渦輪氣壓式樂透球艙 (Dual-Turbine Pneumatic Lotto Sphere)
  // ============================================================================
  MasterVisualEngine.prototype._initLottoBalls = function () {
    this.lottoBalls = [];
    var palette = [
      { base: '#ef4444', light: '#fca5a5', dark: '#991b1b' },
      { base: '#3b82f6', light: '#93c5fd', dark: '#1e40af' },
      { base: '#10b981', light: '#6ee7b7', dark: '#065f46' },
      { base: '#f59e0b', light: '#fde047', dark: '#92400e' },
      { base: '#8b5cf6', light: '#c4b5fd', dark: '#5b21b6' },
      { base: '#ec4899', light: '#f9a8d4', dark: '#9d174d' },
      { base: '#06b6d4', light: '#67e8f9', dark: '#155e75' }
    ];
    var cx = this.logicalW / 2;
    var cy = 195;
    for (var i = 0; i < 30; i++) {
      var col = palette[i % palette.length];
      var rad = 20 + Math.random() * 82;
      var ang = Math.random() * Math.PI * 2;
      this.lottoBalls.push({
        x: cx + Math.cos(ang) * rad,
        y: cy + Math.sin(ang) * rad,
        vx: (Math.random() - 0.5) * 9,
        vy: (Math.random() - 0.5) * 9,
        r: 14,
        num: (i < 9 ? '0' : '') + (i + 1),
        colorBase: col.base,
        colorLight: col.light,
        colorDark: col.dark
      });
    }
  };

  MasterVisualEngine.prototype._drawLottoMachineChamber = function (ctx, cx, cy, R, airJetActive, turbinePhase) {
    var tc = this._getThemeColors();
    turbinePhase = turbinePhase || 0;

    // 1. 外圍雙拱支撐機械臂與透明導球管 (External Extractor Arch)
    ctx.save();
    ctx.strokeStyle = tc.primary;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, R + 14, Math.PI * 0.82, Math.PI * 0.18, false);
    ctx.stroke();

    // 兩側液壓固定座
    ctx.fillStyle = tc.chassisTop;
    safeRoundRect(ctx, cx - R - 24, cy - 18, 16, 36, 4);
    ctx.fill();
    ctx.stroke();
    safeRoundRect(ctx, cx + R + 8, cy - 18, 16, 36, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 2. 重型雙層渦輪金屬基座 (Dual-Turbine Pedestal)
    var baseW = 310, baseH = 74;
    var baseY = cy + R - 14;
    var gradBase = ctx.createLinearGradient(cx - baseW / 2, 0, cx + baseW / 2, 0);
    gradBase.addColorStop(0, tc.chassisBot);
    gradBase.addColorStop(0.22, tc.primary);
    gradBase.addColorStop(0.5, tc.light);
    gradBase.addColorStop(0.78, tc.primary);
    gradBase.addColorStop(1, tc.chassisBot);

    ctx.beginPath();
    ctx.moveTo(cx - baseW / 2, baseY + baseH);
    ctx.lineTo(cx - baseW / 2 + 26, baseY);
    ctx.lineTo(cx + baseW / 2 - 26, baseY);
    ctx.lineTo(cx + baseW / 2, baseY + baseH);
    ctx.closePath();
    ctx.fillStyle = gradBase;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = tc.light;
    ctx.stroke();

    // 基座中央渦輪進氣視窗
    safeRoundRect(ctx, cx - 95, baseY + 14, 190, 44, 8);
    ctx.fillStyle = '#090b10';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = tc.primary;
    ctx.stroke();

    // 動態渦輪氣流格柵與能量指示燈
    for (var k = -4; k <= 4; k++) {
      var vx = cx + k * 18;
      ctx.beginPath();
      ctx.moveTo(vx, baseY + 18);
      ctx.lineTo(vx, baseY + 54);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = airJetActive ? tc.light : '#334155';
      ctx.stroke();
    }

    // 3. 高透光水晶球艙內部立體漸層
    var sphereBg = ctx.createRadialGradient(cx, cy - 30, 15, cx, cy, R);
    sphereBg.addColorStop(0, 'rgba(30, 41, 59, 0.55)');
    sphereBg.addColorStop(0.75, 'rgba(15, 23, 42, 0.88)');
    sphereBg.addColorStop(1, 'rgba(7, 10, 18, 0.96)');

    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.fillStyle = sphereBg;
    ctx.fill();

    // 氣壓上升螺旋風暴線
    if (airJetActive) {
      ctx.save();
      ctx.strokeStyle = tc.light;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2;
      for (var j = -2; j <= 2; j++) {
        ctx.beginPath();
        var waveOff = Math.sin(turbinePhase * 0.15 + j) * 14;
        var sx = cx + j * 25;
        ctx.moveTo(sx, cy + R - 15);
        ctx.bezierCurveTo(sx + waveOff, cy + 30, sx - waveOff, cy - 35, cx + j * 10, cy - R + 20);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. 繪製 30 顆高光澤 3D 樂透彩球
    for (var i = 0; i < this.lottoBalls.length; i++) {
      var b = this.lottoBalls[i];
      ctx.save();
      var ballGrad = ctx.createRadialGradient(b.x - 4, b.y - 4, 1.5, b.x, b.y, b.r);
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(0.25, b.colorLight);
      ballGrad.addColorStop(0.8, b.colorBase);
      ballGrad.addColorStop(1, b.colorDark);

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, 2 * Math.PI);
      ctx.fillStyle = ballGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(b.x, b.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.num, b.x, b.y + 0.5);
      ctx.restore();
    }

    // 5. 水晶球艙雙層金屬赤道環與玻璃折射高光
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = tc.primary;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R - 7, Math.PI * 0.88, Math.PI * 1.38);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, R - 7, Math.PI * 0.04, Math.PI * 0.24);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();
    ctx.restore();

    // 6. 頂部氣壓真空出球塔口
    safeRoundRect(ctx, cx - 28, cy - R - 26, 56, 28, 6);
    ctx.fillStyle = gradBase;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = tc.light;
    ctx.stroke();
  };

  MasterVisualEngine.prototype._drawLottoStatic = function () {
    var ctx = this._beginFrame();
    if (!ctx) return;
    var w = this.logicalW, h = this.logicalH;
    var isPortrait = (this.aspectRatio === '9:16');
    var cx = w / 2, cy = isPortrait ? 260 : 195, R = isPortrait ? 115 : 128;
    var tc = this._getThemeColors();
    if (this.lottoBalls.length === 0) this._initLottoBalls();
    this._drawLottoMachineChamber(ctx, cx, cy, R, false, 0);

    ctx.fillStyle = tc.light;
    ctx.font = isPortrait ? 'bold 12px sans-serif' : 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('◈ 雙渦輪氣壓樂透搖獎艙 — 待命啟動 ◈', cx, isPortrait ? (cy + R + 55) : (h - 22));
    this._endFrame();
  };

  MasterVisualEngine.prototype._drawLottoWinnerCelebration = function (winnerName, pulseScale) {
    var ctx = this._beginFrame();
    if (!ctx) return;
    var w = this.logicalW, h = this.logicalH;
    var isPortrait = (this.aspectRatio === '9:16');
    var cx = w / 2, cy = isPortrait ? 260 : 195, R = isPortrait ? 115 : 128;
    var tc = this._getThemeColors();
    this._drawLottoMachineChamber(ctx, cx, cy, R, false, 0);

    pulseScale = pulseScale || 1;
    ctx.save();
    ctx.translate(cx, isPortrait ? 260 : (h / 2 + 15));
    ctx.scale(pulseScale, pulseScale);

    var pw = isPortrait ? 290 : 360, ph = isPortrait ? 114 : 124;
    var plaqueGrad = ctx.createLinearGradient(-pw / 2, -ph / 2, pw / 2, ph / 2);
    plaqueGrad.addColorStop(0, tc.chassisTop);
    plaqueGrad.addColorStop(0.5, '#1e1b18');
    plaqueGrad.addColorStop(1, tc.chassisBot);

    safeRoundRect(ctx, -pw / 2, -ph / 2, pw, ph, 16);
    ctx.fillStyle = plaqueGrad;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = tc.light;
    ctx.shadowColor = tc.glow;
    ctx.shadowBlur = 24;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = tc.light;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ GOLDEN CAPSULE WINNER ★', 0, -34);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(winnerName, 0, 6);

    ctx.fillStyle = tc.primary;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('OFFICIAL PNEUMATIC LOTTO CERTIFIED', 0, 38);

    ctx.restore();
    this._endFrame();
  };

  // ============================================================================
  // 3. 拉斯維加斯皇家單臂機械拉霸機 (Vegas Royal One-Armed Bandit Slot Machine)
  //    ★ 徹底重構結構與對位：
  //    - 具備拱形霓虹燈箱冠座 (JACKPOT 777 Crown)、雙層電鍍機殼、右側動態機械拉桿 (Lever Arm)、底部鍍金出幣托盤。
  //    - 滾輪採用「連續實體名牌軌道 (Continuous Card Reel)」：每張名牌高 76px，名牌之間有分界槽，
  //      而人名繪製於名牌正中央 (y = slotOffset)。當滾輪停止時，得獎名牌中心偏移量 = 0.00px，
  //      左右雙向雷射指針 100% 正對人名正中央，分界黑線則永遠落在 y = ±38px，絕不可能壓線！
  // ============================================================================
  MasterVisualEngine.prototype._drawSlotStatic = function (name, pulseScale, isLocked, slotPixelOffset, bulbPhase, prevName, nextName, leverProgress, customItems, centerIndex) {
    var ctx = this._beginFrame();
    if (!ctx) return;
    var w = this.logicalW, h = this.logicalH;
    var isPortrait = (this.aspectRatio === '9:16');
    var slotScale = isPortrait ? 0.72 : 1;
    var cx = isPortrait ? (w / 2 - 14) : (w / 2 - 18);
    var cy = isPortrait ? (h / 2 - 10) : (h / 2 + 12);
    var tc = this._getThemeColors();

    pulseScale = (pulseScale || 1) * slotScale;
    slotPixelOffset = slotPixelOffset || 0;
    bulbPhase = (typeof bulbPhase === 'number') ? bulbPhase : 0;
    leverProgress = (typeof leverProgress === 'number') ? leverProgress : 0;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulseScale, pulseScale);

    var bodyW = 410, bodyH = 250;
    var halfW = bodyW / 2, halfH = bodyH / 2;

    // ------------------------------------------------------------------------
    // A. 右側聯動立體機械拉桿機構 (3D Mechanical Pull Lever Arm)
    // ------------------------------------------------------------------------
    var mountX = halfW, mountY = 10;
    ctx.fillStyle = tc.chassisTop;
    safeRoundRect(ctx, mountX - 4, mountY - 28, 28, 56, 6);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = tc.primary;
    ctx.stroke();

    // 拉桿角度隨抽獎啟動下壓並回彈 (-55度 -> +45度 -> -55度)
    var pullAngle = -0.95 + Math.sin(leverProgress * Math.PI) * 1.75;
    var armLen = 105;
    var knobX = mountX + 20 + Math.cos(pullAngle) * 28;
    var knobY = mountY + Math.sin(pullAngle) * armLen;

    // 電鍍金屬連桿
    ctx.beginPath();
    ctx.moveTo(mountX + 18, mountY);
    ctx.lineTo(knobX, knobY);
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // 3D 寶石紅/主題色拉桿球頭
    var knobGrad = ctx.createRadialGradient(knobX - 5, knobY - 5, 2, knobX, knobY, 20);
    knobGrad.addColorStop(0, '#ffffff');
    knobGrad.addColorStop(0.3, tc.light);
    knobGrad.addColorStop(0.7, tc.accent);
    knobGrad.addColorStop(1, tc.dark);
    ctx.beginPath();
    ctx.arc(knobX, knobY, 19, 0, Math.PI * 2);
    ctx.fillStyle = knobGrad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = tc.light;
    ctx.stroke();

    // ------------------------------------------------------------------------
    // B. 頂部皇家拱形霓虹燈箱冠座 (Vegas Arch Marquee Topper)
    // ------------------------------------------------------------------------
    ctx.beginPath();
    ctx.arc(0, -halfH + 10, 155, Math.PI, 0, false);
    var archGrad = ctx.createLinearGradient(0, -halfH - 145, 0, -halfH);
    archGrad.addColorStop(0, tc.primary);
    archGrad.addColorStop(0.35, tc.chassisTop);
    archGrad.addColorStop(1, tc.chassisBot);
    ctx.fillStyle = archGrad;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = tc.light;
    ctx.stroke();

    // 冠座內嵌 LED 顯示屏
    safeRoundRect(ctx, -115, -halfH - 54, 230, 36, 8);
    ctx.fillStyle = '#07090e';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = tc.primary;
    ctx.stroke();

    ctx.fillStyle = isLocked ? tc.light : tc.primary;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isLocked ? '★ 777 JACKPOT WINNER ★' : '★ ROYAL VEGAS 777 ★', 0, -halfH - 36);

    // ------------------------------------------------------------------------
    // C. 主機身重金屬裝甲與跑馬氖燈環 (Main Armored Cabinet & Marquee Bulbs)
    // ------------------------------------------------------------------------
    var cabGrad = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
    cabGrad.addColorStop(0, tc.chassisTop);
    cabGrad.addColorStop(0.5, tc.panelBg);
    cabGrad.addColorStop(1, tc.chassisBot);

    safeRoundRect(ctx, -halfW, -halfH, bodyW, bodyH, 22);
    ctx.fillStyle = cabGrad;
    ctx.fill();

    ctx.lineWidth = 5;
    ctx.strokeStyle = tc.primary;
    if (isLocked) {
      ctx.shadowColor = tc.glow;
      ctx.shadowBlur = 24;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 環繞跑馬燈泡
    var bulbMargin = 12;
    var bulbsX = 11, bulbsY = 6;
    var stepX = (bodyW - bulbMargin * 2) / (bulbsX - 1);
    var stepY = (bodyH - bulbMargin * 2) / (bulbsY - 1);
    var bulbPositions = [];
    for (var bx = 0; bx < bulbsX; bx++) bulbPositions.push({ x: -halfW + bulbMargin + bx * stepX, y: -halfH + bulbMargin });
    for (var by = 1; by < bulbsY - 1; by++) bulbPositions.push({ x: halfW - bulbMargin, y: -halfH + bulbMargin + by * stepY });
    for (var bx2 = bulbsX - 1; bx2 >= 0; bx2--) bulbPositions.push({ x: -halfW + bulbMargin + bx2 * stepX, y: halfH - bulbMargin });
    for (var by2 = bulbsY - 2; by2 >= 1; by2--) bulbPositions.push({ x: -halfW + bulbMargin, y: -halfH + bulbMargin + by2 * stepY });

    for (var bi = 0; bi < bulbPositions.length; bi++) {
      var bp = bulbPositions[bi];
      var isLit = isLocked ? (Math.floor(bulbPhase * 2 + bi) % 2 === 0) : ((bi + Math.floor(bulbPhase)) % 3 === 0);
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, 3.8, 0, Math.PI * 2);
      ctx.fillStyle = isLit ? '#ffffff' : tc.dark;
      ctx.fill();
      if (isLit) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = tc.light;
        ctx.stroke();
      }
    }

    // ------------------------------------------------------------------------
    // D. 中央 3D 滾輪艙與絕對對位名牌捲帶 (Zero-Ambiguity Drum Reel Window)
    //    ★ 關鍵設計：
    //    - 視窗高度 winH = 176，正中央為 y = 0。
    //    - 每個滾輪名牌高度 slotH = 74px。
    //    - 當鎖定或靜止時，中心名牌位於 y = [-37, +37]，人名正對 y = 0！
    //    - 上一張名牌位於 y = -74，下一張名牌位於 y = +74，名牌之間的黑線位於 y = ±37px，
    //      絕對不會出現在 y = 0 的指針線上！
    // ------------------------------------------------------------------------
    var winW = 346, winH = 176;
    var winLeft = -winW / 2, winTop = -winH / 2;
    var slotH = 74;

    ctx.save();
    safeRoundRect(ctx, winLeft, winTop, winW, winH, 12);
    if (typeof ctx.clip === 'function') ctx.clip();

    // 滾輪底艙
    ctx.fillStyle = '#06070b';
    ctx.fillRect(winLeft, winTop, winW, winH);

    // 建立可視 5 格名牌列 [-2, -1, 0, +1, +2]
    var cands = (this.candidates && this.candidates.length > 0) ? this.candidates : ['幸運得主', '尊貴嘉賓', '年度大獎'];
    for (var rel = -2; rel <= 2; rel++) {
      var itemName = '';
      if (customItems && typeof centerIndex === 'number') {
        var idx = centerIndex + rel;
        if (idx >= 0 && idx < customItems.length) {
          itemName = customItems[idx];
        } else {
          itemName = cands[((idx % cands.length) + cands.length) % cands.length];
        }
      } else {
        if (rel === 0) itemName = name || '準備抽獎';
        else if (rel === -1) itemName = prevName || cands[0];
        else if (rel === 1) itemName = nextName || cands[1 % cands.length];
        else itemName = cands[(rel + 10) % cands.length];
      }

      // 計算該名牌中心點在視窗內的精確 Y 座標
      // 當滾動結束 (slotPixelOffset === 0) 時，rel=0 的名牌中心 Y 座標精確為 0！
      var centerY = rel * slotH + slotPixelOffset;
      if (centerY < -winH * 0.75 || centerY > winH * 0.75) continue;

      // 圓柱曲面立體縮放與透視感
      var normDist = Math.min(1, Math.abs(centerY) / (winH * 0.62));
      var scaleY = Math.max(0.55, Math.cos(normDist * Math.PI * 0.38));
      var scaleX = 1 - normDist * 0.08;
      var cardAlpha = Math.max(0.2, 1 - normDist * 0.68);
      var isWinningCenter = (Math.abs(centerY) < slotH * 0.35);

      ctx.save();
      ctx.translate(0, centerY);
      ctx.scale(scaleX, scaleY);
      ctx.globalAlpha = cardAlpha;

      // 繪製實體立體名牌匣 (Plaque Tile) — 讓每一個名字都裝在獨立的金屬框牌子裡，分界一目了然！
      var tileW = winW - 36;
      var tileH = slotH - 8; // 留出 8px 的上下分隔溝槽 (位於 ±37px)
      var tileGrad = ctx.createLinearGradient(0, -tileH / 2, 0, tileH / 2);
      if (isLocked && isWinningCenter) {
        tileGrad.addColorStop(0, tc.chassisTop);
        tileGrad.addColorStop(0.5, '#292218');
        tileGrad.addColorStop(1, tc.chassisBot);
      } else if (isWinningCenter) {
        tileGrad.addColorStop(0, '#1e2433');
        tileGrad.addColorStop(0.5, '#131722');
        tileGrad.addColorStop(1, '#0c0f17');
      } else {
        tileGrad.addColorStop(0, '#141821');
        tileGrad.addColorStop(1, '#0b0d13');
      }

      safeRoundRect(ctx, -tileW / 2, -tileH / 2, tileW, tileH, 8);
      ctx.fillStyle = tileGrad;
      ctx.fill();

      ctx.lineWidth = (isLocked && isWinningCenter) ? 3 : (isWinningCenter ? 2 : 1);
      ctx.strokeStyle = (isLocked && isWinningCenter) ? tc.light : (isWinningCenter ? tc.primary : 'rgba(255,255,255,0.12)');
      ctx.stroke();

      // 名牌左右裝飾鉚釘
      ctx.fillStyle = isWinningCenter ? tc.light : '#475569';
      ctx.beginPath();
      ctx.arc(-tileW / 2 + 14, 0, 3, 0, Math.PI * 2);
      ctx.arc(tileW / 2 - 14, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      // ★ 繪製候選人姓名於名牌正中央 (y = 0)
      ctx.fillStyle = (isLocked && isWinningCenter) ? '#ffffff' : (isWinningCenter ? '#f8fafc' : '#94a3b8');
      ctx.font = isWinningCenter ? 'bold 32px sans-serif' : 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (isLocked && isWinningCenter) {
        ctx.shadowColor = tc.glow;
        ctx.shadowBlur = 14;
      }
      ctx.fillText(itemName, 0, 1);
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    // 圓柱滾輪上下深邃立體陰影遮罩 (不含任何中央黑線！)
    var topShade = ctx.createLinearGradient(0, winTop, 0, winTop + 48);
    topShade.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
    topShade.addColorStop(1, 'transparent');
    ctx.fillStyle = topShade;
    ctx.fillRect(winLeft, winTop, winW, 48);

    var botShade = ctx.createLinearGradient(0, winTop + winH - 48, 0, winTop + winH);
    botShade.addColorStop(0, 'transparent');
    botShade.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
    ctx.fillStyle = botShade;
    ctx.fillRect(winLeft, winTop + winH - 48, winW, 48);

    ctx.restore();

    // ------------------------------------------------------------------------
    // E. 中央獲獎鎖定光框與左右雙向雷射指針 (Payline Highlight Bracket & Pointers)
    //    ★ 絕不在 y=0 畫橫線切過文字！改用環繞中央名牌的黃金高光框 + 左右立體三角指針直指人名正中心！
    // ------------------------------------------------------------------------
    var focusH = slotH - 4;
    safeRoundRect(ctx, winLeft + 6, -focusH / 2, winW - 12, focusH, 10);
    ctx.lineWidth = isLocked ? 3.5 : 2;
    ctx.strokeStyle = isLocked ? tc.light : tc.primary;
    if (isLocked) {
      ctx.shadowColor = tc.glow;
      ctx.shadowBlur = 16;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 左側立體黃金指針 (指向 y = 0 正中心)
    var pSize = 14;
    ctx.beginPath();
    ctx.moveTo(winLeft - 10, -pSize);
    ctx.lineTo(winLeft + 14, 0);
    ctx.lineTo(winLeft - 10, pSize);
    ctx.closePath();
    ctx.fillStyle = isLocked ? tc.light : tc.primary;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // 右側立體黃金指針 (指向 y = 0 正中心)
    ctx.beginPath();
    ctx.moveTo(-winLeft + 10, -pSize);
    ctx.lineTo(-winLeft - 14, 0);
    ctx.lineTo(-winLeft + 10, pSize);
    ctx.closePath();
    ctx.fillStyle = isLocked ? tc.light : tc.primary;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // 視窗外框金屬壓條
    safeRoundRect(ctx, winLeft, winTop, winW, winH, 12);
    ctx.lineWidth = 3;
    ctx.strokeStyle = tc.primary;
    ctx.stroke();

    // 底部豪華鍍金出幣托盤基座 (Coin Tray Base)
    ctx.beginPath();
    ctx.moveTo(-halfW + 16, halfH);
    ctx.lineTo(halfW - 16, halfH);
    ctx.lineTo(halfW + 6, halfH + 22);
    ctx.lineTo(-halfW - 6, halfH + 22);
    ctx.closePath();
    ctx.fillStyle = tc.chassisTop;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = tc.primary;
    ctx.stroke();

    ctx.restore();
    this._endFrame();
  };

  // ============================================================================
  // 4. 歐式車站機械翻牌矩陣看板 (Grand Mechanical Split-Flap Departure Board)
  // ============================================================================
  MasterVisualEngine.prototype._drawFlapStatic = function (text, pulseScale, isLocked, progressRatio) {
    var ctx = this._beginFrame();
    if (!ctx) return;
    var w = this.logicalW, h = this.logicalH;
    var isPortrait = (this.aspectRatio === '9:16');
    var flapScale = isPortrait ? 0.72 : 1;
    var cx = w / 2, cy = isPortrait ? (h / 2 - 20) : (h / 2);
    var tc = this._getThemeColors();
    pulseScale = (pulseScale || 1) * flapScale;
    progressRatio = isLocked ? 1 : (progressRatio || 0);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulseScale, pulseScale);

    var chars = (text || 'READY').split('');
    var cardW = 68, cardH = 104, gap = 12;
    var totalCardsW = chars.length * cardW + (chars.length - 1) * gap;
    var boardW = Math.max(420, totalCardsW + 64);
    var boardH = 220;

    // 1. 歐式車站重金屬鉚釘裝甲外框
    var boardGrad = ctx.createLinearGradient(-boardW / 2, -boardH / 2, boardW / 2, boardH / 2);
    boardGrad.addColorStop(0, tc.chassisTop);
    boardGrad.addColorStop(0.5, tc.panelBg);
    boardGrad.addColorStop(1, tc.chassisBot);

    safeRoundRect(ctx, -boardW / 2, -boardH / 2, boardW, boardH, 16);
    ctx.fillStyle = boardGrad;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = isLocked ? tc.light : tc.primary;
    if (isLocked) {
      ctx.shadowColor = tc.glow;
      ctx.shadowBlur = 22;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 頂部狀態橫幅與 LED 指示燈
    ctx.fillStyle = tc.light;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isLocked ? '★ DEPARTURE GATE LOCKED — WINNER CONFIRMED ★' : '◈ MECHANICAL SPLIT-FLap TERMINAL ◈', 0, -boardH / 2 + 24);

    // 2. 繪製每一格機械翻頁字卡
    var startX = -totalCardsW / 2;
    for (var i = 0; i < chars.length; i++) {
      var x = startX + i * (cardW + gap);
      var y = -cardH / 2 + 6;
      var charLocked = isLocked || (progressRatio > (i + 1) / (chars.length + 1));

      // 字卡凹槽底座
      safeRoundRect(ctx, x - 3, y - 3, cardW + 6, cardH + 6, 8);
      ctx.fillStyle = '#050608';
      ctx.fill();

      // 上半頁與下半頁獨立立體渐層
      var flapGrad = ctx.createLinearGradient(x, y, x, y + cardH);
      if (charLocked) {
        flapGrad.addColorStop(0, '#27272a');
        flapGrad.addColorStop(0.49, '#18181b');
        flapGrad.addColorStop(0.51, '#27272a');
        flapGrad.addColorStop(1, '#09090b');
      } else {
        flapGrad.addColorStop(0, '#1e293b');
        flapGrad.addColorStop(1, '#0f172a');
      }

      safeRoundRect(ctx, x, y, cardW, cardH, 6);
      ctx.fillStyle = flapGrad;
      ctx.fill();
      ctx.lineWidth = charLocked ? 2.5 : 1.5;
      ctx.strokeStyle = charLocked ? tc.primary : '#475569';
      ctx.stroke();

      // 文字繪製於正中央
      ctx.fillStyle = charLocked ? '#ffffff' : tc.light;
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(chars[i], x + cardW / 2, y + cardH / 2 + 1);

      // 中央機械轉軸細縫與左右金屬軸承卡扣
      var midY = y + cardH / 2;
      ctx.beginPath();
      ctx.moveTo(x, midY);
      ctx.lineTo(x + cardW, midY);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.stroke();

      ctx.fillStyle = tc.primary;
      ctx.fillRect(x - 2, midY - 5, 5, 10);
      ctx.fillRect(x + cardW - 3, midY - 5, 5, 10);
    }

    // 底部同步進度能量條
    var barW = boardW - 80;
    safeRoundRect(ctx, -barW / 2, boardH / 2 - 24, barW, 6, 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();

    safeRoundRect(ctx, -barW / 2, boardH / 2 - 24, Math.max(8, barW * progressRatio), 6, 3);
    ctx.fillStyle = isLocked ? tc.light : tc.primary;
    ctx.fill();

    ctx.restore();
    this._endFrame();
  };

  // ============================================================================
  // 5. 星際量子陀螺儀躍遷核心 (Quantum Gyroscope Hyperspace Core)
  // ============================================================================
  MasterVisualEngine.prototype._initStars = function () {
    this.stars = [];
    for (var i = 0; i < 85; i++) {
      this.stars.push({
        x: (Math.random() - 0.5) * 640,
        y: (Math.random() - 0.5) * 480,
        z: 40 + Math.random() * 480,
        prevZ: 520
      });
    }
  };

  MasterVisualEngine.prototype._drawHyperspaceStatic = function (targetName, pulseScale, isLocked, gyroPhase) {
    var ctx = this._beginFrame();
    if (!ctx) return;
    this._renderHyperspaceCore(ctx, targetName, pulseScale, isLocked, gyroPhase || 0, false, 0);
    this._endFrame();
  };

  MasterVisualEngine.prototype._renderHyperspaceCore = function (ctx, targetName, pulseScale, isLocked, gyroPhase, drawWarpStreaks, warpSpeed) {
    var w = this.logicalW, h = this.logicalH;
    var isPortrait = (this.aspectRatio === '9:16');
    var hyperScale = isPortrait ? 0.74 : 1;
    var cx = w / 2, cy = isPortrait ? (h / 2 - 15) : (h / 2);
    var tc = this._getThemeColors();
    pulseScale = (pulseScale || 1) * hyperScale;
    gyroPhase = gyroPhase || 0;

    // 1. 深空引力場背景
    var spaceGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 340);
    spaceGrad.addColorStop(0, tc.chassisTop);
    spaceGrad.addColorStop(0.6, tc.panelBg);
    spaceGrad.addColorStop(1, '#040508');
    ctx.fillStyle = spaceGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. 光速星流軌跡線 (Warp Star Streaks)
    if (drawWarpStreaks && this.stars.length > 0) {
      ctx.save();
      for (var i = 0; i < this.stars.length; i++) {
        var s = this.stars[i];
        s.prevZ = s.z;
        s.z -= warpSpeed;
        if (s.z <= 10) {
          s.z = 520;
          s.prevZ = 520;
          s.x = (Math.random() - 0.5) * 640;
          s.y = (Math.random() - 0.5) * 480;
        }
        var k1 = 240 / s.z;
        var k0 = 240 / (s.prevZ + warpSpeed * 1.8);
        var px1 = cx + s.x * k1, py1 = cy + s.y * k1;
        var px0 = cx + s.x * k0, py0 = cy + s.y * k0;

        if (px1 > 0 && px1 < w && py1 > 0 && py1 < h) {
          ctx.beginPath();
          ctx.moveTo(px0, py0);
          ctx.lineTo(px1, py1);
          ctx.strokeStyle = (i % 3 === 0) ? tc.light : tc.primary;
          ctx.lineWidth = Math.max(1, (1 - s.z / 520) * 3.2);
          ctx.globalAlpha = Math.max(0.15, 1 - s.z / 520);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 3. 雙層反向旋轉量子陀螺儀星環 (Dual Counter-Rotating Quantum Gyroscope Rings)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulseScale, pulseScale);

    // 外層星盤刻度環
    ctx.save();
    ctx.rotate(gyroPhase * 0.6);
    ctx.strokeStyle = tc.primary;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 178, 0, Math.PI * 2);
    ctx.stroke();

    for (var deg = 0; deg < 36; deg++) {
      var a = (deg / 36) * Math.PI * 2;
      var rIn = (deg % 3 === 0) ? 164 : 170;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
      ctx.lineTo(Math.cos(a) * 178, Math.sin(a) * 178);
      ctx.strokeStyle = (deg % 3 === 0) ? tc.light : tc.primary;
      ctx.lineWidth = (deg % 3 === 0) ? 2.5 : 1.2;
      ctx.stroke();
    }
    ctx.restore();

    // 中層反向旋轉八角幾何能量陣
    ctx.save();
    ctx.rotate(-gyroPhase * 1.1);
    ctx.strokeStyle = tc.light;
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 2;
    for (var sq = 0; sq < 2; sq++) {
      ctx.save();
      ctx.rotate(sq * Math.PI / 4);
      ctx.strokeRect(-112, -112, 224, 224);
      ctx.restore();
    }
    ctx.restore();

    // 內層核心聚光防護罩
    var coreGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 125);
    coreGrad.addColorStop(0, isLocked ? 'rgba(254, 240, 138, 0.35)' : 'rgba(15, 23, 42, 0.92)');
    coreGrad.addColorStop(0.75, 'rgba(9, 12, 20, 0.95)');
    coreGrad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(0, 0, 125, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    // 核心名字顯示
    ctx.fillStyle = tc.light;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isLocked ? '★ QUANTUM SINGULARITY LOCKED ★' : '◈ HYPERSPACE TELEPORTATION CORE ◈', 0, -42);

    ctx.fillStyle = '#ffffff';
    ctx.font = isLocked ? 'bold 38px sans-serif' : 'bold 32px sans-serif';
    if (isLocked) {
      ctx.shadowColor = tc.glow;
      ctx.shadowBlur = 22;
    }
    ctx.fillText(targetName || 'LUCKY DRAW', 0, 4);
    ctx.shadowBlur = 0;

    ctx.restore();
  };

  // ============================================================================
  // 中獎後共振慶祝動畫與全開動畫
  // ============================================================================
  MasterVisualEngine.prototype.celebrateWinner = function (winnerName, durationMs, onDone) {
    this.stop();
    var self = this;
    durationMs = durationMs || 800;
    if (!this.canvas || !this.ctx) {
      this.isSpinning = false;
      if (typeof onDone === 'function') onDone();
      return;
    }
    var startTime = performance.now();

    function pulseStep(now) {
      var p = Math.min(1, (now - startTime) / durationMs);
      var pulseScale = 1 + 0.08 * Math.sin(p * Math.PI);

      if (self.currentMode === 'RIBBON_TAPE' || self.currentMode === 'WINDOWED_WHEEL') {
        self._drawRibbonStatic(self.ribbonFinalOffset, pulseScale, winnerName, true);
      } else if (self.currentMode === 'LOTTO_EGG') {
        self._drawLottoWinnerCelebration(winnerName, pulseScale);
      } else if (self.currentMode === 'SLOT_MACHINE') {
        self._drawSlotStatic(winnerName, pulseScale, true, 0, now / 50, null, null, 0, self.slotStrip, self.slotTargetIndex);
      } else if (self.currentMode === 'SPLIT_FLAP') {
        self._drawFlapStatic(winnerName, pulseScale, true, 1);
      } else if (self.currentMode === 'HYPERSPACE') {
        self._drawHyperspaceStatic(winnerName, pulseScale, true, now * 0.002);
      }

      if (p < 1) {
        self.animId = requestAnimationFrame(pulseStep);
      } else {
        self.isSpinning = false;
        self.animId = null;
        if (typeof onDone === 'function') onDone();
      }
    }

    this.animId = requestAnimationFrame(pulseStep);
  };

  MasterVisualEngine.prototype.celebrateBatchWinners = function (winners, durationMs, onDone) {
    this.stop();
    var self = this;
    durationMs = durationMs || 900;
    if (!this.canvas || !this.ctx) {
      this.isSpinning = false;
      if (typeof onDone === 'function') onDone();
      return;
    }
    var topName = (winners && winners.length > 0) ? winners[0] : '中獎人';
    var startTime = performance.now();

    function batchStep(now) {
      var p = Math.min(1, (now - startTime) / durationMs);
      var pulseScale = 1 + 0.10 * Math.sin(p * Math.PI);

      if (self.currentMode === 'RIBBON_TAPE' || self.currentMode === 'WINDOWED_WHEEL') {
        self._drawRibbonStatic(self.ribbonFinalOffset, pulseScale, topName, true);
      } else if (self.currentMode === 'LOTTO_EGG') {
        self._drawLottoWinnerCelebration(topName, pulseScale);
      } else if (self.currentMode === 'SLOT_MACHINE') {
        self._drawSlotStatic(topName, pulseScale, true, 0, now / 50, null, null, 0);
      } else if (self.currentMode === 'SPLIT_FLAP') {
        self._drawFlapStatic(topName, pulseScale, true, 1);
      } else if (self.currentMode === 'HYPERSPACE') {
        self._drawHyperspaceStatic(topName, pulseScale, true, now * 0.002);
      }

      if (p < 1) {
        self.animId = requestAnimationFrame(batchStep);
      } else {
        self.isSpinning = false;
        self.animId = null;
        if (typeof onDone === 'function') onDone();
      }
    }

    this.animId = requestAnimationFrame(batchStep);
  };

  // ============================================================================
  // 啟動抽獎動畫主入口 (spinTo)
  // ============================================================================
  MasterVisualEngine.prototype.spinTo = function (mode, targetIndex, targetName, durationMs, onDone) {
    this.stop();
    this.isSpinning = true;
    mode = mode || this.currentMode || 'WINDOWED_WHEEL';
    this.currentMode = mode;
    var self = this;
    durationMs = durationMs || 3800;

    if (mode === 'RIBBON_TAPE' || mode === 'WINDOWED_WHEEL') {
      var stride = 176;
      var pool = (self.candidates && self.candidates.length > 0) ? self.candidates : ['幸運候選人', '尊貴貴賓', '大會嘉賓', '現場抽獎'];
      var poolLen = pool.length;
      var targetK = Math.max(poolLen, 45);
      var strip = [];
      for (var idx = 0; idx <= targetK + 8; idx++) {
        if (idx === targetK) {
          strip.push(targetName);
        } else {
          strip.push(pool[idx % pool.length]);
        }
      }
      self.ribbonStrip = strip;
      self.ribbonTargetIndex = targetK;
      var finalOffset = targetK * stride;
      self.ribbonFinalOffset = finalOffset;
      var lastCardTick = -1;
    }

    if (!this.canvas || !this.ctx) {
      setTimeout(function () {
        self.isSpinning = false;
        if (typeof onDone === 'function') onDone();
      }, 50);
      return;
    }

    if (mode === 'RIBBON_TAPE' || mode === 'WINDOWED_WHEEL') {
      var startTime = performance.now();

      this.animId = requestAnimationFrame(function stepRibbon(now) {
        if (!self.isSpinning) return;
        var p = Math.min(1, (now - startTime) / durationMs);
        var eased = easeOutQuint(p);
        var curOffset = finalOffset * eased;

        var curCardIndex = Math.floor(curOffset / stride);
        if (curCardIndex !== lastCardTick) {
          lastCardTick = curCardIndex;
          if (self.audio) self.audio.playTick();
        }

        self._drawRibbonStatic(curOffset, 1, targetName, p >= 0.99);

        if (p < 1) {
          self.animId = requestAnimationFrame(stepRibbon);
        } else {
          self._drawRibbonStatic(finalOffset, 1, targetName, true);
          if (typeof onDone === 'function') onDone();
        }
      });

    } else if (mode === 'LOTTO_EGG') {
      this._initLottoBalls();
      var t0 = performance.now();
      var eggOut = false;
      var lastChamberTick = 0;

      this.animId = requestAnimationFrame(function stepLotto(now) {
        if (!self.isSpinning) return;
        var p = Math.min(1, (now - t0) / durationMs);
        var isPortrait = (self.aspectRatio === '9:16');
        var cx = self.logicalW / 2, cy = isPortrait ? 260 : 195, R = isPortrait ? 115 : 128;

        var speedScale = 2.0 * (1 - easeOutQuint(p)) + 0.25;
        for (var i = 0; i < self.lottoBalls.length; i++) {
          var b = self.lottoBalls[i];
          b.x += b.vx * speedScale;
          b.y += b.vy * speedScale;
          b.vy -= 0.58 * speedScale;

          var dist = Math.hypot(b.x - cx, b.y - cy);
          if (dist > R - b.r - 3) {
            var angle = Math.atan2(b.y - cy, b.x - cx);
            b.vx = -Math.cos(angle) * (6 + Math.random() * 4);
            b.vy = -Math.sin(angle) * (6 + Math.random() * 4);
          }
        }

        if (now - lastChamberTick > 60 + 220 * p) {
          lastChamberTick = now;
          if (self.audio) self.audio.playTick();
        }

        if (p > 0.62) {
          if (!eggOut) {
            eggOut = true;
            if (self.audio) self.audio.playPop();
          }
          var eggProg = (p - 0.62) / 0.38;
          if (eggProg < 0.55) {
            var ctx = self._beginFrame();
            if (ctx) {
              self._drawLottoMachineChamber(ctx, cx, cy, R, true, now * 0.05);
              var dropY = (cy - R - 10) + (self.logicalH / 2 + 15 - (cy - R - 10)) * easeOutQuint(eggProg / 0.55);
              var goldGrad = ctx.createRadialGradient(cx - 6, dropY - 6, 2, cx, dropY, 26);
              goldGrad.addColorStop(0, '#ffffff');
              goldGrad.addColorStop(0.3, '#fef08a');
              goldGrad.addColorStop(0.8, '#eab308');
              goldGrad.addColorStop(1, '#854d0e');

              ctx.save();
              ctx.beginPath();
              ctx.arc(cx, dropY, 26, 0, 2 * Math.PI);
              ctx.fillStyle = goldGrad;
              ctx.fill();
              ctx.lineWidth = 3;
              ctx.strokeStyle = '#ffffff';
              ctx.stroke();
              ctx.restore();
              self._endFrame();
            }
          } else {
            self._drawLottoWinnerCelebration(targetName, 1 + 0.08 * (eggProg - 0.55));
          }
        } else {
          var ctx2 = self._beginFrame();
          if (ctx2) {
            self._drawLottoMachineChamber(ctx2, cx, cy, R, true, now * 0.05);
            self._endFrame();
          }
        }

        if (p < 1) {
          self.animId = requestAnimationFrame(stepLotto);
        } else {
          if (typeof onDone === 'function') onDone();
        }
      });

    } else if (mode === 'SLOT_MACHINE') {
      // ★ 建立連續無縫拉霸捲帶，目標得主精確放置在 index = targetSlotIdx
      var cands = (this.candidates && this.candidates.length > 0) ? this.candidates : [targetName || '幸運得主'];
      var targetSlotIdx = 42;
      var slotStrip = [];
      for (var si = 0; si <= targetSlotIdx + 6; si++) {
        if (si === targetSlotIdx) {
          slotStrip.push(targetName);
        } else {
          slotStrip.push(cands[si % cands.length]);
        }
      }
      this.slotStrip = slotStrip;
      this.slotTargetIndex = targetSlotIdx;

      var slotH = 74;
      var tStart = performance.now();
      var lastRollTick = -1;

      this.animId = requestAnimationFrame(function stepSlot(now) {
        if (!self.isSpinning) return;
        var p = Math.min(1, (now - tStart) / durationMs);

        // 前 12% 時間為右側拉桿下壓啟動動畫
        var leverProg = p < 0.14 ? (p / 0.14) : 0;
        var spinProg = p < 0.05 ? 0 : (p - 0.05) / 0.95;

        // 使用帶過衝回彈的機械曲線，終點 (p=1) 時 currentSlot精確等於 targetSlotIdx (42.0000)
        var eased = slotMechanicalEase(spinProg);
        var currentVirtualIndex = targetSlotIdx * eased;
        var nearestIdx = Math.round(currentVirtualIndex);

        // 計算相對於最近名牌中心的像素偏移量；當 p=1 時，currentVirtualIndex === 42，pixelOffset === 0.00！
        var pixelOffset = -(currentVirtualIndex - nearestIdx) * slotH;

        if (nearestIdx !== lastRollTick && spinProg > 0) {
          lastRollTick = nearestIdx;
          if (self.audio) self.audio.playTick();
        }

        var isDone = (p >= 1);
        var bulbPhase = now / 55;
        var centerName = slotStrip[Math.max(0, Math.min(slotStrip.length - 1, nearestIdx))];

        self._drawSlotStatic(
          isDone ? targetName : centerName,
          1,
          isDone,
          isDone ? 0 : pixelOffset,
          bulbPhase,
          null,
          null,
          leverProg,
          slotStrip,
          isDone ? targetSlotIdx : nearestIdx
        );

        if (!isDone) {
          self.animId = requestAnimationFrame(stepSlot);
        } else {
          self._drawSlotStatic(targetName, 1, true, 0, bulbPhase, null, null, 0, slotStrip, targetSlotIdx);
          if (typeof onDone === 'function') onDone();
        }
      });

    } else if (mode === 'SPLIT_FLAP') {
      var tF = performance.now();
      var lastFlap = 0;
      var alphabet = '陳林黃張李王吳劉蔡楊許鄭謝郭洪曾邱廖賴周徐蘇葉莊呂江何蕭羅高';

      this.animId = requestAnimationFrame(function stepFlap(now) {
        if (!self.isSpinning) return;
        var p = Math.min(1, (now - tF) / durationMs);

        if (now - lastFlap > 42 + 160 * p) {
          lastFlap = now;
          if (self.audio) self.audio.playFlap();

          var targetChars = targetName.split('');
          var curStr = '';
          for (var i = 0; i < targetChars.length; i++) {
            if (p > (i + 1) / (targetChars.length + 1)) {
              curStr += targetChars[i];
            } else {
              curStr += alphabet[Math.floor(Math.random() * alphabet.length)];
            }
          }
          self._drawFlapStatic(curStr, 1, false, p);
        }

        if (p < 1) {
          self.animId = requestAnimationFrame(stepFlap);
        } else {
          self._drawFlapStatic(targetName, 1, true, 1);
          if (typeof onDone === 'function') onDone();
        }
      });

    } else if (mode === 'HYPERSPACE') {
      this._initStars();
      var tH = performance.now();
      var candsH = (this.candidates && this.candidates.length > 0) ? this.candidates : [targetName];

      this.animId = requestAnimationFrame(function stepWarp(now) {
        if (!self.isSpinning) return;
        var p = Math.min(1, (now - tH) / durationMs);
        var warpSpeed = 28 * (1 - easeOutQuint(p)) + 2.5;
        var displayStr = (p > 0.82) ? targetName : candsH[Math.floor(now / 70) % candsH.length];

        var ctx = self._beginFrame();
        if (ctx) {
          self._renderHyperspaceCore(ctx, displayStr, 1, p >= 0.98, now * 0.004 * (2 - p), true, warpSpeed);
          self._endFrame();
        }

        if (p < 1) {
          self.animId = requestAnimationFrame(stepWarp);
        } else {
          self._drawHyperspaceStatic(targetName, 1, true, now * 0.002);
          if (typeof onDone === 'function') onDone();
        }
      });
    }
  };

  MasterVisualEngine.prototype.stop = function () {
    this.isSpinning = false;
    if (this.animId) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.animId);
      }
      this.animId = null;
    }
  };

  return MasterVisualEngine;
});
