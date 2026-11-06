/**
 * 純前端單檔離線抽獎 Web 應用 - 紙花粒子引擎 (Confetti)
 * 規格版本: v1.1.0
 * 
 * 技術特性:
 * - Canvas 2D 高速粒子物理演算 (重力、空氣阻力、旋轉、漸隱)
 * - 支援 cancelAnimationFrame 與 GPU Buffer 清空，防記憶體洩漏
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ConfettiEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var COLORS = ['#FF4D4F', '#FFA940', '#FFEC3D', '#73D13D', '#36CFC9', '#4096FF', '#9254DE', '#F759AB'];

  function ConfettiEngine(canvasElement) {
    this.canvas = canvasElement || null;
    this.ctx = canvasElement && canvasElement.getContext ? canvasElement.getContext('2d') : null;
    this.particles = [];
    this.animationId = null;
    this.isActive = false;
  }

  ConfettiEngine.prototype.setCanvas = function (canvas) {
    this.stop();
    this.canvas = canvas;
    this.ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  };

  /**
   * 噴發紙花
   * @param {number} [count=120] 粒子數量
   */
  ConfettiEngine.prototype.fire = function (count) {
    if (!this.canvas || !this.ctx) return;
    this.stop();

    var num = count || 140;
    var w = this.canvas.width;
    var h = this.canvas.height;
    this.particles = [];

    for (var i = 0; i < num; i++) {
      var angle = (Math.PI * 2 * Math.random());
      var speed = 8 + Math.random() * 16;
      this.particles.push({
        x: w * 0.5 + (Math.random() - 0.5) * 60,
        y: h * 0.45 + (Math.random() - 0.5) * 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 6,
        size: 7 + Math.random() * 7,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        alpha: 1,
        decay: 0.007 + Math.random() * 0.007
      });
    }

    this.isActive = true;
    var self = this;

    function loop() {
      if (!self.isActive) return;
      self._update();
      self._render();

      if (self.particles.length > 0) {
        self.animationId = requestAnimationFrame(loop);
      } else {
        self.stop();
      }
    }

    this.animationId = requestAnimationFrame(loop);
  };

  ConfettiEngine.prototype._update = function () {
    var gravity = 0.35;
    var drag = 0.985;

    for (var i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += gravity;
      p.vx *= drag;
      p.vy *= drag;
      p.rotation += p.rotationSpeed;
      p.alpha -= p.decay;

      if (p.alpha <= 0 || p.y > (this.canvas ? this.canvas.height + 50 : 1000)) {
        this.particles.splice(i, 1);
      }
    }
  };

  ConfettiEngine.prototype._render = function () {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      this.ctx.restore();
    }
  };

  /**
   * 停止動畫並清理 Canvas Buffer
   */
  ConfettiEngine.prototype.stop = function () {
    this.isActive = false;
    if (this.animationId) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.animationId);
      }
      this.animationId = null;
    }
    this.particles = [];
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  };

  return ConfettiEngine;
});
