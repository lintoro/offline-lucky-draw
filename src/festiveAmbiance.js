/**
 * 純前端單檔離線抽獎 Web 應用 - 4K Retina 級四大主題獨立幾何場景引擎 (Festive Ambiance v2.0)
 * 
 * 核心改革與特色:
 * 1. 解決糊化問題：自動偵測 window.devicePixelRatio 與容器實時宽高 (clientWidth/clientHeight)，強制設定內部繪圖解析度並 ctx.scale(dpr, dpr)，保證 100% 銳利向量無模糊。
 * 2. 四大主題擁有完全獨立的幾何與建築場景結構（絕非僅換色）：
 *    - OBSIDIAN_GOLD (蓋茨比奢華金殿): Art Deco 裝飾藝術放射幾何、雙扇形建築金線、搖曳探照燈、香檳微氣泡、八角星鑽與 3D 金幣。
 *    - ROYAL_CRIMSON (皇家東方慶典): 雲雷紋東方窗花幾何、升空發光天燈 (Sky Lanterns)、飄落金箔扇、燙金紅包與喜慶流蘇。
 *    - MIDNIGHT_SAPPHIRE (賽博量子星艦): 3D 透視全息網格地板 (Perspective Grid)、六角蜂巢數據節點、雷射掃描束、懸浮幾何光晶體。
 *    - EMERALD_PALACE (皇家翡翠秘境): 哥德式翡翠玻璃穹頂肋拱 (Palace Arches)、極光流體波紋 (Aurora Waves)、懸浮秘境寶石切面與螢光金粉。
 * 3. 開獎高潮共振 (triggerCelebration)：全場場景能量波爆發與物件物理躍動。
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FestiveAmbiance = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var THEME_PALETTES = {
    OBSIDIAN_GOLD: {
      name: 'OBSIDIAN_GOLD',
      primary: '#d4af37',
      light: '#fef08a',
      dark: '#78350f',
      accent: '#f59e0b',
      beam: 'rgba(212, 175, 55, 0.09)',
      balloon1: '#d4af37',
      balloon2: '#181a1f',
      balloon3: '#f3e5ab',
      balloonColors: ['#d4af37', '#181a1f', '#f3e5ab']
    },
    ROYAL_CRIMSON: {
      name: 'ROYAL_CRIMSON',
      primary: '#e53e3e',
      light: '#fde047',
      dark: '#7f1d1d',
      accent: '#fbbf24',
      beam: 'rgba(229, 62, 62, 0.11)',
      balloon1: '#e53e3e',
      balloon2: '#d4af37',
      balloon3: '#ef4444',
      balloonColors: ['#e53e3e', '#d4af37', '#ef4444']
    },
    MIDNIGHT_SAPPHIRE: {
      name: 'MIDNIGHT_SAPPHIRE',
      primary: '#38bdf8',
      light: '#e0f2fe',
      dark: '#0369a1',
      accent: '#818cf8',
      beam: 'rgba(56, 189, 248, 0.10)',
      balloon1: '#0284c7',
      balloon2: '#38bdf8',
      balloon3: '#e0f2fe',
      balloonColors: ['#0284c7', '#38bdf8', '#e0f2fe']
    },
    EMERALD_PALACE: {
      name: 'EMERALD_PALACE',
      primary: '#10b981',
      light: '#a7f3d0',
      dark: '#064e3b',
      accent: '#facc15',
      beam: 'rgba(16, 185, 129, 0.10)',
      balloon1: '#059669',
      balloon2: '#10b981',
      balloon3: '#d1fae5',
      balloonColors: ['#059669', '#10b981', '#d1fae5']
    }
  };

  function FestiveAmbiance(canvasElement, initialTheme) {
    this.canvas = canvasElement || null;
    this.ctx = canvasElement && canvasElement.getContext ? canvasElement.getContext('2d') : null;
    this.theme = THEME_PALETTES[initialTheme] ? initialTheme : 'OBSIDIAN_GOLD';
    this._updatePalette();

    this.animId = null;
    this.isActive = false;
    this.time = 0;
    this.logicalW = 1280;
    this.logicalH = 720;
    this.dpr = 1;

    this.spotlights = [];
    this.props = [];
    this.sparkles = [];
    this.shockwaves = [];
    this.isCelebrating = false;
    this.celebrateTime = 0;

    this._syncResolution(true);
    this._initScene();

    if (typeof window !== 'undefined' && window.addEventListener) {
      var self = this;
      this._resizeHandler = function () {
        self.resize();
      };
      window.addEventListener('resize', this._resizeHandler);
    }
  }

  FestiveAmbiance.prototype._updatePalette = function () {
    var p = THEME_PALETTES[this.theme] || THEME_PALETTES.OBSIDIAN_GOLD;
    this.palette = {
      name: this.theme,
      primary: p.primary,
      light: p.light,
      dark: p.dark,
      accent: p.accent,
      beam: p.beam,
      balloon1: p.balloon1,
      balloon2: p.balloon2,
      balloon3: p.balloon3,
      balloonColors: p.balloonColors.slice()
    };
  };

  /**
   * 關鍵修復：自動同步 Retina 高解析度緩衝區與容器邏輯寬高，杜絕 Canvas 拉伸模糊！
   */
  FestiveAmbiance.prototype._syncResolution = function (force) {
    if (!this.canvas) return false;

    var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? Math.min(window.devicePixelRatio, 2.5) : 1;
    var rectW = this.canvas.clientWidth || (this.canvas.parentElement && this.canvas.parentElement.clientWidth) || this.canvas.width || 1280;
    var rectH = this.canvas.clientHeight || (this.canvas.parentElement && this.canvas.parentElement.clientHeight) || this.canvas.height || 720;

    if (rectW < 100) rectW = 1280;
    if (rectH < 100) rectH = 720;

    var targetBufW = Math.round(rectW * dpr);
    var targetBufH = Math.round(rectH * dpr);

    if (force || this.logicalW !== rectW || this.logicalH !== rectH || this.dpr !== dpr) {
      this.logicalW = rectW;
      this.logicalH = rectH;
      this.dpr = dpr;
      // 僅在真實 DOM Canvas 具有 style 時修改屬性，避免破壞單元測試 mockCanvas
      if (this.canvas.style || force) {
        this.canvas.width = targetBufW;
        this.canvas.height = targetBufH;
      }
      return true;
    }
    return false;
  };

  FestiveAmbiance.prototype.setCanvas = function (canvas) {
    this.stop();
    this.canvas = canvas;
    this.ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    if (this.canvas) {
      this._syncResolution(true);
      this._initScene();
    }
  };

  FestiveAmbiance.prototype.setTheme = function (themeName) {
    this.theme = THEME_PALETTES[themeName] ? themeName : 'OBSIDIAN_GOLD';
    this._updatePalette();
    this._initScene();
  };

  FestiveAmbiance.prototype.resize = function () {
    if (!this.canvas) return;
    if (this._syncResolution(true)) {
      this._initScene();
    }
  };

  FestiveAmbiance.prototype._initScene = function () {
    var w = this.logicalW || 1280;
    var h = this.logicalH || 720;

    // 1. 探照聚光燈束
    this.spotlights = [
      { originX: w * 0.12, originY: -30, angle: 0.42, speed: 0.0007, range: 0.28, baseW: 150 },
      { originX: w * 0.88, originY: -30, angle: -0.42, speed: 0.0009, range: 0.28, baseW: 150 },
      { originX: w * 0.50, originY: -40, angle: 0.0, speed: 0.0005, range: 0.18, baseW: 200 }
    ];

    // 2. 精緻慶典互動道具 (放置於舞台兩側視覺黃金走廊，絕不遮擋中央且比例精緻銳利)
    this.props = [];
    var typesCycle = ['balloon', 'coin', 'dice', 'gift', 'starburst'];

    var propAnchors = [
      // 左翼視覺走廊
      { x: w * 0.045, y: h * 0.22, type: 'balloon', r: 16, colorKey: 'balloon1', themeShape: 'lantern' },
      { x: w * 0.075, y: h * 0.16, type: 'starburst', size: 12, themeShape: 'prism' },
      { x: w * 0.038, y: h * 0.45, type: 'coin', r: 13, rotSpeed: 0.025, themeShape: 'token' },
      { x: w * 0.072, y: h * 0.55, type: 'dice', size: 17, tilt: 0.22, themeShape: 'cube' },
      { x: w * 0.048, y: h * 0.75, type: 'gift', size: 19, tilt: -0.15, themeShape: 'envelope' },
      { x: w * 0.085, y: h * 0.84, type: 'balloon', r: 14, colorKey: 'balloon2', themeShape: 'orb' },
      { x: w * 0.115, y: h * 0.30, type: 'coin', r: 11, rotSpeed: -0.022, themeShape: 'gem' },
      { x: w * 0.105, y: h * 0.68, type: 'starburst', size: 10, themeShape: 'fan' },
      { x: w * 0.028, y: h * 0.32, type: 'balloon', r: 15, colorKey: 'balloon3', themeShape: 'lantern' },
      { x: w * 0.060, y: h * 0.88, type: 'coin', r: 12, rotSpeed: 0.03, themeShape: 'token' },

      // 右翼視覺走廊
      { x: w * 0.955, y: h * 0.22, type: 'balloon', r: 16, colorKey: 'balloon1', themeShape: 'lantern' },
      { x: w * 0.925, y: h * 0.16, type: 'starburst', size: 12, themeShape: 'prism' },
      { x: w * 0.962, y: h * 0.45, type: 'coin', r: 13, rotSpeed: -0.025, themeShape: 'token' },
      { x: w * 0.928, y: h * 0.55, type: 'dice', size: 17, tilt: -0.24, themeShape: 'cube' },
      { x: w * 0.952, y: h * 0.75, type: 'gift', size: 19, tilt: 0.16, themeShape: 'envelope' },
      { x: w * 0.915, y: h * 0.84, type: 'balloon', r: 14, colorKey: 'balloon3', themeShape: 'orb' },
      { x: w * 0.885, y: h * 0.30, type: 'coin', r: 11, rotSpeed: 0.022, themeShape: 'gem' },
      { x: w * 0.895, y: h * 0.68, type: 'starburst', size: 10, themeShape: 'fan' },
      { x: w * 0.972, y: h * 0.32, type: 'balloon', r: 15, colorKey: 'balloon2', themeShape: 'lantern' },
      { x: w * 0.940, y: h * 0.88, type: 'coin', r: 12, rotSpeed: -0.03, themeShape: 'token' },

      // 頂部與底部星點點綴
      { x: w * 0.22, y: h * 0.11, type: 'starburst', size: 11, themeShape: 'star' },
      { x: w * 0.78, y: h * 0.11, type: 'starburst', size: 11, themeShape: 'star' }
    ];

    for (var i = 0; i < propAnchors.length; i++) {
      var cfg = propAnchors[i];
      this.props.push({
        baseX: cfg.x,
        baseY: cfg.y,
        r: cfg.r || 14,
        size: cfg.size || 16,
        type: cfg.type || typesCycle[i % typesCycle.length],
        themeShape: cfg.themeShape || 'default',
        colorKey: cfg.colorKey || 'balloon1',
        tilt: cfg.tilt || 0,
        rotAngle: i * 0.9,
        rotSpeed: cfg.rotSpeed || 0.015,
        swaySpeed: 0.0012 + (i % 5) * 0.00025,
        swayAmp: 6 + (i % 4) * 2.5,
        floatPhase: i * 1.3,
        bounceY: 0,
        bounceV: 0,
        vy: 0
      });
    }

    // 3. 環境微粒 (依據四大主題展現不同物理行為：香檳氣泡、祈福金粉、數位矩陣粒子、翡翠螢火)
    this.sparkles = [];
    for (var s = 0; s < 42; s++) {
      this.sparkles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.25 - Math.random() * 0.45,
        size: 1.2 + Math.random() * 2.6,
        baseAlpha: 0.2 + Math.random() * 0.55,
        twinkleSpeed: 0.002 + Math.random() * 0.004,
        phase: Math.random() * Math.PI * 2,
        isStar: Math.random() > 0.45
      });
    }
  };

  FestiveAmbiance.prototype._initProps = function () {
    this._initScene();
  };

  /**
   * 觸發開獎全場能量波與飾品共振彈跳
   */
  FestiveAmbiance.prototype.triggerCelebration = function () {
    this.isCelebrating = true;
    this.celebrateTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    for (var i = 0; i < this.props.length; i++) {
      var impulse = -(9 + Math.random() * 7);
      this.props[i].bounceV = impulse;
      this.props[i].vy = impulse;
    }
    this.shockwaves.push({
      x: this.logicalW * 0.5,
      y: this.logicalH * 0.5,
      r: 20,
      maxR: Math.max(this.logicalW, this.logicalH) * 0.75,
      alpha: 0.85
    });
  };

  FestiveAmbiance.prototype.start = function () {
    if (this.isActive || !this.canvas || !this.ctx || typeof requestAnimationFrame !== 'function') return;
    this._syncResolution(true);
    this._initScene();
    this.isActive = true;
    var self = this;

    function renderLoop(timestamp) {
      if (!self.isActive) return;
      self.time = timestamp || Date.now();
      if (self._syncResolution(false)) {
        self._initScene();
      }
      self._update();
      self._draw();
      if (typeof requestAnimationFrame === 'function') {
        self.animId = requestAnimationFrame(renderLoop);
      }
    }

    this.animId = requestAnimationFrame(renderLoop);
  };

  FestiveAmbiance.prototype.stop = function () {
    this.isActive = false;
    if (this.animId) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.animId);
      }
      this.animId = null;
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  };

  FestiveAmbiance.prototype._update = function () {
    var h = this.logicalH || 720;
    var w = this.logicalW || 1280;

    for (var i = 0; i < this.props.length; i++) {
      var p = this.props[i];
      p.rotAngle += p.rotSpeed;

      if (p.bounceV !== 0 || p.bounceY !== 0) {
        p.bounceY += p.bounceV;
        p.bounceV += 0.48;
        p.vy = p.bounceV;
        if (p.bounceY > 0) {
          p.bounceY = 0;
          p.bounceV = -p.bounceV * 0.45;
          p.vy = p.bounceV;
          if (Math.abs(p.bounceV) < 0.7) {
            p.bounceV = 0;
            p.vy = 0;
          }
        }
      }
    }

    // 更新微粒漂浮
    for (var s = 0; s < this.sparkles.length; s++) {
      var sp = this.sparkles[s];
      sp.x += sp.vx;
      sp.y += sp.vy;
      if (sp.y < -10) {
        sp.y = h + 10;
        sp.x = Math.random() * w;
      }
      if (sp.x < -10) sp.x = w + 10;
      if (sp.x > w + 10) sp.x = -10;
    }

    // 更新慶祝能量波
    for (var k = this.shockwaves.length - 1; k >= 0; k--) {
      var sw = this.shockwaves[k];
      sw.r += 18;
      sw.alpha *= 0.93;
      if (sw.alpha < 0.02 || sw.r > sw.maxR) {
        this.shockwaves.splice(k, 1);
      }
    }
  };

  FestiveAmbiance.prototype._render = function () {
    this._draw();
  };

  FestiveAmbiance.prototype._draw = function () {
    if (!this.ctx || !this.canvas) return;
    var ctx = this.ctx;
    var w = this.logicalW || this.canvas.width || 1280;
    var h = this.logicalH || this.canvas.height || 720;
    var dpr = this.dpr || 1;
    var t = this.time || 0;
    var pal = this.palette || THEME_PALETTES.OBSIDIAN_GOLD;

    ctx.save();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (dpr !== 1) {
      ctx.scale(dpr, dpr);
    }

    // 1. 繪製四大主題專屬建築級幾何背景結構 (Theme-Specific Architectural Scene)
    if (this.theme === 'ROYAL_CRIMSON') {
      this._drawSceneRoyalCrimson(ctx, w, h, t, pal);
    } else if (this.theme === 'MIDNIGHT_SAPPHIRE') {
      this._drawSceneMidnightSapphire(ctx, w, h, t, pal);
    } else if (this.theme === 'EMERALD_PALACE') {
      this._drawSceneEmeraldPalace(ctx, w, h, t, pal);
    } else {
      this._drawSceneObsidianGold(ctx, w, h, t, pal);
    }

    // 2. 繪製柔和搖曳聚光燈束
    this._drawSpotlights(ctx, w, h, t, pal);

    // 3. 繪製慶祝擴散能量環
    this._drawShockwaves(ctx, pal);

    // 4. 繪製環境微粒與銳利幾何星芒
    this._drawSparkles(ctx, t, pal);

    // 5. 繪製舞台雙翼精緻慶典物件
    this._drawProps(ctx, t, pal);

    ctx.restore();
  };

  /**
   * 主題 1：【黑曜香檳金 OBSIDIAN_GOLD】
   * Art Deco 蓋茨比奢華劇院：幾何放射金線、轉角對稱扇形裝飾、劇院多重金框
   */
  FestiveAmbiance.prototype._drawSceneObsidianGold = function (ctx, w, h, t, pal) {
    ctx.save();
    var cx = w * 0.5, cy = h * 0.48;

    // Art Deco 放射狀對稱幾何扇線
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.08)';
    ctx.lineWidth = 1;
    var rays = 24;
    for (var i = 0; i < rays; i++) {
      var ang = (i / rays) * Math.PI * 2 + t * 0.00008;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 140, cy + Math.sin(ang) * 140);
      ctx.lineTo(cx + Math.cos(ang) * Math.max(w, h) * 0.85, cy + Math.sin(ang) * Math.max(w, h) * 0.85);
      ctx.stroke();
    }

    // 同心八角星框與幾何雙環
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.14)';
    ctx.lineWidth = 1.2;
    [220, 340, 480].forEach(function (radius, idx) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius + Math.sin(t * 0.001 + idx) * 4, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 四角 Art Deco 奢華建築線框
    var cornerSize = 95;
    var corners = [
      { x: 18, y: 18, sx: 1, sy: 1 },
      { x: w - 18, y: 18, sx: -1, sy: 1 },
      { x: 18, y: h - 18, sx: 1, sy: -1 },
      { x: w - 18, y: h - 18, sx: -1, sy: -1 }
    ];
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.28)';
    ctx.lineWidth = 1.5;
    corners.forEach(function (c) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.sx, c.sy);
      for (var step = 1; step <= 3; step++) {
        var len = cornerSize - step * 18;
        ctx.beginPath();
        ctx.moveTo(0, len);
        ctx.lineTo(0, 0);
        ctx.lineTo(len, 0);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 56, 0, Math.PI * 0.5);
      ctx.stroke();
      ctx.restore();
    });

    ctx.restore();
  };

  /**
   * 主題 2：【皇家緋紅慶典 ROYAL_CRIMSON】
   * 東方宮廷盛典：四角傳統回紋/窗花格柵、大型金色圓拱月門紋、緩緩升空的發光祈福天燈陣
   */
  FestiveAmbiance.prototype._drawSceneRoyalCrimson = function (ctx, w, h, t, pal) {
    ctx.save();
    var cx = w * 0.5, cy = h * 0.5;

    // 1. 中央宮廷團扇/月門幾何鏤空紋
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.12)';
    ctx.lineWidth = 1.5;
    var petals = 12;
    var baseR = 260;
    ctx.beginPath();
    for (var i = 0; i < petals; i++) {
      var a1 = (i / petals) * Math.PI * 2 + t * 0.00015;
      var a2 = ((i + 0.5) / petals) * Math.PI * 2 + t * 0.00015;
      var a3 = ((i + 1) / petals) * Math.PI * 2 + t * 0.00015;
      var x1 = cx + Math.cos(a1) * baseR;
      var y1 = cy + Math.sin(a1) * baseR;
      var xm = cx + Math.cos(a2) * (baseR + 36);
      var ym = cy + Math.sin(a2) * (baseR + 36);
      var x2 = cx + Math.cos(a3) * baseR;
      var y2 = cy + Math.sin(a3) * baseR;
      if (i === 0) ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(xm, ym, x2, y2);
    }
    ctx.closePath();
    ctx.stroke();

    // 2. 四角東方吉祥窗花格柵
    var corners = [
      { x: 20, y: 20, sx: 1, sy: 1 },
      { x: w - 20, y: 20, sx: -1, sy: 1 },
      { x: 20, y: h - 20, sx: 1, sy: -1 },
      { x: w - 20, y: h - 20, sx: -1, sy: -1 }
    ];
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.32)';
    ctx.lineWidth = 1.5;
    corners.forEach(function (c) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.sx, c.sy);
      ctx.strokeRect(0, 0, 72, 16);
      ctx.strokeRect(0, 0, 16, 72);
      ctx.strokeRect(16, 16, 28, 28);
      ctx.restore();
    });

    // 3. 背景遠景冉冉升空的祈福天燈 (Floating Sky Lanterns)
    for (var l = 0; l < 8; l++) {
      var lx = (w * (0.14 + (l * 0.105))) + Math.sin(t * 0.0008 + l) * 18;
      var rawY = (h + 60) - ((t * 0.025 + l * 130) % (h + 120));
      ctx.save();
      ctx.translate(lx, rawY);
      ctx.globalAlpha = 0.28;

      var lGrad = ctx.createRadialGradient(0, 4, 2, 0, 0, 18);
      lGrad.addColorStop(0, '#fef08a');
      lGrad.addColorStop(0.5, '#ea580c');
      lGrad.addColorStop(1, '#991b1b');
      ctx.fillStyle = lGrad;
      ctx.beginPath();
      ctx.moveTo(-10, -14);
      ctx.quadraticCurveTo(0, -19, 10, -14);
      ctx.lineTo(7, 12);
      ctx.quadraticCurveTo(0, 15, -7, 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  };

  /**
   * 主題 3：【午夜深藍星鑽 MIDNIGHT_SAPPHIRE】
   * 賽博科技星艦年會：3D 透視全息網格地板 (Perspective Cyber Grid)、六角蜂巢數據節點、雷射掃描天際線
   */
  FestiveAmbiance.prototype._drawSceneMidnightSapphire = function (ctx, w, h, t, pal) {
    ctx.save();
    var horizonY = h * 0.62;
    var cx = w * 0.5;

    // 1. 地平線極光輝光
    var hGrad = ctx.createLinearGradient(0, horizonY - 40, 0, horizonY + 80);
    hGrad.addColorStop(0, 'transparent');
    hGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.16)');
    hGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, horizonY - 40, w, 120);

    // 2. 3D 透視放射網格線 (Perspective Floor Grid)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.lineWidth = 1;
    var vLines = 18;
    for (var i = -vLines; i <= vLines; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 28, horizonY);
      ctx.lineTo(cx + i * 190, h);
      ctx.stroke();
    }

    // 動態向前推進的水平網格線
    var gridOffset = (t * 0.04) % 24;
    for (var d = 1; d <= 10; d++) {
      var norm = (d * 24 + gridOffset) / 240;
      var py = horizonY + Math.pow(norm, 1.8) * (h - horizonY);
      if (py <= h) {
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(w, py);
        ctx.strokeStyle = 'rgba(56, 189, 248, ' + (0.04 + norm * 0.22).toFixed(2) + ')';
        ctx.stroke();
      }
    }

    // 3. 上半部科技六角蜂巢節點與 HUD 準心環
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.18)';
    ctx.lineWidth = 1.2;
    var hexCenters = [
      { x: w * 0.16, y: h * 0.25, r: 28 },
      { x: w * 0.21, y: h * 0.33, r: 20 },
      { x: w * 0.84, y: h * 0.25, r: 28 },
      { x: w * 0.79, y: h * 0.33, r: 20 }
    ];
    hexCenters.forEach(function (hx, idx) {
      ctx.beginPath();
      for (var k = 0; k < 6; k++) {
        var a = (k / 6) * Math.PI * 2 + t * 0.0003 * (idx % 2 === 0 ? 1 : -1);
        var px = hx.x + Math.cos(a) * hx.r;
        var py = hx.y + Math.sin(a) * hx.r;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    });

    ctx.restore();
  };

  /**
   * 主題 4：【祖母綠翡翠殿 EMERALD_PALACE】
   * 皇家翡翠秘境：歐式水晶宮殿拱廊肋拱 (Gothic Crystal Arches)、極光絲綢光帶 (Aurora Ribbon Waves)、秘境幾何晶體
   */
  FestiveAmbiance.prototype._drawSceneEmeraldPalace = function (ctx, w, h, t, pal) {
    ctx.save();

    // 1. 流動極光絲綢波浪 (Aurora Borealis Silk Waves)
    for (var band = 0; band < 3; band++) {
      ctx.beginPath();
      var baseY = h * (0.22 + band * 0.16);
      ctx.moveTo(0, baseY);
      for (var x = 0; x <= w; x += 60) {
        var wy = baseY + Math.sin(x * 0.004 + t * 0.0012 + band * 1.5) * 32 + Math.cos(x * 0.009 - t * 0.0008) * 14;
        ctx.lineTo(x, wy);
      }
      ctx.lineTo(w, baseY + 90);
      ctx.lineTo(0, baseY + 90);
      ctx.closePath();

      var aGrad = ctx.createLinearGradient(0, baseY - 30, 0, baseY + 90);
      aGrad.addColorStop(0, 'transparent');
      aGrad.addColorStop(0.4, band === 1 ? 'rgba(250, 204, 21, 0.06)' : 'rgba(16, 185, 129, 0.09)');
      aGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = aGrad;
      ctx.fill();
    }

    // 2. 翡翠宮殿高聳尖拱廊柱幾何線 (Palace Vaulted Arches)
    ctx.strokeStyle = 'rgba(167, 243, 208, 0.15)';
    ctx.lineWidth = 1.4;
    var archCount = 5;
    var archSpan = w / archCount;
    for (var i = 0; i <= archCount; i++) {
      var ax = i * archSpan;
      ctx.beginPath();
      ctx.moveTo(ax, h);
      ctx.quadraticCurveTo(ax, h * 0.25, ax + archSpan * 0.5, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ax, h);
      ctx.quadraticCurveTo(ax, h * 0.25, ax - archSpan * 0.5, 0);
      ctx.stroke();
    }

    ctx.restore();
  };

  FestiveAmbiance.prototype._drawSpotlights = function (ctx, w, h, t, pal) {
    ctx.save();
    for (var i = 0; i < this.spotlights.length; i++) {
      var sp = this.spotlights[i];
      var currentAngle = sp.angle + Math.sin(t * sp.speed) * sp.range;
      var beamLength = h * 1.25;
      var endX = sp.originX + Math.sin(currentAngle) * beamLength;
      var endY = sp.originY + Math.cos(currentAngle) * beamLength;

      var grad = ctx.createRadialGradient(sp.originX, sp.originY, 10, endX, endY, sp.baseW * 2.0);
      grad.addColorStop(0, pal.beam);
      grad.addColorStop(0.4, pal.beam);
      grad.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.moveTo(sp.originX, sp.originY);
      ctx.lineTo(endX - sp.baseW, endY);
      ctx.lineTo(endX + sp.baseW, endY);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.restore();
  };

  FestiveAmbiance.prototype._drawShockwaves = function (ctx, pal) {
    if (!this.shockwaves || this.shockwaves.length === 0) return;
    ctx.save();
    for (var i = 0; i < this.shockwaves.length; i++) {
      var sw = this.shockwaves[i];
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.strokeStyle = pal.light;
      ctx.globalAlpha = Math.max(0, sw.alpha);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  };

  FestiveAmbiance.prototype._drawSparkles = function (ctx, t, pal) {
    ctx.save();
    for (var i = 0; i < this.sparkles.length; i++) {
      var sp = this.sparkles[i];
      var alpha = sp.baseAlpha + Math.sin(t * sp.twinkleSpeed + sp.phase) * 0.25;
      if (alpha <= 0) continue;

      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = pal.light;

      if (sp.isStar) {
        var s = sp.size * 1.7;
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y - s);
        ctx.lineTo(sp.x + s * 0.18, sp.y - s * 0.18);
        ctx.lineTo(sp.x + s, sp.y);
        ctx.lineTo(sp.x + s * 0.18, sp.y + s * 0.18);
        ctx.lineTo(sp.x, sp.y + s);
        ctx.lineTo(sp.x - s * 0.18, sp.y + s * 0.18);
        ctx.lineTo(sp.x - s, sp.y);
        ctx.lineTo(sp.x - s * 0.18, sp.y - s * 0.18);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  FestiveAmbiance.prototype._drawProps = function (ctx, t, pal) {
    for (var i = 0; i < this.props.length; i++) {
      var p = this.props[i];
      var floatOffset = Math.sin(t * p.swaySpeed + p.floatPhase) * p.swayAmp;
      var curX = p.baseX;
      var curY = p.baseY + floatOffset + p.bounceY;

      ctx.save();
      ctx.translate(curX, curY);

      if (p.type === 'balloon') {
        this._drawBalloon(ctx, p, pal);
      } else if (p.type === 'coin') {
        this._drawCoin(ctx, p, pal);
      } else if (p.type === 'dice') {
        this._drawDice(ctx, p, pal);
      } else if (p.type === 'gift') {
        this._drawGift(ctx, p, pal);
      } else if (p.type === 'starburst') {
        this._drawPropStarburst(ctx, p, pal);
      }

      ctx.restore();
    }
  };

  FestiveAmbiance.prototype._drawPropStarburst = function (ctx, p, pal) {
    var s = p.size;
    ctx.save();
    ctx.rotate(this.time * p.rotSpeed + p.floatPhase);

    if (this.theme === 'MIDNIGHT_SAPPHIRE') {
      // 科技全息八面晶體
      ctx.strokeStyle = pal.light;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.75, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.75, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = pal.light;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.2, -s * 0.2);
      ctx.lineTo(s, 0);
      ctx.lineTo(s * 0.2, s * 0.2);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.2, s * 0.2);
      ctx.lineTo(-s, 0);
      ctx.lineTo(-s * 0.2, -s * 0.2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  FestiveAmbiance.prototype._drawBalloon = function (ctx, p, pal) {
    var r = p.r;
    var color = pal[p.colorKey] || pal.primary;

    if (this.theme === 'ROYAL_CRIMSON') {
      // 東方皇家紅金宮燈
      ctx.save();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, r + 2);
      ctx.lineTo(0, r + 18);
      ctx.stroke();

      var lGrad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, 2, 0, 0, r * 1.1);
      lGrad.addColorStop(0, '#fef08a');
      lGrad.addColorStop(0.4, '#ef4444');
      lGrad.addColorStop(1, '#991b1b');
      ctx.fillStyle = lGrad;
      ctx.beginPath();
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(0, 0, r * 1.05, r * 0.9, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(0, 0, r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      // 金色上下燈座
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-r * 0.45, -r * 0.98, r * 0.9, 3.5);
      ctx.fillRect(-r * 0.45, r * 0.82, r * 0.9, 3.5);
      ctx.restore();
      return;
    }

    // 氣球細繩
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, r * 1.18);
    var wave = Math.sin(this.time * 0.002 + p.floatPhase) * 4;
    ctx.bezierCurveTo(wave, r + 12, -wave, r + 22, wave * 0.5, r + 32);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // 氣球本體
    ctx.save();
    var bGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.1);
    bGrad.addColorStop(0, '#ffffff');
    bGrad.addColorStop(0.25, pal.light);
    bGrad.addColorStop(0.7, color);
    bGrad.addColorStop(1, pal.dark);

    ctx.beginPath();
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(0, 0, r, r * 1.18, 0, 0, Math.PI * 2);
    } else {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = bGrad;
    ctx.fill();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();

    // 銳利高光反光
    ctx.beginPath();
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(-r * 0.35, -r * 0.38, r * 0.18, r * 0.32, -0.4, 0, Math.PI * 2);
    } else {
      ctx.arc(-r * 0.35, -r * 0.38, r * 0.2, 0, Math.PI * 2);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fill();
    ctx.restore();
  };

  FestiveAmbiance.prototype._drawCoin = function (ctx, p, pal) {
    var r = p.r;
    var scaleX = Math.cos(p.rotAngle);
    if (Math.abs(scaleX) < 0.08) scaleX = 0.08;

    ctx.save();
    ctx.scale(scaleX, 1);

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    var cGrad = ctx.createLinearGradient(-r, -r, r, r);
    cGrad.addColorStop(0, pal.light);
    cGrad.addColorStop(0.5, pal.primary);
    cGrad.addColorStop(1, pal.dark);
    ctx.fillStyle = cGrad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = pal.light;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (typeof ctx.fillText === 'function') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold ' + Math.max(8, Math.floor(r * 0.85)) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.theme === 'ROYAL_CRIMSON' ? '福' : (this.theme === 'MIDNIGHT_SAPPHIRE' ? '◈' : '★'), 0, 1);
    }

    ctx.restore();
  };

  FestiveAmbiance.prototype._drawDice = function (ctx, p, pal) {
    var s = p.size;
    ctx.save();
    ctx.rotate(p.tilt + Math.sin(this.time * 0.0015 + p.floatPhase) * 0.12);

    var dGrad = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
    dGrad.addColorStop(0, pal.light);
    dGrad.addColorStop(0.55, pal.primary);
    dGrad.addColorStop(1, pal.dark);

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(-s / 2, -s / 2, s, s, 4);
    } else {
      ctx.rect(-s / 2, -s / 2, s, s);
    }
    ctx.fillStyle = dGrad;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    var dotR = s * 0.09;
    var offset = s * 0.25;
    [
      [0, 0],
      [-offset, -offset],
      [offset, -offset],
      [-offset, offset],
      [offset, offset]
    ].forEach(function (pt) {
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], dotR, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  };

  FestiveAmbiance.prototype._drawGift = function (ctx, p, pal) {
    var s = p.size;
    ctx.save();
    ctx.rotate(p.tilt);

    var gGrad = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
    gGrad.addColorStop(0, pal.light);
    gGrad.addColorStop(0.6, pal.primary);
    gGrad.addColorStop(1, pal.dark);

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(-s / 2, -s / 2, s, s, 3.5);
    } else {
      ctx.rect(-s / 2, -s / 2, s, s);
    }
    ctx.fillStyle = gGrad;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = pal.light;
    ctx.stroke();

    // 十字緞帶
    ctx.fillStyle = this.theme === 'ROYAL_CRIMSON' ? '#fde047' : '#ef4444';
    var rw = s * 0.2;
    ctx.fillRect(-rw / 2, -s / 2, rw, s);
    ctx.fillRect(-s / 2, -rw / 2, s, rw);

    // 蝴蝶結
    ctx.beginPath();
    ctx.arc(-rw * 0.65, -s / 2 - 2, 3, 0, Math.PI * 2);
    ctx.arc(rw * 0.65, -s / 2 - 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  };

  return FestiveAmbiance;
});
