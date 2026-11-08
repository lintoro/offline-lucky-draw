/**
 * 純前端單檔離線抽獎 Web 應用 - 音效合成器 (AudioSynthesizer)
 * 規格版本: v1.1.0
 * 
 * 技術特性:
 * - 100% 原生 Web Audio API 合成，零外部音訊檔案依賴
 * - 支援自動播放政策降級與使用者手勢喚醒 (audioCtx.resume)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AudioSynthesizer = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function AudioSynthesizer() {
    this.ctx = null;
    this.enabled = true;
    this._initialized = false;
  }

  // 初始化或喚醒 AudioContext (需在使用者互動後呼叫)
  AudioSynthesizer.prototype.init = function () {
    if (this._initialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(function () {});
      }
      return;
    }

    try {
      var AudioCtxClass = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) ||
                          (typeof globalThis !== 'undefined' && (globalThis.AudioContext || globalThis.webkitAudioContext));
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this._initialized = true;
      }
    } catch (e) {
      console.warn('[AudioSynthesizer] Web Audio API not supported or blocked:', e);
      this.enabled = false;
    }
  };

  /**
   * 播放指針撥動「噠噠聲」 (Tick Sound)
   * 以短促的高頻方波/正弦波與快速指數衰減模擬機械碰撞
   */
  AudioSynthesizer.prototype.playTick = function () {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      var now = this.ctx.currentTime;
      var osc = this.ctx.createOscillator();
      var gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.035);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (err) {
      // 靜默降級，不影響主動畫
    }
  };

  /**
   * 播放機械翻牌聲 (Split-Flap Click)
   */
  AudioSynthesizer.prototype.playFlap = function () {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      var now = this.ctx.currentTime;
      var osc = this.ctx.createOscillator();
      var gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.02);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    } catch (e) {}
  };

  /**
   * 播放彩蛋噴出與破殼「啵」聲 (Egg Pop)
   */
  AudioSynthesizer.prototype.playPop = function () {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      var now = this.ctx.currentTime;
      var osc = this.ctx.createOscillator();
      var gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.06);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  };

  /**
   * 播放星際躍遷穿梭音效 (Hyperspace Sweep)
   */
  AudioSynthesizer.prototype.playWarp = function () {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      var now = this.ctx.currentTime;
      var osc = this.ctx.createOscillator();
      var gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.25);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  };

  /**
   * 播放中獎「慶祝和弦聲」 (Celebration Fanfare)
   * 採用大三和弦琶音與延音合成 (C5 -> E5 -> G5 -> C6)
   */
  AudioSynthesizer.prototype.playFanfare = function () {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      var self = this;
      var notes = [
        { freq: 523.25, time: 0.00, dur: 0.12, type: 'sine' },     // C5
        { freq: 659.25, time: 0.10, dur: 0.12, type: 'sine' },     // E5
        { freq: 783.99, time: 0.20, dur: 0.16, type: 'sine' },     // G5
        { freq: 1046.50, time: 0.32, dur: 0.48, type: 'triangle' }, // C6 壓軸主音
        { freq: 1318.51, time: 0.32, dur: 0.48, type: 'sine' }      // E6 燦爛高音和聲
      ];

      var baseTime = this.ctx.currentTime;

      notes.forEach(function (n) {
        var startTime = baseTime + n.time;
        var stopTime = startTime + n.dur;

        var osc = self.ctx.createOscillator();
        var gain = self.ctx.createGain();

        osc.type = n.type || 'sine';
        osc.frequency.setValueAtTime(n.freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.26, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, stopTime);

        osc.connect(gain);
        gain.connect(self.ctx.destination);

        osc.start(startTime);
        osc.stop(stopTime);
      });
    } catch (err) {
      // 靜默降級
    }
  };

  /**
   * 播放全開模式群體慶祝音效 (Play Batch Celebration)
   */
  AudioSynthesizer.prototype.playBatchCelebration = function () {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      var self = this;
      var notes = [
        { freq: 440.00, time: 0.00, dur: 0.12, type: 'triangle' }, // A4
        { freq: 554.37, time: 0.08, dur: 0.14, type: 'sine' },     // C#5
        { freq: 659.25, time: 0.16, dur: 0.16, type: 'sine' },     // E5
        { freq: 880.00, time: 0.24, dur: 0.35, type: 'triangle' }, // A5
        { freq: 1108.73, time: 0.32, dur: 0.55, type: 'sine' },    // C#6
        { freq: 1318.51, time: 0.32, dur: 0.65, type: 'sine' }     // E6
      ];
      var base = this.ctx.currentTime;
      notes.forEach(function (n) {
        var st = base + n.time;
        var et = st + n.dur;
        var osc = self.ctx.createOscillator();
        var gain = self.ctx.createGain();
        osc.type = n.type || 'sine';
        osc.frequency.setValueAtTime(n.freq, st);
        gain.gain.setValueAtTime(0.001, st);
        gain.gain.linearRampToValueAtTime(0.24, st + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, et);
        osc.connect(gain);
        gain.connect(self.ctx.destination);
        osc.start(st);
        osc.stop(et);
      });
    } catch (e) {}
  };

  /**
   * 播放抽獎圓滿結束「感謝大家的參與」謝幕和弦 (Grand Finale Warm Chime)
   */
  AudioSynthesizer.prototype.playFinale = function () {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      var self = this;
      // 溫暖大調九和弦管鐘長延音 (F Major 9 / C Major 9)
      var chords = [
        { freq: 261.63, time: 0.00, dur: 2.2, type: 'triangle', gain: 0.25 }, // C4
        { freq: 329.63, time: 0.15, dur: 2.4, type: 'sine', gain: 0.22 },     // E4
        { freq: 392.00, time: 0.30, dur: 2.5, type: 'sine', gain: 0.20 },     // G4
        { freq: 493.88, time: 0.45, dur: 2.6, type: 'sine', gain: 0.18 },     // B4
        { freq: 523.25, time: 0.60, dur: 2.8, type: 'triangle', gain: 0.24 }, // C5
        { freq: 587.33, time: 0.75, dur: 2.8, type: 'sine', gain: 0.18 },     // D5
        { freq: 659.25, time: 0.90, dur: 2.8, type: 'sine', gain: 0.16 },     // E5
        { freq: 783.99, time: 1.05, dur: 3.0, type: 'sine', gain: 0.16 },     // G5
        { freq: 1046.50, time: 1.20, dur: 3.2, type: 'sine', gain: 0.18 }     // C6
      ];
      var base = this.ctx.currentTime;
      chords.forEach(function (n) {
        var st = base + n.time;
        var et = st + n.dur;
        var osc = self.ctx.createOscillator();
        var gain = self.ctx.createGain();
        osc.type = n.type || 'sine';
        osc.frequency.setValueAtTime(n.freq, st);
        gain.gain.setValueAtTime(0.001, st);
        gain.gain.linearRampToValueAtTime(n.gain || 0.2, st + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, et);
        osc.connect(gain);
        gain.connect(self.ctx.destination);
        osc.start(st);
        osc.stop(et);
      });
    } catch (e) {}
  };

  AudioSynthesizer.prototype.close = function () {
    if (this.ctx && typeof this.ctx.close === 'function') {
      try {
        this.ctx.close();
      } catch (e) {}
    }
    this.ctx = null;
    this._initialized = false;
  };

  return AudioSynthesizer;
});
