/**
 * 純前端單檔離線抽獎 Web 應用 - 核心五大視覺開獎引擎 (MasterVisualEngine)
 * 規格版本: v1.2.0
 * 
 * 支援 5 大隨機無重複開獎模式:
 * 1. WINDOWED_WHEEL (動態視窗 12 格輪盤，指針死角校準置中 + 局部放大)
 * 2. LOTTO_EGG (真實氣壓式 3D 彩球抽獎機，金屬底座/透明玻璃罩/氣流渦流/出球開獎)
 * 3. SLOT_MACHINE (立體滾輪拉霸，物理過衝彈回)
 * 4. SPLIT_FLAP (機械翻牌告示看板，字元逐一收斂)
 * 5. HYPERSPACE (星際躍遷速度線與聚光燈鎖定)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MasterVisualEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function easeOutQuint(t) {
    return 1 + (--t) * t * t * t * t;
  }

  function MasterVisualEngine(canvasElement, audioSynthesizer) {
    this.canvas = canvasElement || null;
    this.ctx = canvasElement && canvasElement.getContext ? canvasElement.getContext('2d') : null;
    this.audio = audioSynthesizer || null;

    this.candidates = [];
    this.currentMode = 'RIBBON_TAPE';
    this.animId = null;
    this.isSpinning = false;
    this.ribbonFinalOffset = 0;
    this.ribbonTargetIndex = 0;
    this.ribbonStrip = [];

    this.lottoBalls = [];
    this.stars = [];
  }

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
      this._drawSlotStatic(name, 1, false);
    } else if (this.currentMode === 'SPLIT_FLAP') {
      this._drawFlapStatic('READY', 1, false);
    } else if (this.currentMode === 'HYPERSPACE') {
      this._drawHyperspaceStatic('LUCKY DRAW', 1, false);
    }
  };

  /**
   * 1. 全景開箱滑軌 (Cinematic CS:GO Style Ribbon Tape)
   * 支援 100+ 人全員在場：名牌水平滑軌，準心精確對齊置中
   */
  MasterVisualEngine.prototype._drawRibbonStatic = function (offset, pulseScale, winnerName, isRevealed, customStrip) {
    if (!this.ctx || !this.canvas) return;
    var ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2;
    offset = offset || 0;
    pulseScale = pulseScale || 1;

    var cardW = 160;
    var cardH = 140;
    var cardGap = 16;
    var stride = cardW + cardGap; // 176

    var strip = customStrip || this.ribbonStrip;
    if (!strip || strip.length === 0) {
      var list = (this.candidates && this.candidates.length > 0) ? this.candidates : ['幸運候選人', '尊貴貴賓', '大會嘉賓', '現場抽獎'];
      strip = [];
      for (var s = 0; s < 30; s++) {
        strip.push(list[s % list.length]);
      }
    }

    // 1. 滑軌背景底座與金屬軌道
    var trackY = cy - cardH / 2 - 14;
    var trackH = cardH + 28;

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, trackY, w, trackH);

    var railGrad = ctx.createLinearGradient(0, 0, w, 0);
    railGrad.addColorStop(0, '#3f2d08');
    railGrad.addColorStop(0.25, '#aa820a');
    railGrad.addColorStop(0.5, '#fef08a');
    railGrad.addColorStop(0.75, '#aa820a');
    railGrad.addColorStop(1, '#3f2d08');

    ctx.fillStyle = railGrad;
    ctx.fillRect(0, trackY, w, 3);
    ctx.fillRect(0, trackY + trackH - 3, w, 3);

    // 2. 繪製所有可見卡片
    var firstVisible = Math.max(0, Math.floor((offset - cx - stride) / stride));
    var lastVisible = Math.min(strip.length - 1, Math.ceil((offset + cx + stride) / stride));

    for (var i = firstVisible; i <= lastVisible; i++) {
      var itemX = cx + i * stride - offset;
      var isTargetCard = (isRevealed && i === this.ribbonTargetIndex);
      var scale = isTargetCard ? pulseScale : 1;

      ctx.save();
      ctx.translate(itemX, cy);
      if (scale !== 1) {
        ctx.scale(scale, scale);
      }

      var cardLeft = -cardW / 2;
      var cardTop = -cardH / 2;

      var cardGrad = ctx.createLinearGradient(0, cardTop, 0, cardTop + cardH);
      if (isTargetCard) {
        cardGrad.addColorStop(0, '#2e2614');
        cardGrad.addColorStop(0.5, '#1e1c18');
        cardGrad.addColorStop(1, '#141312');
      } else {
        cardGrad.addColorStop(0, '#1c1f28');
        cardGrad.addColorStop(1, '#111318');
      }

      ctx.beginPath();
      ctx.roundRect(cardLeft, cardTop, cardW, cardH, 10);
      ctx.fillStyle = cardGrad;
      ctx.fill();

      ctx.lineWidth = isTargetCard ? 3.5 : 1.5;
      ctx.strokeStyle = isTargetCard ? '#fde047' : 'rgba(212, 175, 55, 0.35)';
      if (isTargetCard) {
        ctx.shadowColor = '#d4af37';
        ctx.shadowBlur = 18;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = isTargetCard ? 'rgba(253, 224, 71, 0.2)' : 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(cardLeft + 10, cardTop + 10, cardW - 20, 22);
      ctx.fillStyle = isTargetCard ? '#fde047' : '#d4af37';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var tagText = isTargetCard ? '★ 幸運獲獎者' : ('#' + ((i % (this.candidates.length || 1)) + 1));
      ctx.fillText(tagText, 0, cardTop + 21);

      var nameStr = (isTargetCard && winnerName) ? winnerName : strip[i];
      ctx.fillStyle = isTargetCard ? '#ffffff' : '#f4f4f5';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(nameStr, 0, cardTop + 72);

      var stripColors = ['#e53e3e', '#d4af37', '#38bdf8', '#10b981', '#a855f7'];
      ctx.fillStyle = isTargetCard ? '#fde047' : stripColors[i % stripColors.length];
      ctx.fillRect(cardLeft + 12, cardTop + cardH - 12, cardW - 24, 3);

      ctx.restore();
    }

    // 3. 左右邊緣暗部漸變遮罩 (Cinematic Vignette)
    var leftVignette = ctx.createLinearGradient(0, 0, 140, 0);
    leftVignette.addColorStop(0, 'rgba(17, 18, 21, 0.96)');
    leftVignette.addColorStop(1, 'rgba(17, 18, 21, 0)');
    ctx.fillStyle = leftVignette;
    ctx.fillRect(0, trackY, 140, trackH);

    var rightVignette = ctx.createLinearGradient(w - 140, 0, w, 0);
    rightVignette.addColorStop(0, 'rgba(17, 18, 21, 0)');
    rightVignette.addColorStop(1, 'rgba(17, 18, 21, 0.96)');
    ctx.fillStyle = rightVignette;
    ctx.fillRect(w - 140, trackY, 140, trackH);

    // 4. 中央準心指針 (Central Laser Reticle & Pointers)
    ctx.beginPath();
    ctx.moveTo(cx, trackY);
    ctx.lineTo(cx, trackY + trackH);
    ctx.lineWidth = 2;
    ctx.strokeStyle = isRevealed ? '#fde047' : 'rgba(212, 175, 55, 0.7)';
    if (isRevealed) {
      ctx.shadowColor = '#d4af37';
      ctx.shadowBlur = 12;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 頂部倒三角箭頭
    ctx.beginPath();
    ctx.moveTo(cx - 14, trackY - 14);
    ctx.lineTo(cx + 14, trackY - 14);
    ctx.lineTo(cx, trackY + 4);
    ctx.closePath();
    ctx.fillStyle = isRevealed ? '#fde047' : '#d4af37';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // 底部正三角箭頭
    ctx.beginPath();
    ctx.moveTo(cx - 14, trackY + trackH + 14);
    ctx.lineTo(cx + 14, trackY + trackH + 14);
    ctx.lineTo(cx, trackY + trackH - 4);
    ctx.closePath();
    ctx.fillStyle = isRevealed ? '#fde047' : '#d4af37';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    if (!isRevealed) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('全景開箱滑軌 - 全員名冊依序排列滾動', cx, h - 35);
    }
  };

  // 向下相容別名
  MasterVisualEngine.prototype._drawWheelStatic = function (angle, zoomFactor, highlightName, isRevealed) {
    this._drawRibbonStatic(0, zoomFactor, highlightName, isRevealed);
  };

  /**
   * 2. 氣壓式透明彩球抽獎機 (Lotto Machine)
   */
  MasterVisualEngine.prototype._initLottoBalls = function () {
    this.lottoBalls = [];
    var palette = [
      { base: '#dc2626', light: '#f87171', dark: '#991b1b' }, // 紅
      { base: '#2563eb', light: '#60a5fa', dark: '#1e40af' }, // 藍
      { base: '#059669', light: '#34d399', dark: '#065f46' }, // 綠
      { base: '#d97706', light: '#fbbf24', dark: '#92400e' }, // 琥珀黃
      { base: '#7c3aed', light: '#a78bfa', dark: '#5b21b6' }, // 紫
      { base: '#db2777', light: '#f472b6', dark: '#9d174d' }, // 桃紅
      { base: '#0891b2', light: '#22d3ee', dark: '#155e75' }  // 青藍
    ];
    var cx = (this.canvas ? this.canvas.width : 640) / 2;
    var cy = 160;
    for (var i = 0; i < 28; i++) {
      var col = palette[i % palette.length];
      var rad = 25 + Math.random() * 68;
      var ang = Math.random() * Math.PI * 2;
      this.lottoBalls.push({
        x: cx + Math.cos(ang) * rad,
        y: cy + Math.sin(ang) * rad,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        r: 13,
        num: (i < 9 ? '0' : '') + (i + 1),
        colorBase: col.base,
        colorLight: col.light,
        colorDark: col.dark
      });
    }
  };

  MasterVisualEngine.prototype._drawLottoMachineChamber = function (ctx, cx, cy, R, airJetActive) {
    // 1. 重量級鍍金基座 (Pedestal)
    var baseW = 280, baseH = 55;
    var baseY = cy + R - 15;
    var gradBase = ctx.createLinearGradient(cx - baseW / 2, 0, cx + baseW / 2, 0);
    gradBase.addColorStop(0, '#3f2d08');
    gradBase.addColorStop(0.25, '#aa820a');
    gradBase.addColorStop(0.5, '#fef08a');
    gradBase.addColorStop(0.75, '#aa820a');
    gradBase.addColorStop(1, '#3f2d08');

    ctx.beginPath();
    ctx.moveTo(cx - baseW / 2, baseY + baseH);
    ctx.lineTo(cx - baseW / 2 + 20, baseY);
    ctx.lineTo(cx + baseW / 2 - 20, baseY);
    ctx.lineTo(cx + baseW / 2, baseY + baseH);
    ctx.closePath();
    ctx.fillStyle = gradBase;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#d4af37';
    ctx.stroke();

    // 氣孔百葉 (Air vents)
    for (var k = -3; k <= 3; k++) {
      ctx.beginPath();
      ctx.moveTo(cx + k * 26, baseY + 12);
      ctx.lineTo(cx + k * 26, baseY + baseH - 12);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#181a1f';
      ctx.stroke();
      if (airJetActive) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.6)';
        ctx.stroke();
      }
    }

    // 2. 玻璃球體內部大氣漸層
    var sphereBg = ctx.createRadialGradient(cx, cy - 20, 20, cx, cy, R);
    sphereBg.addColorStop(0, 'rgba(30, 41, 59, 0.7)');
    sphereBg.addColorStop(0.7, 'rgba(15, 23, 42, 0.9)');
    sphereBg.addColorStop(1, 'rgba(8, 12, 20, 0.98)');

    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.fillStyle = sphereBg;
    ctx.fill();

    // 氣壓渦流線條
    if (airJetActive) {
      ctx.save();
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.35)';
      ctx.lineWidth = 1.5;
      for (var j = -2; j <= 2; j++) {
        ctx.beginPath();
        var sx = cx + j * 24;
        ctx.moveTo(sx, cy + R - 20);
        ctx.bezierCurveTo(sx + j * 10, cy + 30, sx - j * 15, cy - 40, cx + j * 8, cy - R + 30);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. 繪製 3D 立體彩球
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
      ctx.arc(b.x, b.y, 5.2, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.fillStyle = '#111215';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.num, b.x, b.y);
      ctx.restore();
    }

    // 4. 玻璃球外圈銅圈與弧形高光反光 (Specular Reflections)
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#d4af37';
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R - 6, Math.PI * 0.9, Math.PI * 1.35);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, R - 6, Math.PI * 0.05, Math.PI * 0.25);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.stroke();
    ctx.restore();

    // 頂部出球管口
    ctx.beginPath();
    ctx.rect(cx - 24, cy - R - 22, 48, 24);
    ctx.fillStyle = gradBase;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#d4af37';
    ctx.stroke();
  };

  MasterVisualEngine.prototype._drawLottoStatic = function () {
    if (!this.ctx || !this.canvas) return;
    var ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    var cx = w / 2, cy = 160, R = 120;
    if (this.lottoBalls.length === 0) this._initLottoBalls();
    this._drawLottoMachineChamber(ctx, cx, cy, R, false);

    // 靜態待機提示
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('氣壓式樂透彩球抽獎機 - 等待啟動', cx, h - 30);
  };

  MasterVisualEngine.prototype._drawLottoWinnerCelebration = function (winnerName, pulseScale) {
    if (!this.ctx || !this.canvas) return;
    var ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    var cx = w / 2, cy = 160, R = 120;
    this._drawLottoMachineChamber(ctx, cx, cy, R, false);

    // 中央尊榮金屬得獎獎牌
    pulseScale = pulseScale || 1;
    ctx.save();
    ctx.translate(cx, h / 2 + 10);
    ctx.scale(pulseScale, pulseScale);

    var pw = 320, ph = 110;
    var plaqueGrad = ctx.createLinearGradient(-pw / 2, -ph / 2, pw / 2, ph / 2);
    plaqueGrad.addColorStop(0, '#1c1917');
    plaqueGrad.addColorStop(0.5, '#292524');
    plaqueGrad.addColorStop(1, '#0c0a09');

    ctx.beginPath();
    ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 14);
    ctx.fillStyle = plaqueGrad;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#fde047';
    ctx.shadowColor = '#d4af37';
    ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 標題
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ 幸運得主出爐 ★', 0, -28);

    // 得獎人姓名
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(winnerName, 0, 6);

    // 底部副標
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('OFFICIAL LOTTO WINNER', 0, 34);

    ctx.restore();
  };

  /**
   * 3. 拉斯維加斯奢華拉霸機 (Vegas Luxury Slot Machine)
   * 包含 3D 圓柱滾輪、流動高光立體陰影、跑馬燈氖燈環繞、高潮金光爆擊
   */
  MasterVisualEngine.prototype._drawSlotStatic = function (name, pulseScale, isLocked, reelAngle, bulbPhase, prevName, nextName) {
    if (!this.ctx || !this.canvas) return;
    var ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2;
    pulseScale = pulseScale || 1;
    reelAngle = reelAngle || 0;
    bulbPhase = (typeof bulbPhase === 'number') ? bulbPhase : 0;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulseScale, pulseScale);

    var rw = 400, rh = 190;
    var halfW = rw / 2, halfH = rh / 2;

    // 1. 機身奢華外框 (Vegas Casino Marquee Chassis)
    var chassisGrad = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
    chassisGrad.addColorStop(0, '#2a1708');
    chassisGrad.addColorStop(0.3, '#180e05');
    chassisGrad.addColorStop(0.7, '#150a04');
    chassisGrad.addColorStop(1, '#2c1808');

    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, rw, rh, 20);
    ctx.fillStyle = chassisGrad;
    ctx.fill();

    // 金屬雙層電鍍外圈 (Gold Metallic Bevel)
    var rimGrad = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
    rimGrad.addColorStop(0, '#fef08a');
    rimGrad.addColorStop(0.25, '#d4af37');
    rimGrad.addColorStop(0.5, '#78350f');
    rimGrad.addColorStop(0.75, '#fde047');
    rimGrad.addColorStop(1, '#b45309');

    ctx.lineWidth = 5;
    ctx.strokeStyle = rimGrad;
    if (isLocked) {
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 24;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 2. 跑馬燈氖燈陣列 (Chasing Casino Marquee Lights)
    var bulbMargin = 10;
    var bulbsX = 10, bulbsY = 5;
    var bulbRadius = 3.6;
    var stepX = (rw - bulbMargin * 2) / (bulbsX - 1);
    var stepY = (rh - bulbMargin * 2) / (bulbsY - 1);

    var bulbPositions = [];
    // 頂部
    for (var bx = 0; bx < bulbsX; bx++) {
      bulbPositions.push({ x: -halfW + bulbMargin + bx * stepX, y: -halfH + bulbMargin });
    }
    // 右側
    for (var by = 1; by < bulbsY - 1; by++) {
      bulbPositions.push({ x: halfW - bulbMargin, y: -halfH + bulbMargin + by * stepY });
    }
    // 底部
    for (var bx = bulbsX - 1; bx >= 0; bx--) {
      bulbPositions.push({ x: -halfW + bulbMargin + bx * stepX, y: halfH - bulbMargin });
    }
    // 左側
    for (var by = bulbsY - 2; by >= 1; by--) {
      bulbPositions.push({ x: -halfW + bulbMargin, y: -halfH + bulbMargin + by * stepY });
    }

    for (var bi = 0; bi < bulbPositions.length; bi++) {
      var bp = bulbPositions[bi];
      var bulbState = (bi + Math.floor(bulbPhase)) % 3;
      var bColor, bGlow;
      if (isLocked) {
        var flash = Math.floor(bulbPhase * 2) % 2 === 0;
        bColor = flash ? '#ffffff' : '#fde047';
        bGlow = flash ? '#fef08a' : '#d4af37';
      } else {
        if (bulbState === 0) {
          bColor = '#ffffff';
          bGlow = '#fde047';
        } else if (bulbState === 1) {
          bColor = '#f59e0b';
          bGlow = '#d97706';
        } else {
          bColor = '#78350f';
          bGlow = 'transparent';
        }
      }

      ctx.beginPath();
      ctx.arc(bp.x, bp.y, bulbRadius, 0, 2 * Math.PI);
      ctx.fillStyle = bColor;
      if (bGlow !== 'transparent') {
        ctx.shadowColor = bGlow;
        ctx.shadowBlur = 8;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 頂部皇冠標牌 (Crown Header)
    var headW = 180, headH = 22;
    ctx.beginPath();
    ctx.roundRect(-headW / 2, -halfH - 12, headW, headH, 6);
    ctx.fillStyle = '#1c1917';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#d4af37';
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isLocked ? '★ JACKPOT WINNER ★' : '★ VEGAS LUXURY REEL ★', 0, -halfH - 1);

    // 3. 滾輪視窗 (Reel Window with Recessed Depth)
    var winW = 340, winH = 126;
    var winLeft = -winW / 2, winTop = -winH / 2;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(winLeft, winTop, winW, winH, 8);
    ctx.clip();

    // 滾輪底色 (深色緞面)
    ctx.fillStyle = '#0b0c10';
    ctx.fillRect(winLeft, winTop, winW, winH);

    // 4. 3D 圓柱投影繪製 (3D Cylindrical Drum Projection)
    var R = 72;
    var slots = [
      { text: prevName || '', angle: reelAngle - Math.PI / 3 },
      { text: name || '...', angle: reelAngle },
      { text: nextName || '', angle: reelAngle + Math.PI / 3 }
    ];

    for (var si = 0; si < slots.length; si++) {
      var s = slots[si];
      if (!s.text) continue;
      var a = s.angle;
      if (a < -Math.PI / 2 || a > Math.PI / 2) continue;

      var sy = R * Math.sin(a);
      var scY = Math.cos(a);
      var scX = 0.88 + 0.12 * Math.cos(a);
      var alpha = Math.max(0, Math.cos(a));

      ctx.save();
      ctx.translate(0, sy);
      ctx.scale(scX, Math.max(0.2, scY));
      ctx.globalAlpha = alpha;

      var isCenter = Math.abs(a) < 0.25;
      if (isLocked && isCenter) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#fde047';
        ctx.shadowBlur = 18;
      } else {
        ctx.fillStyle = isCenter ? '#f4f4f5' : '#9ca3af';
      }

      ctx.font = isCenter ? 'bold 34px sans-serif' : 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.text, 0, 0);

      ctx.restore();
    }

    // 5. 3D 圓柱流光與邊緣立體陰影 (Cylindrical Lighting & Specular Sheen)
    var cylGrad = ctx.createLinearGradient(0, winTop, 0, winTop + winH);
    cylGrad.addColorStop(0, 'rgba(0, 0, 0, 0.92)');
    cylGrad.addColorStop(0.22, 'rgba(0, 0, 0, 0.35)');
    cylGrad.addColorStop(0.48, 'rgba(255, 255, 255, 0.12)');
    cylGrad.addColorStop(0.52, 'rgba(255, 255, 255, 0.16)');
    cylGrad.addColorStop(0.78, 'rgba(0, 0, 0, 0.35)');
    cylGrad.addColorStop(1, 'rgba(0, 0, 0, 0.92)');

    ctx.fillStyle = cylGrad;
    ctx.fillRect(winLeft, winTop, winW, winH);

    ctx.restore();

    // 6. 中獎支付線與指針 (Payline Reticle & Golden Laser Pointers)
    ctx.beginPath();
    ctx.moveTo(winLeft, 0);
    ctx.lineTo(winLeft + winW, 0);
    ctx.lineWidth = isLocked ? 2 : 1;
    ctx.strokeStyle = isLocked ? 'rgba(253, 224, 71, 0.85)' : 'rgba(212, 175, 55, 0.35)';
    if (isLocked) {
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 10;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    var arrowSize = 9;
    ctx.beginPath();
    ctx.moveTo(winLeft - 4, -arrowSize);
    ctx.lineTo(winLeft + 8, 0);
    ctx.lineTo(winLeft - 4, arrowSize);
    ctx.closePath();
    ctx.fillStyle = isLocked ? '#fde047' : '#d4af37';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-winLeft + 4, -arrowSize);
    ctx.lineTo(-winLeft - 8, 0);
    ctx.lineTo(-winLeft + 4, arrowSize);
    ctx.closePath();
    ctx.fillStyle = isLocked ? '#fde047' : '#d4af37';
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(winLeft, winTop, winW, winH, 8);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isLocked ? '#fde047' : '#78350f';
    ctx.stroke();

    ctx.restore();
  };

  /**
   * 4. 翻牌式機械看板 (Split-Flap Display)
   */
  MasterVisualEngine.prototype._drawFlapStatic = function (text, pulseScale, isLocked) {
    if (!this.ctx || !this.canvas) return;
    var ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2;
    pulseScale = pulseScale || 1;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulseScale, pulseScale);

    var chars = (text || '---').split('');
    var cardW = 54, cardH = 82, gap = 10;
    var totalW = chars.length * cardW + (chars.length - 1) * gap;
    var startX = -totalW / 2;

    for (var i = 0; i < chars.length; i++) {
      var x = startX + i * (cardW + gap);
      // 卡片底色
      ctx.beginPath();
      ctx.roundRect(x, -cardH / 2, cardW, cardH, 6);
      ctx.fillStyle = '#22252d';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isLocked ? '#fde047' : '#4b5563';
      ctx.stroke();

      // 中間翻折水平分割線
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + cardW, 0);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#111215';
      ctx.stroke();

      // 字元
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(chars[i], x + cardW / 2, 0);
    }
    ctx.restore();
  };

  /**
   * 5. 時空跳躍光斑 (Hyperspace Warp)
   */
  MasterVisualEngine.prototype._initStars = function () {
    this.stars = [];
    for (var i = 0; i < 70; i++) {
      this.stars.push({
        x: (Math.random() - 0.5) * 520,
        y: (Math.random() - 0.5) * 420,
        z: Math.random() * 520
      });
    }
  };

  MasterVisualEngine.prototype._drawHyperspaceStatic = function (targetName, pulseScale, isLocked) {
    if (!this.ctx || !this.canvas) return;
    var ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.fillStyle = '#08090d';
    ctx.fillRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2;
    pulseScale = pulseScale || 1;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulseScale, pulseScale);

    // 聚光燈光暈
    var spotGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 160);
    spotGrad.addColorStop(0, 'rgba(253, 224, 71, 0.35)');
    spotGrad.addColorStop(0.6, 'rgba(212, 175, 55, 0.15)');
    spotGrad.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(0, 0, 160, 0, 2 * Math.PI);
    ctx.fillStyle = spotGrad;
    ctx.fill();

    // 姓名
    ctx.fillStyle = isLocked ? '#fde047' : '#ffffff';
    ctx.font = 'bold 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isLocked) {
      ctx.shadowColor = '#d4af37';
      ctx.shadowBlur = 20;
    }
    ctx.fillText(targetName || 'HYPERSPACE', 0, 0);
    ctx.shadowBlur = 0;

    ctx.restore();
  };

  /**
   * 中獎後共振慶祝動畫 (800ms，與 AudioSynthesizer 的 Fanfare 0.8s 完全同步結尾)
   */
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
        self._drawSlotStatic(winnerName, pulseScale, true, 0, now / 50);
      } else if (self.currentMode === 'SPLIT_FLAP') {
        self._drawFlapStatic(winnerName, pulseScale, true);
      } else if (self.currentMode === 'HYPERSPACE') {
        self._drawHyperspaceStatic(winnerName, pulseScale, true);
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

  /**
   * 全開模式多得主共振慶祝動畫
   */
  MasterVisualEngine.prototype.celebrateBatchWinners = function (winners, durationMs, onDone) {
    this.stop();
    var self = this;
    durationMs = durationMs || 900;
    if (!this.canvas || !this.ctx) {
      this.isSpinning = false;
      if (typeof onDone === 'function') onDone();
      return;
    }
    var topName = (winners && winners.length > 0) ? winners[0] + ' 等 ' + winners.length + ' 位' : '全開中獎';
    var startTime = performance.now();

    function batchStep(now) {
      var p = Math.min(1, (now - startTime) / durationMs);
      var pulseScale = 1 + 0.10 * Math.sin(p * Math.PI);

      if (self.currentMode === 'RIBBON_TAPE' || self.currentMode === 'WINDOWED_WHEEL') {
        self._drawRibbonStatic(self.ribbonFinalOffset, pulseScale, topName, true);
      } else if (self.currentMode === 'LOTTO_EGG') {
        self._drawLottoWinnerCelebration(topName, pulseScale);
      } else if (self.currentMode === 'SLOT_MACHINE') {
        self._drawSlotStatic(topName, pulseScale, true, 0, now / 50);
      } else if (self.currentMode === 'SPLIT_FLAP') {
        self._drawFlapStatic(topName, pulseScale, true);
      } else if (self.currentMode === 'HYPERSPACE') {
        self._drawHyperspaceStatic(topName, pulseScale, true);
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

  /**
   * 啟動抽獎動畫主入口
   */
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
        var ctx = self.ctx, w = self.canvas.width, h = self.canvas.height;
        ctx.clearRect(0, 0, w, h);
        var cx = w / 2, cy = 160, R = 120;

        // 氣壓減速
        var speedScale = 1.8 * (1 - easeOutQuint(p)) + 0.2;
        for (var i = 0; i < self.lottoBalls.length; i++) {
          var b = self.lottoBalls[i];
          b.x += b.vx * speedScale;
          b.y += b.vy * speedScale;
          b.vy -= 0.55 * speedScale; // 底部氣壓向上噴

          // 邊界反彈
          var dist = Math.hypot(b.x - cx, b.y - cy);
          if (dist > R - b.r) {
            var angle = Math.atan2(b.y - cy, b.x - cx);
            b.vx = -Math.cos(angle) * (6 + Math.random() * 4);
            b.vy = -Math.sin(angle) * (6 + Math.random() * 4);
          }
        }

        // 碰撞聲
        if (now - lastChamberTick > 60 + 220 * p) {
          lastChamberTick = now;
          if (self.audio) self.audio.playTick();
        }

        self._drawLottoMachineChamber(ctx, cx, cy, R, p < 0.8);

        // 出球開獎階段
        if (p > 0.60) {
          if (!eggOut) {
            eggOut = true;
            if (self.audio) self.audio.playPop();
          }

          var eggProg = (p - 0.60) / 0.40;
          if (eggProg < 0.6) {
            // 黃金彩球降落
            var dropY = (cy - R - 10) + (h / 2 + 10 - (cy - R - 10)) * easeOutQuint(eggProg / 0.6);
            var goldGrad = ctx.createRadialGradient(cx - 5, dropY - 5, 2, cx, dropY, 22);
            goldGrad.addColorStop(0, '#ffffff');
            goldGrad.addColorStop(0.3, '#fef08a');
            goldGrad.addColorStop(0.8, '#eab308');
            goldGrad.addColorStop(1, '#854d0e');

            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, dropY, 22, 0, 2 * Math.PI);
            ctx.fillStyle = goldGrad;
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = '#d4af37';
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.restore();
          } else {
            // 黃金彩球開盒為得獎標牌
            self._drawLottoWinnerCelebration(targetName, 1 + 0.1 * (eggProg - 0.6));
          }
        }

        if (p < 1) {
          self.animId = requestAnimationFrame(stepLotto);
        } else {
          if (typeof onDone === 'function') onDone();
        }
      });

    } else if (mode === 'SLOT_MACHINE') {
      var tStart = performance.now();
      var cands = (this.candidates && this.candidates.length > 0) ? this.candidates : [targetName || '幸運得主'];
      var totalRolls = 38;
      var lastRollTick = -1;

      this.animId = requestAnimationFrame(function stepSlot(now) {
        if (!self.isSpinning) return;
        var p = Math.min(1, (now - tStart) / durationMs);
        var eased = easeOutQuint(p);
        var rollPos = totalRolls * eased;
        var itemIdx = Math.floor(rollPos);
        var fraction = rollPos - itemIdx;

        if (itemIdx !== lastRollTick) {
          lastRollTick = itemIdx;
          if (self.audio) self.audio.playTick();
        }

        var isDone = (p >= 1);
        var bulbPhase = now / 60;
        var curName, prevName, nextName, reelAngle;

        if (isDone) {
          curName = targetName;
          var tidx = cands.indexOf(targetName);
          if (tidx === -1) tidx = 0;
          prevName = cands[(tidx - 1 + cands.length) % cands.length] || '';
          nextName = cands[(tidx + 1) % cands.length] || '';
          reelAngle = 0;
        } else {
          var ci = itemIdx % cands.length;
          curName = (p > 0.94) ? targetName : cands[ci];
          prevName = cands[(ci - 1 + cands.length) % cands.length] || '';
          nextName = (p > 0.90) ? targetName : cands[(ci + 1) % cands.length] || '';
          reelAngle = (fraction - 0.5) * (Math.PI / 3);
        }

        self._drawSlotStatic(curName, 1, isDone, reelAngle, bulbPhase, prevName, nextName);

        if (!isDone) {
          self.animId = requestAnimationFrame(stepSlot);
        } else {
          self._drawSlotStatic(targetName, 1, true, 0, bulbPhase, prevName, nextName);
          if (typeof onDone === 'function') onDone();
        }
      });

    } else if (mode === 'SPLIT_FLAP') {
      var tF = performance.now();
      var lastFlap = 0;
      var alphabet = '陳林黃張李王吳劉蔡楊許鄭謝郭洪曾邱廖賴周';

      this.animId = requestAnimationFrame(function stepFlap(now) {
        if (!self.isSpinning) return;
        var p = Math.min(1, (now - tF) / durationMs);

        if (now - lastFlap > 45 + 180 * p) {
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
          self._drawFlapStatic(curStr, 1, false);
        }

        if (p < 1) {
          self.animId = requestAnimationFrame(stepFlap);
        } else {
          self._drawFlapStatic(targetName, 1, true);
          if (typeof onDone === 'function') onDone();
        }
      });

    } else if (mode === 'HYPERSPACE') {
      this._initStars();
      var tH = performance.now();

      this.animId = requestAnimationFrame(function stepWarp(now) {
        if (!self.isSpinning) return;
        var p = Math.min(1, (now - tH) / durationMs);
        var ctx = self.ctx, w = self.canvas.width, h = self.canvas.height;

        ctx.fillStyle = 'rgba(8, 9, 13, 0.25)';
        ctx.fillRect(0, 0, w, h);

        var cx = w / 2, cy = h / 2;
        var warpSpeed = 25 * (1 - easeOutQuint(p)) + 2;

        for (var i = 0; i < self.stars.length; i++) {
          var s = self.stars[i];
          s.z -= warpSpeed;
          if (s.z <= 0) {
            s.z = 520;
            s.x = (Math.random() - 0.5) * 520;
            s.y = (Math.random() - 0.5) * 420;
          }

          var k = 220 / s.z;
          var px = s.x * k + cx;
          var py = s.y * k + cy;

          if (px > 0 && px < w && py > 0 && py < h) {
            ctx.beginPath();
            ctx.arc(px, py, Math.max(1, 3 * (1 - s.z / 520)), 0, 2 * Math.PI);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
          }
        }

        if (p > 0.85) {
          self._drawHyperspaceStatic(targetName, 1, p >= 0.98);
        }

        if (p < 1) {
          self.animId = requestAnimationFrame(stepWarp);
        } else {
          self._drawHyperspaceStatic(targetName, 1, true);
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
