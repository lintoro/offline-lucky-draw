/**
 * 純前端單檔離線抽獎 Web 應用 - 歡樂慶典派對背景與浮動飾品系統 (Festive Ambiance)
 * 規格版本: v1.3.0
 * 
 * 特色:
 * - 舞池柔和搖曳聚光燈束 (Swaying Spotlights)
 * - 隨機歡樂慶典飾品: 🎈 金屬光澤氣球、🪙 3D旋轉金幣、🎲 幸運金骰子、🎁 金緞帶禮盒、✨ 閃爍十字星芒
 * - 4 大主題配色自動響應
 * - 開獎高潮興奮彈跳共鳴 (Celebration Bounce & Props Burst)
 * - 零外部圖片、純 Canvas 2D 數學繪圖、60 FPS 極致效能防洩漏
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
      primary: '#d4af37',
      light: '#fef08a',
      dark: '#aa820a',
      accent: '#f59e0b',
      beam: 'rgba(212, 175, 55, 0.12)',
      balloon1: '#d4af37',
      balloon2: '#181a1f',
      balloon3: '#f3e5ab'
    },
    ROYAL_CRIMSON: {
      primary: '#e53e3e',
      light: '#fecaca',
      dark: '#991b1b',
      accent: '#fbbf24',
      beam: 'rgba(229, 62, 62, 0.13)',
      balloon1: '#e53e3e',
      balloon2: '#d4af37',
      balloon3: '#ef4444'
    },
    MIDNIGHT_SAPPHIRE: {
      primary: '#38bdf8',
      light: '#bae6fd',
      dark: '#0369a1',
      accent: '#818cf8',
      beam: 'rgba(56, 189, 248, 0.12)',
      balloon1: '#0284c7',
      balloon2: '#38bdf8',
      balloon3: '#e0f2fe'
    },
    EMERALD_PALACE: {
      primary: '#10b981',
      light: '#a7f3d0',
      dark: '#047857',
      accent: '#facc15',
      beam: 'rgba(16, 185, 129, 0.12)',
      balloon1: '#059669',
      balloon2: '#10b981',
      balloon3: '#d1fae5'
    }
  };

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
      balloonColors: [p.balloon1, p.balloon2, p.balloon3]
    };
  };

  function FestiveAmbiance(canvasElement, initialTheme) {
    this.canvas = canvasElement || null;
    this.ctx = canvasElement && canvasElement.getContext ? canvasElement.getContext('2d') : null;
    this.theme = THEME_PALETTES[initialTheme] ? initialTheme : 'OBSIDIAN_GOLD';
    this._updatePalette();
    this.animId = null;
    this.isActive = false;
    this.time = 0;

    this.spotlights = [];
    this.props = [];
    this.sparkles = [];
    this.isCelebrating = false;
    this.celebrateTime = 0;

    this._initScene();
  }

  FestiveAmbiance.prototype.setCanvas = function (canvas) {
    this.stop();
    this.canvas = canvas;
    this.ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    if (this.canvas) {
      this._initScene();
    }
  };

  FestiveAmbiance.prototype.setTheme = function (themeName) {
    this.theme = THEME_PALETTES[themeName] ? themeName : 'OBSIDIAN_GOLD';
    this._updatePalette();
  };

  FestiveAmbiance.prototype._initScene = function () {
    var w = (this.canvas && this.canvas.width) ? this.canvas.width : 1200;
    var h = (this.canvas && this.canvas.height) ? this.canvas.height : 800;

    // 1. 舞池聚光燈光束
    this.spotlights = [
      { originX: w * 0.15, originY: -40, angle: 0.5, speed: 0.0008, range: 0.35, baseW: 160 },
      { originX: w * 0.85, originY: -40, angle: -0.5, speed: 0.0011, range: 0.38, baseW: 170 },
      { originX: w * 0.50, originY: -50, angle: 0.0, speed: 0.0006, range: 0.25, baseW: 220 }
    ];

    // 2. 歡樂慶典飾品道具
    this.props = [];
    // 兩側氣球
    var balloonConfigs = [
      { x: w * 0.06, y: h * 0.42, r: 24, type: 'balloon', colorKey: 'balloon1', swaySpeed: 0.0015, swayAmp: 14, floatPhase: 0 },
      { x: w * 0.11, y: h * 0.32, r: 20, type: 'balloon', colorKey: 'balloon3', swaySpeed: 0.0019, swayAmp: 12, floatPhase: 1.5 },
      { x: w * 0.08, y: h * 0.65, r: 22, type: 'balloon', colorKey: 'balloon2', swaySpeed: 0.0013, swayAmp: 16, floatPhase: 3.2 },
      { x: w * 0.94, y: h * 0.38, r: 24, type: 'balloon', colorKey: 'balloon1', swaySpeed: 0.0016, swayAmp: 15, floatPhase: 0.8 },
      { x: w * 0.89, y: h * 0.28, r: 19, type: 'balloon', colorKey: 'balloon2', swaySpeed: 0.0020, swayAmp: 11, floatPhase: 2.1 },
      { x: w * 0.92, y: h * 0.62, r: 22, type: 'balloon', colorKey: 'balloon3', swaySpeed: 0.0014, swayAmp: 14, floatPhase: 4.0 }
    ];

    balloonConfigs.forEach(function (cfg) {
      this.props.push({
        baseX: cfg.x,
        baseY: cfg.y,
        r: cfg.r,
        type: 'balloon',
        colorKey: cfg.colorKey,
        swaySpeed: cfg.swaySpeed,
        swayAmp: cfg.swayAmp,
        floatPhase: cfg.floatPhase,
        bounceY: 0,
        bounceV: 0
      });
    }.bind(this));

    // 浮空金幣
    var coinPositions = [
      { x: w * 0.16, y: h * 0.22, r: 15, rotSpeed: 0.024 },
      { x: w * 0.22, y: h * 0.72, r: 14, rotSpeed: -0.028 },
      { x: w * 0.82, y: h * 0.20, r: 16, rotSpeed: 0.022 },
      { x: w * 0.78, y: h * 0.75, r: 15, rotSpeed: -0.025 }
    ];

    coinPositions.forEach(function (pos, idx) {
      this.props.push({
        baseX: pos.x,
        baseY: pos.y,
        r: pos.r,
        type: 'coin',
        rotAngle: idx * 1.2,
        rotSpeed: pos.rotSpeed,
        swaySpeed: 0.0018 + idx * 0.0003,
        swayAmp: 10,
        floatPhase: idx * 1.4,
        bounceY: 0,
        bounceV: 0
      });
    }.bind(this));

    // 幸運金骰子
    var dicePositions = [
      { x: w * 0.18, y: h * 0.48, size: 24, tilt: 0.22 },
      { x: w * 0.84, y: h * 0.50, size: 22, tilt: -0.28 }
    ];

    dicePositions.forEach(function (dp, idx) {
      this.props.push({
        baseX: dp.x,
        baseY: dp.y,
        size: dp.size,
        type: 'dice',
        tilt: dp.tilt,
        swaySpeed: 0.0012 + idx * 0.0005,
        swayAmp: 8,
        floatPhase: idx * 2.5,
        bounceY: 0,
        bounceV: 0
      });
    }.bind(this));

    // 金色緞帶小禮盒
    var giftPositions = [
      { x: w * 0.12, y: h * 0.82, size: 28, tilt: -0.15 },
      { x: w * 0.88, y: h * 0.80, size: 28, tilt: 0.18 }
    ];

    giftPositions.forEach(function (gp, idx) {
      this.props.push({
        baseX: gp.x,
        baseY: gp.y,
        size: gp.size,
        type: 'gift',
        tilt: gp.tilt,
        swaySpeed: 0.0010 + idx * 0.0004,
        swayAmp: 6,
        floatPhase: idx * 1.8,
        bounceY: 0,
        bounceV: 0,
        vy: 0
      });
    }.bind(this));

    // 十字/八角金色星芒飾品
    var starburstPositions = [
      { x: w * 0.28, y: h * 0.18, size: 16, rotSpeed: 0.001 },
      { x: w * 0.72, y: h * 0.16, size: 18, rotSpeed: -0.0012 },
      { x: w * 0.25, y: h * 0.82, size: 14, rotSpeed: 0.0015 },
      { x: w * 0.75, y: h * 0.85, size: 15, rotSpeed: -0.001 },
      { x: w * 0.05, y: h * 0.15, size: 20, rotSpeed: 0.0008 },
      { x: w * 0.95, y: h * 0.15, size: 20, rotSpeed: -0.0008 }
    ];

    starburstPositions.forEach(function (sp, idx) {
      this.props.push({
        baseX: sp.x,
        baseY: sp.y,
        size: sp.size,
        type: 'starburst',
        rotSpeed: sp.rotSpeed,
        swaySpeed: 0.0014 + idx * 0.0003,
        swayAmp: 12,
        floatPhase: idx * 1.1,
        bounceY: 0,
        bounceV: 0,
        vy: 0
      });
    }.bind(this));

    // 3. 散景星光微粒 (Bokeh & Sparkles)
    this.sparkles = [];
    for (var i = 0; i < 32; i++) {
      this.sparkles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 1.5 + Math.random() * 3.5,
        baseAlpha: 0.15 + Math.random() * 0.55,
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
   * 觸發全場狂歡共振 (開獎瞬間飾品興奮彈跳)
   */
  FestiveAmbiance.prototype.triggerCelebration = function () {
    this.isCelebrating = true;
    this.celebrateTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    for (var i = 0; i < this.props.length; i++) {
      var impulse = -(10 + Math.random() * 8);
      this.props[i].bounceV = impulse;
      this.props[i].vy = impulse;
    }
  };

  FestiveAmbiance.prototype.start = function () {
    if (this.isActive || !this.canvas || !this.ctx || typeof requestAnimationFrame !== 'function') return;
    this.isActive = true;
    var self = this;

    function renderLoop(timestamp) {
      if (!self.isActive) return;
      self.time = timestamp;
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
    for (var i = 0; i < this.props.length; i++) {
      var p = this.props[i];
      if (p.type === 'coin') {
        p.rotAngle += p.rotSpeed;
      }
      // 處理慶典彈跳物理
      if (p.bounceV !== 0 || p.bounceY !== 0) {
        p.bounceY += p.bounceV;
        p.bounceV += 0.5; // 重力
        p.vy = p.bounceV;
        if (p.bounceY > 0) {
          p.bounceY = 0;
          p.bounceV = -p.bounceV * 0.45; // 彈跳回彈
          p.vy = p.bounceV;
          if (Math.abs(p.bounceV) < 0.8) {
            p.bounceV = 0;
            p.vy = 0;
          }
        }
      }
    }
  };

  FestiveAmbiance.prototype._render = function () {
    this._draw();
  };

  FestiveAmbiance.prototype._draw = function () {
    if (!this.ctx || !this.canvas) return;
    var ctx = this.ctx;
    var w = this.canvas.width;
    var h = this.canvas.height;
    var t = this.time;
    var pal = THEME_PALETTES[this.theme] || THEME_PALETTES.OBSIDIAN_GOLD;

    ctx.clearRect(0, 0, w, h);

    // 1. 繪製背景搖曳聚光燈 (Spotlights)
    this._drawSpotlights(ctx, w, h, t, pal);

    // 2. 繪製微粒星光散景 (Bokeh & Starbursts)
    this._drawSparkles(ctx, t, pal);

    // 3. 繪製歡樂慶典飾品道具
    this._drawProps(ctx, t, pal);
  };

  FestiveAmbiance.prototype._drawSpotlights = function (ctx, w, h, t, pal) {
    ctx.save();
    for (var i = 0; i < this.spotlights.length; i++) {
      var sp = this.spotlights[i];
      var currentAngle = sp.angle + Math.sin(t * sp.speed) * sp.range;
      var beamLength = h * 1.3;
      var endX = sp.originX + Math.sin(currentAngle) * beamLength;
      var endY = sp.originY + Math.cos(currentAngle) * beamLength;

      var grad = ctx.createRadialGradient(sp.originX, sp.originY, 10, endX, endY, sp.baseW * 2.2);
      grad.addColorStop(0, pal.beam);
      grad.addColorStop(0.35, pal.beam);
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

  FestiveAmbiance.prototype._drawSparkles = function (ctx, t, pal) {
    ctx.save();
    for (var i = 0; i < this.sparkles.length; i++) {
      var sp = this.sparkles[i];
      var alpha = sp.baseAlpha + Math.sin(t * sp.twinkleSpeed + sp.phase) * 0.25;
      if (alpha <= 0) continue;

      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = pal.light;

      if (sp.isStar) {
        // 八角/十字閃爍星芒
        var s = sp.size * 1.8;
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y - s);
        ctx.lineTo(sp.x + s * 0.2, sp.y - s * 0.2);
        ctx.lineTo(sp.x + s, sp.y);
        ctx.lineTo(sp.x + s * 0.2, sp.y + s * 0.2);
        ctx.lineTo(sp.x, sp.y + s);
        ctx.lineTo(sp.x - s * 0.2, sp.y + s * 0.2);
        ctx.lineTo(sp.x - s, sp.y);
        ctx.lineTo(sp.x - s * 0.2, sp.y - s * 0.2);
        ctx.closePath();
        ctx.fill();
      } else {
        // 柔和圓形散景
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
    ctx.fillStyle = pal.light;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.22, -s * 0.22);
    ctx.lineTo(s, 0);
    ctx.lineTo(s * 0.22, s * 0.22);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.22, s * 0.22);
    ctx.lineTo(-s, 0);
    ctx.lineTo(-s * 0.22, -s * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  FestiveAmbiance.prototype._drawBalloon = function (ctx, p, pal) {
    var r = p.r;
    var color = pal[p.colorKey] || pal.primary;

    // 氣球細繩 (微風擺動)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, r + 4);
    var wave = Math.sin(this.time * 0.002 + p.floatPhase) * 6;
    ctx.bezierCurveTo(wave, r + 16, -wave, r + 28, wave * 0.5, r + 44);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // 氣球本體 (橢圓球)
    ctx.save();
    var bGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    bGrad.addColorStop(0, '#ffffff');
    bGrad.addColorStop(0.25, pal.light);
    bGrad.addColorStop(0.7, color);
    bGrad.addColorStop(1, pal.dark);

    ctx.beginPath();
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(0, 0, r, r * 1.22, 0, 0, Math.PI * 2);
    } else {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = bGrad;
    ctx.fill();

    // 高光反光月牙
    ctx.beginPath();
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(-r * 0.38, -r * 0.42, r * 0.28, r * 0.45, -0.4, 0, Math.PI * 2);
    } else {
      ctx.arc(-r * 0.38, -r * 0.42, r * 0.28, 0, Math.PI * 2);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fill();

    // 氣球結
    ctx.beginPath();
    ctx.moveTo(-3, r * 1.2);
    ctx.lineTo(3, r * 1.2);
    ctx.lineTo(0, r * 1.2 + 5);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  };

  FestiveAmbiance.prototype._drawCoin = function (ctx, p, pal) {
    var r = p.r;
    var scaleX = Math.cos(p.rotAngle);
    if (Math.abs(scaleX) < 0.05) return;

    ctx.save();
    ctx.scale(scaleX, 1);

    // 金幣邊緣厚度
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    var cGrad = ctx.createLinearGradient(-r, -r, r, r);
    cGrad.addColorStop(0, pal.light);
    cGrad.addColorStop(0.5, pal.primary);
    cGrad.addColorStop(1, pal.dark);
    ctx.fillStyle = cGrad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = pal.light;
    ctx.stroke();

    // 內圈同心圓
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 中央幸運星星
    if (typeof ctx.fillText === 'function') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold ' + Math.floor(r * 0.9) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', 0, 1);
    }

    ctx.restore();
  };

  FestiveAmbiance.prototype._drawDice = function (ctx, p, pal) {
    var s = p.size;
    ctx.save();
    ctx.rotate(p.tilt);

    // 骰子金屬方塊底
    var dGrad = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
    dGrad.addColorStop(0, '#fef08a');
    dGrad.addColorStop(0.5, pal.primary);
    dGrad.addColorStop(1, '#78350f');

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(-s / 2, -s / 2, s, s, 5);
    } else {
      ctx.rect(-s / 2, -s / 2, s, s);
    }
    ctx.fillStyle = dGrad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = pal.light;
    ctx.stroke();

    // 骰子點數 (繪製經典 5 點)
    ctx.fillStyle = '#ffffff';
    var dotR = s * 0.1;
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

    // 禮盒主體
    var gGrad = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
    gGrad.addColorStop(0, pal.light);
    gGrad.addColorStop(0.6, pal.primary);
    gGrad.addColorStop(1, pal.dark);

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(-s / 2, -s / 2, s, s, 4);
    } else {
      ctx.rect(-s / 2, -s / 2, s, s);
    }
    ctx.fillStyle = gGrad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = pal.light;
    ctx.stroke();

    // 十字緞帶
    ctx.fillStyle = '#ef4444';
    var rw = s * 0.22;
    ctx.fillRect(-rw / 2, -s / 2, rw, s);
    ctx.fillRect(-s / 2, -rw / 2, s, rw);

    // 頂部蝴蝶結
    ctx.beginPath();
    ctx.arc(-rw * 0.6, -s / 2 - 3, 4, 0, Math.PI * 2);
    ctx.arc(rw * 0.6, -s / 2 - 3, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#f87171';
    ctx.fill();

    ctx.restore();
  };

  FestiveAmbiance.prototype.resize = function () {
    if (!this.canvas) return;
    this._initScene();
  };

  return FestiveAmbiance;
});
