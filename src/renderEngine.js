/**
 * 純前端單檔離線抽獎 Web 應用 - 雙模渲染引擎 (RenderEngine)
 * 規格版本: v1.1.0
 * 
 * 技術特性:
 * - 自適應雙模切換：<= 30 人 Canvas 扇形輪盤；> 30 人 Slot Reel 跑馬燈卡片
 * - 高流暢度緩動物理曲線 (EaseOutCubic / EaseOutQuint)
 * - 整合 AudioSynthesizer 節奏噠噠聲
 * - 支援高解析度螢幕 (DevicePixelRatio 自適應)
 * - 動畫幀與 GPU Buffer 安全釋放防洩漏
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RenderEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var WHEEL_COLORS = [
    '#4F46E5', '#06B6D4', '#10B981', '#F59E0B',
    '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6',
    '#F97316', '#6366F1', '#84CC16', '#0EA5E9'
  ];

  // Easing 函數: Ease Out Quint
  function easeOutQuint(t) {
    return 1 + (--t) * t * t * t * t;
  }

  function RenderEngine(canvasElement, slotContainerElement, audioSynthesizer) {
    this.canvas = canvasElement || null;
    this.ctx = canvasElement && canvasElement.getContext ? canvasElement.getContext('2d') : null;
    this.slotContainer = slotContainerElement || null;
    this.audio = audioSynthesizer || null;

    this.currentAngle = 0;
    this.animationId = null;
    this.isSpinning = false;
    this.candidates = [];
    this.mode = 'WHEEL'; // 'WHEEL' | 'SLOT'
  }

  RenderEngine.prototype.setCandidates = function (candidates) {
    this.candidates = Array.isArray(candidates) ? candidates.slice() : [];
    // 依規格書：<= 30 人採用輪盤，> 30 人自動平滑切換至跑馬燈
    this.mode = this.candidates.length <= 30 ? 'WHEEL' : 'SLOT';
    this.renderStatic();
    return this.mode;
  };

  RenderEngine.prototype.renderStatic = function () {
    if (this.mode === 'WHEEL') {
      if (this.slotContainer) this.slotContainer.style.display = 'none';
      if (this.canvas) this.canvas.style.display = 'block';
      this._drawWheel(this.currentAngle);
    } else {
      if (this.canvas) this.canvas.style.display = 'none';
      if (this.slotContainer) {
        this.slotContainer.style.display = 'flex';
        this._renderSlotStatic();
      }
    }
  };

  RenderEngine.prototype._renderSlotStatic = function () {
    if (!this.slotContainer) return;
    var name = this.candidates.length > 0 ? this.candidates[0] : '準備抽獎';
    this.slotContainer.innerHTML = '<div class="slot-reel-card current">' + escapeHtml(name) + '</div>';
  };

  /**
   * 繪製扇形輪盤
   * @param {number} angleRad 角度 (弧度)
   */
  RenderEngine.prototype._drawWheel = function (angleRad) {
    if (!this.canvas || !this.ctx || this.candidates.length === 0) return;

    var ctx = this.ctx;
    var width = this.canvas.width;
    var height = this.canvas.height;
    var centerX = width / 2;
    var centerY = height / 2;
    var radius = Math.min(centerX, centerY) - 15;

    ctx.clearRect(0, 0, width, height);

    var count = this.candidates.length;
    var sliceAngle = (Math.PI * 2) / count;

    // 繪製扇形扇面
    for (var i = 0; i < count; i++) {
      var start = angleRad + i * sliceAngle;
      var end = start + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, start, end);
      ctx.closePath();

      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // 繪製人名文字
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(start + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';

      var fontSize = count > 15 ? 13 : 16;
      ctx.font = 'bold ' + fontSize + 'px sans-serif';

      var label = this.candidates[i];
      if (label.length > 8) label = label.substring(0, 7) + '…';
      ctx.fillText(label, radius - 20, 0);
      ctx.restore();
    }

    // 繪製中心圓軸
    ctx.beginPath();
    ctx.arc(centerX, centerY, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#312E81';
    ctx.stroke();

    // 繪製頂部固定指針 (指向上方 12 點鐘方向: 3 * PI / 2)
    this._drawPointer(centerX, centerY - radius, 0);
  };

  RenderEngine.prototype._drawPointer = function (tipX, tipY) {
    var ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tipX, tipY + 18);
    ctx.lineTo(tipX - 14, tipY - 14);
    ctx.lineTo(tipX + 14, tipY - 14);
    ctx.closePath();
    ctx.fillStyle = '#EF4444';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
  };

  /**
   * 啟動抽獎動畫
   * @param {number} targetIndex 目標得獎者索引
   * @param {string} targetName 目標得獎者姓名
   * @param {number} durationMs 動畫持續毫秒
   * @param {Function} onComplete 動畫完成回呼
   */
  RenderEngine.prototype.spinTo = function (targetIndex, targetName, durationMs, onComplete) {
    this.stop();
    this.isSpinning = true;

    if (this.mode === 'WHEEL') {
      this._spinWheel(targetIndex, durationMs || 4000, onComplete);
    } else {
      this._spinSlot(targetName, durationMs || 3500, onComplete);
    }
  };

  RenderEngine.prototype._spinWheel = function (targetIndex, durationMs, onComplete) {
    var self = this;
    var count = this.candidates.length;
    var sliceAngle = (Math.PI * 2) / count;

    // 指針位於頂部 3*PI/2 (270度)。目標扇區正中必須停在 3*PI/2
    var targetCenterAngle = (Math.PI * 1.5) - (targetIndex * sliceAngle + sliceAngle / 2);
    
    // 加上額外旋轉圈數 (至少 6 圈)，計算順時針到達目標正中的角度差
    var extraRounds = 6 * Math.PI * 2;
    var curNorm = ((this.currentAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
    var tgtNorm = ((targetCenterAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
    var delta = tgtNorm - curNorm;
    if (delta <= 0) delta += Math.PI * 2;
    var finalAngle = this.currentAngle + extraRounds + delta;

    var startTime = performance.now();
    var lastTickSlice = -1;

    function animate(time) {
      if (!self.isSpinning) return;
      var elapsed = time - startTime;
      var progress = Math.min(1, elapsed / durationMs);
      var eased = easeOutQuint(progress);

      var angle = startAngle + (finalAngle - startAngle) * eased;
      self.currentAngle = angle;
      self._drawWheel(angle);

      // 偵測指針跨過扇面並發出噠噠聲
      var curSlice = Math.floor((angle / sliceAngle)) % count;
      if (curSlice !== lastTickSlice) {
        lastTickSlice = curSlice;
        if (self.audio) self.audio.playTick();
      }

      if (progress < 1) {
        self.animationId = requestAnimationFrame(animate);
      } else {
        self.isSpinning = false;
        self.animationId = null;
        if (typeof onComplete === 'function') onComplete();
      }
    }

    this.animationId = requestAnimationFrame(animate);
  };

  RenderEngine.prototype._spinSlot = function (targetName, durationMs, onComplete) {
    var self = this;
    if (!this.slotContainer) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    var startTime = performance.now();
    var lastSoundTime = 0;
    var interval = 50;

    function step(now) {
      if (!self.isSpinning) return;
      var elapsed = now - startTime;
      var progress = Math.min(1, elapsed / durationMs);

      // 動態更新滾動名單
      if (progress < 1) {
        var speedFactor = 1 - easeOutQuint(progress);
        var currentInterval = 40 + (1 - speedFactor) * 260; // 逐漸放慢間隔

        if (now - lastSoundTime >= currentInterval) {
          lastSoundTime = now;
          var randIdx = Math.floor(Math.random() * self.candidates.length);
          var randomName = self.candidates[randIdx] || '...';
          self.slotContainer.innerHTML = '<div class="slot-reel-card rolling">' + escapeHtml(randomName) + '</div>';
          if (self.audio) self.audio.playTick();
        }

        self.animationId = requestAnimationFrame(step);
      } else {
        // 定格得獎人
        self.slotContainer.innerHTML = '<div class="slot-reel-card winner-card">' + escapeHtml(targetName) + '</div>';
        self.isSpinning = false;
        self.animationId = null;
        if (typeof onComplete === 'function') onComplete();
      }
    }

    this.animationId = requestAnimationFrame(step);
  };

  RenderEngine.prototype.stop = function () {
    this.isSpinning = false;
    if (this.animationId) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.animationId);
      }
      this.animationId = null;
    }
  };

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return RenderEngine;
});
