import re, subprocess, os

with open('src/stateManager.js', 'r', encoding='utf-8') as f:
    state_code = f.read()

with open('src/audioSynthesizer.js', 'r', encoding='utf-8') as f:
    audio_code = f.read()

with open('src/confetti.js', 'r', encoding='utf-8') as f:
    confetti_code = f.read()

with open('src/festiveAmbiance.js', 'r', encoding='utf-8') as f:
    festive_code = f.read()

with open('src/masterVisualEngine.js', 'r', encoding='utf-8') as f:
    visual_code = f.read()

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

helpers_and_ui = r"""
  function sanitizeCsvCell(val) {
    if (val === null || val === undefined) return '""';
    var str = String(val);
    if (/^[=+\-@]/.test(str)) str = "'" + str;
    if (/[",\r\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return '"' + str + '"';
  }

  function generateCsv(history) {
    var lines = ['\uFEFF序號,獎項名稱,中獎姓名,抽獎時間'];
    (history || []).forEach(function(rec, i) {
      lines.push([
        sanitizeCsvCell(rec.sequence || (i + 1)),
        sanitizeCsvCell(rec.prizeName),
        sanitizeCsvCell(rec.winnerName),
        sanitizeCsvCell(rec.timestamp)
      ].join(','));
    });
    return lines.join('\r\n');
  }

  function downloadFile(content, name, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  (function initApp() {
    var state = new StateManager({
      eventName: '年度慶典抽獎大會',
      theme: 'OBSIDIAN_GOLD',
      prizes: [
        { name: '特獎 (大獎)', totalQuota: 1 },
        { name: '頭獎', totalQuota: 2 },
        { name: '二獎 (普獎)', totalQuota: 5 }
      ]
    });

    var audio = new AudioSynthesizer();
    var confetti = new ConfettiEngine(document.getElementById('confetti-canvas'));
    var ambientCanvas = document.getElementById('ambient-canvas');
    var festiveAmbiance = ambientCanvas ? new FestiveAmbiance(ambientCanvas, state.theme) : null;
    var visualEngine = new MasterVisualEngine(document.getElementById('stage-canvas'), audio, state.theme);

    var themeSelector = document.getElementById('theme-selector');
    var inputEventName = document.getElementById('input-event-name');
    var headerBrandTitle = document.getElementById('header-brand-title');

    var viewSetup = document.getElementById('view-setup');
    var viewStage = document.getElementById('view-stage');
    var inputCandidates = document.getElementById('input-candidates');
    var candidateBadge = document.getElementById('candidate-count-badge');
    var prizeCountBadge = document.getElementById('prize-count-badge');
    var prizesList = document.getElementById('prizes-list');
    var btnAddPrize = document.getElementById('btn-add-prize');
    var selDrawOrder = document.getElementById('config-draw-order');
    var chkAllowDup = document.getElementById('config-allow-duplicates');
    var maxWinContainer = document.getElementById('max-win-container');
    var inputMaxWinLimit = document.getElementById('config-max-win-limit');
    var chkAutoSwitch = document.getElementById('config-auto-switch');
    var btnStartStage = document.getElementById('btn-start-stage');
    var btnExportHtml = document.getElementById('btn-export-html');
    var btnEmergencyEdit = document.getElementById('btn-emergency-edit');
    var btnSpin = document.getElementById('btn-spin');
    var stageOrderTag = document.getElementById('stage-order-tag');
    var stagePrizeName = document.getElementById('stage-prize-name');
    var stageQuotaRemaining = document.getElementById('stage-quota-remaining');
    var stageCandidatesRemaining = document.getElementById('stage-candidates-remaining');
    var stageStatusHint = document.getElementById('stage-status-hint');
    var historyCounter = document.getElementById('history-counter');
    var historyFeed = document.getElementById('history-feed');
    var btnExportCsv = document.getElementById('btn-export-csv');
    var btnResetAll = document.getElementById('btn-reset-all');
    var winnerModal = document.getElementById('winner-modal-overlay');
    var modalPrizeTag = document.getElementById('modal-prize-tag');
    var modalWinnerName = document.getElementById('modal-winner-name');
    var modalBatchContainer = document.getElementById('modal-batch-container');
    var btnModalContinue = document.getElementById('btn-modal-continue');
    var fileDropzone = document.getElementById('file-dropzone');
    var fileInput = document.getElementById('file-input');
    var btnFullscreen = document.getElementById('btn-fullscreen-toggle');
    var btnAspectToggle = document.getElementById('btn-aspect-toggle');

    function applyAspectRatio(ratio) {
      var isPortrait = (ratio === '9:16');
      var val = isPortrait ? '9:16' : '16:9';
      document.body.setAttribute('data-aspect-ratio', val);
      if (btnAspectToggle) {
        btnAspectToggle.innerHTML = isPortrait ? '📱 9:16 直屏' : '🖥️ 16:9 寬螢幕';
        btnAspectToggle.title = isPortrait ? '目前為手機直屏模式 (9:16)，點擊切換為電腦寬螢幕 (16:9)' : '目前為電腦寬螢幕模式 (16:9)，點擊切換為手機直屏 (9:16)';
      }
      if (visualEngine && typeof visualEngine.setAspectRatio === 'function') {
        visualEngine.setAspectRatio(val);
      }
      if (festiveAmbiance && typeof festiveAmbiance.setAspectRatio === 'function') {
        festiveAmbiance.setAspectRatio(val);
      }
    }

    if (btnAspectToggle) {
      btnAspectToggle.onclick = function() {
        var cur = (state.config && state.config.aspectRatio === '9:16') ? '9:16' : '16:9';
        var next = (cur === '16:9') ? '9:16' : '16:9';
        state.setAspectRatio(next);
      };
    }

    var selBatchMode = document.getElementById('stage-batch-mode-select');
    var chkLockBatchMode = document.getElementById('stage-lock-batch-mode');
    var batchModeDesc = document.getElementById('batch-mode-desc-text');

    var btnToggleFeed = document.getElementById('btn-toggle-feed');
    var btnCloseFeed = document.getElementById('btn-close-feed');
    var stageFeedBox = document.getElementById('stage-feed-box');
    var historyCounterBadge = document.getElementById('history-counter-badge');
    var stageBatchHud = document.getElementById('stage-batch-hud');
    var stageBatchHudText = document.getElementById('stage-batch-hud-text');

    if (btnToggleFeed && stageFeedBox) {
      btnToggleFeed.onclick = function() {
        if (document.body.getAttribute('data-aspect-ratio') === '9:16') {
          stageFeedBox.classList.toggle('active');
        } else {
          stageFeedBox.classList.toggle('collapsed');
        }
      };
    }
    if (btnCloseFeed && stageFeedBox) {
      btnCloseFeed.onclick = function() {
        stageFeedBox.classList.remove('active');
        stageFeedBox.classList.add('collapsed');
      };
    }

    var finaleModal = document.getElementById('finale-curtain-overlay');
    var finaleTierTag = document.getElementById('finale-tier-tag');
    var finaleTitleText = document.getElementById('finale-title-text');
    var finaleSubtitleText = document.getElementById('finale-subtitle-text');
    var finaleStatsSummary = document.getElementById('finale-stats-summary');
    var btnFinaleExportCsv = document.getElementById('btn-finale-export-csv');
    var btnFinaleClose = document.getElementById('btn-finale-close');
    var finaleTimer = null;

    var btnLoadSample = document.getElementById('btn-load-sample');
    var btnDedupNames = document.getElementById('btn-dedup-names');
    var btnClearNames = document.getElementById('btn-clear-names');

    var dialogOverlay = document.getElementById('dialog-modal-overlay');
    var dialogTitle = document.getElementById('dialog-title');
    var dialogMsg = document.getElementById('dialog-msg');
    var dialogBtnCancel = document.getElementById('dialog-btn-cancel');
    var dialogBtnConfirm = document.getElementById('dialog-btn-confirm');
    var onDialogConfirmAction = null;

    function openDialog(title, message, isConfirm, onConfirm) {
      dialogTitle.textContent = title;
      dialogMsg.textContent = message;
      dialogBtnCancel.style.display = isConfirm ? 'inline-block' : 'none';
      onDialogConfirmAction = onConfirm;
      dialogOverlay.classList.add('active');
    }
    dialogBtnCancel.onclick = function() { dialogOverlay.classList.remove('active'); };
    dialogBtnConfirm.onclick = function() {
      dialogOverlay.classList.remove('active');
      if (typeof onDialogConfirmAction === 'function') onDialogConfirmAction();
    };

    if (themeSelector) {
      themeSelector.onchange = function() {
        var val = this.value;
        document.body.setAttribute('data-theme', val);
        state.setTheme(val);
        if (festiveAmbiance) festiveAmbiance.setTheme(val);
        if (visualEngine) visualEngine.setTheme(val);
      };
    }

    if (inputEventName) {
      inputEventName.oninput = function() {
        var val = this.value.trim() || '年度慶典抽獎大會';
        state.setEventName(val);
        if (headerBrandTitle) headerBrandTitle.textContent = val;
      };
    }

    if (chkAllowDup) {
      chkAllowDup.onchange = function() {
        if (maxWinContainer) maxWinContainer.style.display = this.checked ? 'inline-flex' : 'none';
        var limit = this.checked ? (parseInt(inputMaxWinLimit.value, 10) || 2) : 0;
        state.updateConfig({ allowDuplicates: this.checked, maxWinLimit: limit });
      };
    }
    if (inputMaxWinLimit) {
      inputMaxWinLimit.oninput = function() {
        var val = Math.max(1, parseInt(this.value, 10) || 2);
        state.updateConfig({ maxWinLimit: val });
      };
    }

    if (btnFullscreen) {
      btnFullscreen.onclick = function() {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(function(){});
        } else {
          if (document.exitFullscreen) document.exitFullscreen();
        }
      };
    }

    if (btnLoadSample) {
      btnLoadSample.onclick = function() {
        var sample = "陳冠宇\n林雅婷\n黃家豪\n張庭瑄\n李宗翰\n王欣怡\n吳柏毅\n劉佳穎\n蔡宗佑\n鄭宇軒\n許雅筑\n謝政廷\n宋詩涵\n楊凱傑\n潘品妤\n周子豪\n趙婉婷\n徐家銘\n孫瑋倫\n何宜蓁\n郭建志\n羅詩婷\n曾柏翰\n邱美玲\n蕭宇翔\n梁雅雯\n韓宗霖\n唐若涵\n馮偉哲\n謝宛倫";
        inputCandidates.value = sample;
        state.setInputText(sample);
        if (candidateBadge) candidateBadge.textContent = state.candidatePool.length + ' 人登記';
      };
    }

    if (btnDedupNames) {
      btnDedupNames.onclick = function() {
        var list = parseCandidateText(inputCandidates.value);
        var deduped = Array.from(new Set(list));
        inputCandidates.value = deduped.join('\n');
        state.setInputText(inputCandidates.value);
        if (candidateBadge) candidateBadge.textContent = deduped.length + ' 人登記';
        openDialog('名單清理完成', '已濾除重複人名，現有名冊共 ' + deduped.length + ' 人。', false);
      };
    }

    if (btnClearNames) {
      btnClearNames.onclick = function() {
        openDialog('清空確認', '確定要清空目前輸入的名單文字？', true, function() {
          inputCandidates.value = '';
          state.setInputText('');
          if (candidateBadge) candidateBadge.textContent = '0 人登記';
        });
      };
    }

    function parseCandidateText(text) {
      return (text || '').split(/\r?\n/).map(function(s){ return s.trim(); }).filter(function(s){ return s.length > 0; });
    }

        function updatePrizeCountBadge() {
      if (!prizeCountBadge) return;
      var count = state.prizes.length;
      var totalQuota = state.prizes.reduce(function(sum, p) {
        return sum + (parseInt(p.totalQuota, 10) || 0);
      }, 0);
      prizeCountBadge.textContent = '目前共有 ' + count + ' 項獎項 ｜ 合計 ' + totalQuota + ' 位名額';
    }

    function renderPrizeInputs() {
      if (!prizesList) return;
      prizesList.innerHTML = '';
      var isBottomUp = state.config.drawOrder === 'BOTTOM_UP';
      var total = state.prizes.length;

      state.prizes.forEach(function(p, idx) {
        var rankNum = isBottomUp ? (total - idx) : (idx + 1);
        var isGrand = rankNum === total;
        var pillClass = isGrand ? 'prize-rank-pill grand' : 'prize-rank-pill';
        var pillLabel = isGrand ? '★ 壓軸大獎' : '第 ' + rankNum + ' 順位';

        var card = document.createElement('div');
        card.className = 'prize-card';
        card.innerHTML = 
          '<div class="' + pillClass + '">' + pillLabel + '</div>' +
          '<input type="text" value="' + escapeHtml(p.name) + '" placeholder="獎項名稱" data-id="' + p.id + '" class="p-name">' +
          '<input type="number" min="1" value="' + p.totalQuota + '" data-id="' + p.id + '" class="p-quota" title="配額數量">' +
          '<div class="reorder-btns">' +
            '<button class="btn-icon btn-move-up" data-idx="' + idx + '" title="順位前移" ' + (idx === 0 ? 'disabled style="opacity:0.2"' : '') + '>▲</button>' +
            '<button class="btn-icon btn-move-down" data-idx="' + idx + '" title="順位後移" ' + (idx === total - 1 ? 'disabled style="opacity:0.2"' : '') + '>▼</button>' +
          '</div>' +
          '<button class="btn-icon del btn-del-p" data-id="' + p.id + '" title="刪除獎項">✕</button>';
        prizesList.appendChild(card);
      });

      prizesList.querySelectorAll('.p-name').forEach(function(inp) {
        inp.oninput = function() {
          var id = this.getAttribute('data-id');
          var p = state.prizes.find(function(item){ return item.id === id; });
          if (p) { p.name = this.value; state.validate(); }
        };
      });

      prizesList.querySelectorAll('.p-quota').forEach(function(inp) {
        inp.oninput = function() {
          var id = this.getAttribute('data-id');
          var p = state.prizes.find(function(item){ return item.id === id; });
          if (p) {
            var val = Math.max(1, parseInt(this.value, 10) || 1);
            p.totalQuota = val;
            p.remainingQuota = val;
            state.validate();
            updatePrizeCountBadge();
          }
        };
      });

      prizesList.querySelectorAll('.btn-move-up').forEach(function(btn) {
        btn.onclick = function() {
          var idx = parseInt(this.getAttribute('data-idx'), 10);
          state.movePrize(idx, idx - 1);
          renderPrizeInputs();
        };
      });

      prizesList.querySelectorAll('.btn-move-down').forEach(function(btn) {
        btn.onclick = function() {
          var idx = parseInt(this.getAttribute('data-idx'), 10);
          state.movePrize(idx, idx + 1);
          renderPrizeInputs();
        };
      });

      updatePrizeCountBadge();

      prizesList.querySelectorAll('.btn-del-p').forEach(function(btn) {
        btn.onclick = function() {
          var id = this.getAttribute('data-id');
          state.removePrize(id);
          renderPrizeInputs();
        };
      });
    }

    if (btnAddPrize) {
      btnAddPrize.onclick = function() {
        var count = state.prizes.length + 1;
        state.addPrize('獎項 ' + count, 1);
        renderPrizeInputs();
      };
    }

    if (selDrawOrder) {
      selDrawOrder.onchange = function() {
        state.updateConfig({ drawOrder: this.value });
        renderPrizeInputs();
      };
    }

    if (inputCandidates) {
      inputCandidates.oninput = function() {
        state.setInputText(this.value);
        if (candidateBadge) candidateBadge.textContent = state.candidatePool.length + ' 人登記';
      };
    }

    if (fileDropzone && fileInput) {
      fileDropzone.onclick = function() { fileInput.click(); };
      fileDropzone.ondragover = function(e) { e.preventDefault(); };
      fileDropzone.ondrop = function(e) {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          readFile(e.dataTransfer.files[0]);
        }
      };
      fileInput.onchange = function(e) {
        if (e.target.files && e.target.files[0]) {
          readFile(e.target.files[0]);
        }
      };
      function readFile(file) {
        var reader = new FileReader();
        reader.onload = function(evt) {
          var content = evt.target.result || '';
          inputCandidates.value = content;
          state.setInputText(content);
          if (candidateBadge) candidateBadge.textContent = state.candidatePool.length + ' 人登記';
        };
        reader.readAsText(file, 'utf-8');
      }
    }

    if (chkAutoSwitch) {
      chkAutoSwitch.onchange = function() { state.updateConfig({ autoSwitchTier: this.checked }); };
    }

    if (btnStartStage) {
      btnStartStage.onclick = function() {
        audio.init();

        var candidateText = inputCandidates ? inputCandidates.value : '';
        var parsedCandidates = parseCandidateText(candidateText);

        if (parsedCandidates.length === 0) {
          openDialog('無法進入舞台', '候選人名冊至少需輸入 1 位人員姓名！', false);
          if (inputCandidates) inputCandidates.focus();
          return;
        }

        if (!state.prizes || state.prizes.length === 0) {
          openDialog('無法進入舞台', '請至少設定一個獎項！', false);
          return;
        }

        var totalPrizeQuota = state.prizes.reduce(function(sum, p) {
          return sum + (parseInt(p.totalQuota, 10) || 0);
        }, 0);
        if (totalPrizeQuota <= 0) {
          openDialog('無法進入舞台', '各獎項合計名額必須大於 0！', false);
          return;
        }

        // 檢查是否為「上一輪抽獎已全數開出完畢」
        var isAllDrawn = state.prizes.every(function(p) {
          return (parseInt(p.remainingQuota, 10) || 0) <= 0;
        });
        var hasHistory = state.history && state.history.length > 0;

        if (hasHistory && isAllDrawn) {
          // 上一輪抽獎已圓滿結束，彈窗確認開啟全新一輪抽獎大會
          openDialog(
            '開啟全新一輪抽獎',
            '上一輪抽獎已全數開出完畢（共產生 ' + state.history.length + ' 筆得獎紀錄）。\n點擊「確定」將保留目前名冊（' + parsedCandidates.length + ' 人）與獎項設定，並展開全新一輪抽獎大會！',
            true,
            function() {
              state.reset();
              state.setInputText(candidateText);
              switchToStage();
            }
          );
          return;
        }

        // 若 candidatePool 空了（例如名單先前被抽光但獎項還有剩額，或未同步）
        if (state.candidatePool.length === 0 && parsedCandidates.length > 0) {
          state.setInputText(candidateText);
        }

        if (!state.validate()) {
          var remQuota = state.prizes.reduce(function(sum, p) { return sum + (p.remainingQuota || 0); }, 0);
          if (remQuota <= 0) {
            openDialog('無法進入舞台', '目前所有獎項名額均已抽滿！請新增獎項名額或重置大會。', false);
          } else if (state.candidatePool.length === 0) {
            openDialog('無法進入舞台', '候選人名冊可抽人數不足！請於名冊欄位新增更多名單。', false);
          } else {
            openDialog('無法進入舞台', '請確認候選人名冊至少 1 人，且獎項剩餘配額大於 0。', false);
          }
          return;
        }

        switchToStage();
      };
    }

    function switchToStage() {
      viewSetup.classList.remove('active');
      viewStage.classList.add('active');
      if (btnEmergencyEdit) btnEmergencyEdit.classList.remove('hidden');
      visualEngine.setCandidates(state.candidatePool, state.initialCandidates);
      if (festiveAmbiance) {
        festiveAmbiance.resize();
        festiveAmbiance.start();
      }
      if (!chkLockBatchMode || !chkLockBatchMode.checked) {
        if (selBatchMode) selBatchMode.value = '';
        if (batchModeDesc) batchModeDesc.textContent = '請先選擇抽取模式';
      }
      window.scrollTo(0, 0);
      updateStageView();
    }

    if (btnEmergencyEdit) {
      btnEmergencyEdit.onclick = function() {
        openDialog('返回設定頁面', '確定返回設定頁面？目前未抽出的獎項進度將完整保留。', true, function() {
          visualEngine.stop();
          confetti.stop();
          if (festiveAmbiance) festiveAmbiance.stop();
          if (winnerModal) winnerModal.classList.remove('active');
          if (finaleModal) finaleModal.classList.remove('active');
          if (finaleTimer) clearTimeout(finaleTimer);
          state.emergencyEdit();
          viewStage.classList.remove('active');
          viewSetup.classList.add('active');
          btnEmergencyEdit.classList.add('hidden');
          renderPrizeInputs();
          if (candidateBadge && inputCandidates) {
            candidateBadge.textContent = parseCandidateText(inputCandidates.value).length + ' 人登記';
          }
        });
      };
    }

    function renderModalWinners(records) {
      if (!records || records.length === 0) return;
      if (records.length === 1) {
        if (modalWinnerName) {
          modalWinnerName.textContent = records[0].winnerName;
          modalWinnerName.classList.remove('hidden');
        }
        if (modalBatchContainer) {
          modalBatchContainer.classList.add('hidden');
          modalBatchContainer.innerHTML = '';
        }
      } else {
        if (modalWinnerName) {
          modalWinnerName.classList.add('hidden');
        }
        if (modalBatchContainer) {
          modalBatchContainer.classList.remove('hidden');
          modalBatchContainer.innerHTML = '';
          var grid = document.createElement('div');
          grid.className = 'winner-batch-grid';
          records.forEach(function(rec, idx) {
            var card = document.createElement('div');
            card.className = 'winner-batch-card';
            card.style.animationDelay = (idx * 0.04) + 's';
            card.innerHTML = 
              '<span class="batch-card-seq">#' + rec.sequence + '</span>' +
              '<span class="batch-card-name">' + escapeHtml(rec.winnerName) + '</span>';
            grid.appendChild(card);
          });
          modalBatchContainer.appendChild(grid);
        }
      }
    }

    if (selBatchMode) {
      selBatchMode.onchange = function() {
        var modeVal = this.value;
        if (modeVal === 'SINGLE') {
          if (batchModeDesc) batchModeDesc.textContent = '一般模式：一次抽一個人';
        } else if (modeVal === 'BATCH_ALL') {
          if (batchModeDesc) batchModeDesc.textContent = '全開模式：一次抽完此獎所有名額';
        } else {
          if (batchModeDesc) batchModeDesc.textContent = '請先選擇抽取模式';
        }
        updateStageView();
      };
    }

    function updateStageView() {
      var cur = state.getCurrentPrize();
      var s = state.getState();
      var ordered = state.getOrderedPrizes();

      if (candidateBadge && inputCandidates) candidateBadge.textContent = parseCandidateText(inputCandidates.value).length + ' 人登記';
      if (historyCounter) historyCounter.textContent = s.history.length + ' 人獲獎';
      if (historyCounterBadge) historyCounterBadge.textContent = s.history.length + '人';
      if (stageCandidatesRemaining) stageCandidatesRemaining.textContent = s.candidatePool.length + ' 人';

      var curIdx = -1;
      if (cur) {
        curIdx = ordered.findIndex(function(p){ return p.id === cur.id; });
      }

      if (cur) {
        var roundNum = curIdx >= 0 ? (curIdx + 1) : 1;
        var isGrand = roundNum === ordered.length;
        if (stageOrderTag) stageOrderTag.textContent = (state.config.eventName || '大會抽獎') + ' ｜ 第 ' + roundNum + ' 輪 (共 ' + ordered.length + ' 輪)' + (isGrand ? ' ★ 壓軸大獎' : '');
        if (stagePrizeName) stagePrizeName.textContent = cur.name;
        if (stageQuotaRemaining) stageQuotaRemaining.textContent = cur.remainingQuota + ' / ' + cur.totalQuota;
      } else {
        if (stageOrderTag) stageOrderTag.textContent = (state.config.eventName || '大會抽獎') + ' ｜ 全部完成';
        if (stagePrizeName) stagePrizeName.textContent = '恭喜所有獲獎幸運兒';
        if (stageQuotaRemaining) stageQuotaRemaining.textContent = '全部抽滿';
      }

      visualEngine.setCandidates(s.candidatePool, state.initialCandidates);
      var curMode = state.getModeForCurrentPrize();
      visualEngine.setMode(curMode);

      var selectedMode = selBatchMode ? selBatchMode.value : '';

      if (btnSpin) {
        btnSpin.className = 'btn-stage-spin';
        if (s.status === 'READY') {
          if (!selectedMode) {
            btnSpin.disabled = true;
            btnSpin.textContent = '請先設定抽獎模式';
            if (stageStatusHint) stageStatusHint.innerHTML = '請在右側下拉選單選擇「一般模式」或「全開模式」以開始抽獎';
            if (stageBatchHud) stageBatchHud.classList.add('hidden');
          } else if (selectedMode === 'BATCH_ALL') {
            btnSpin.disabled = false;
            var batchCount = cur ? Math.min(cur.remainingQuota, s.candidatePool.length) : 0;
            btnSpin.className = 'btn-stage-spin btn-stage-spin-batch';
            btnSpin.textContent = '全開抽獎 (' + batchCount + '名)';
            if (stageStatusHint) stageStatusHint.innerHTML = '⚡ 全開模式就緒！輕按 <kbd>Space 空白鍵</kbd> 或點擊按鈕一次抽出 <strong>' + batchCount + '</strong> 位幸運兒';
            if (stageBatchHud && batchCount > 1) {
              stageBatchHud.classList.remove('hidden');
              if (stageBatchHudText) stageBatchHudText.textContent = '⚡ 全開模式 ｜ 本輪將抽出 ' + batchCount + ' 位得獎人';
            }
          } else {
            btnSpin.disabled = false;
            btnSpin.textContent = '開始抽獎 (1名)';
            if (stageStatusHint) stageStatusHint.innerHTML = '🎲 一般模式就緒！輕按 <kbd>Space 空白鍵</kbd> 或點擊按鈕抽取一位';
            if (stageBatchHud) stageBatchHud.classList.add('hidden');
          }
        } else if (s.status === 'SPINNING') {
          btnSpin.disabled = true;
          btnSpin.textContent = '搖獎中...';
          if (stageStatusHint) stageStatusHint.textContent = '命運搖獎中，敬請全場期待...';
        } else if (s.status === 'REVEALED') {
          btnSpin.disabled = false;
          btnSpin.textContent = '抽取下一位';
          if (stageStatusHint) stageStatusHint.innerHTML = '輕按 <kbd>Space 空白鍵</kbd> 繼續進行下一抽';
          if (stageBatchHud) stageBatchHud.classList.add('hidden');
        } else if (s.status === 'PARTIAL_FILLED') {
          btnSpin.disabled = false;
          btnSpin.textContent = '名冊抽空：結算大會';
          btnSpin.className = 'btn-stage-spin btn-secondary-action';
          if (stageStatusHint) stageStatusHint.textContent = '候選名冊人數少於剩餘名額，點擊直接提前結算大會';
          if (stageBatchHud) stageBatchHud.classList.add('hidden');
        } else if (s.status === 'COMPLETED') {
          btnSpin.disabled = true;
          btnSpin.textContent = '全數開出完畢';
          if (stageStatusHint) stageStatusHint.textContent = '恭喜所有得獎人！活動圓滿落幕。';
          if (chkLockBatchMode) chkLockBatchMode.checked = false;
          if (selBatchMode) selBatchMode.value = '';
          if (batchModeDesc) batchModeDesc.textContent = '全場抽獎已圓滿結束';
          if (stageBatchHud) stageBatchHud.classList.add('hidden');
        }
      }

      renderLiveFeed(s.history);
    }

    function triggerSpinAction() {
      audio.init();
      var s = state.getState();
      if (s.status === 'READY') {
        var selectedMode = selBatchMode ? selBatchMode.value : '';
        if (!selectedMode) {
          openDialog('請先設定抽獎模式', '請在右側下拉選單中選擇「一般模式」（一次抽一人）或「全開模式」（一次抽完此獎所有名額）後，再點擊抽獎。', false);
          if (selBatchMode) selBatchMode.focus();
          return;
        }

        try {
          if (selectedMode === 'BATCH_ALL') {
            var pending = state.startBatchSpin();
            updateStageView();
            var topName = pending.winnerName; // 嚴格保持純姓名，100% 杜絕名牌文字出血！
            if (stageBatchHud) {
              stageBatchHud.classList.remove('hidden');
              if (stageBatchHudText) stageBatchHudText.textContent = '⚡ 全開模式 ｜ 同時誕生 ' + pending.winners.length + ' 位幸運得主';
            }
            visualEngine.spinTo(pending.mode, pending.winnerIndex, topName, state.config.spinDurationMs, function() {
              var records = state.revealBatchWinners();
              audio.playBatchCelebration();
              confetti.fire(120);
              if (festiveAmbiance) festiveAmbiance.triggerCelebration();
              visualEngine.celebrateBatchWinners(pending.winners, 900, function() {
                if (modalPrizeTag) modalPrizeTag.textContent = '恭喜榮獲 ' + pending.prizeName + ' ｜ 全開 ' + records.length + ' 名';
                renderModalWinners(records);
                if (winnerModal) winnerModal.classList.add('active');
                if (stageBatchHud) stageBatchHud.classList.add('hidden');
                updateStageView();
              });
            });
          } else {
            var pending = state.startSpin();
            updateStageView();
            visualEngine.spinTo(pending.mode, pending.winnerIndex, pending.winnerName, state.config.spinDurationMs, function() {
              var record = state.revealWinner();
              audio.playFanfare();
              confetti.fire(75);
              if (festiveAmbiance) festiveAmbiance.triggerCelebration();
              visualEngine.celebrateWinner(record.winnerName, 800, function() {
                if (modalPrizeTag) modalPrizeTag.textContent = '恭喜榮獲 ' + record.prizeName;
                renderModalWinners([record]);
                if (winnerModal) winnerModal.classList.add('active');
                updateStageView();
              });
            });
          }
        } catch (err) {
          openDialog('開獎阻擋', err.message, false);
        }
      } else if (s.status === 'REVEALED') {
        closeModalAndProceed();
      } else if (s.status === 'PARTIAL_FILLED') {
        state.finishDraw();
        updateStageView();
        scheduleFinale();
      }
    }

    function closeModalAndProceed() {
      if (winnerModal) winnerModal.classList.remove('active');
      confetti.stop();
      var nextSt = state.continueSpin();
      visualEngine.setCandidates(state.candidatePool, state.initialCandidates);

      var isLocked = chkLockBatchMode && chkLockBatchMode.checked;
      if (!isLocked) {
        if (selBatchMode) selBatchMode.value = '';
        if (batchModeDesc) batchModeDesc.textContent = '每次抽完需重新設定模式';
      }

      updateStageView();

      if (nextSt === 'COMPLETED') {
        scheduleFinale();
      }
    }

    function closeModalOnly() {
      if (winnerModal) winnerModal.classList.remove('active');
      confetti.stop();
      if (state.getState().status === 'REVEALED') {
        var nextSt = state.continueSpin();
        visualEngine.setCandidates(state.candidatePool, state.initialCandidates);

        var isLocked = chkLockBatchMode && chkLockBatchMode.checked;
        if (!isLocked) {
          if (selBatchMode) selBatchMode.value = '';
          if (batchModeDesc) batchModeDesc.textContent = '每次抽完需重新設定模式';
        }

        updateStageView();
        if (nextSt === 'COMPLETED') {
          scheduleFinale();
        }
      }
    }

    function scheduleFinale() {
      if (finaleTimer) clearTimeout(finaleTimer);
      finaleTimer = setTimeout(function() {
        showFinaleCurtain();
      }, 3000);
    }

    function showFinaleCurtain() {
      audio.init();
      audio.playFinale();
      confetti.fire(140);
      if (festiveAmbiance) festiveAmbiance.triggerCelebration();
      var s = state.getState();
      var totalWinners = s.history.length;
      var totalPrizes = s.prizes.length;
      if (finaleTierTag) finaleTierTag.textContent = (s.config.eventName || '年度慶典抽獎大會') + ' ｜ 圓滿落幕';
      if (finaleTitleText) finaleTitleText.textContent = '感謝大家的參與';
      if (finaleSubtitleText) finaleSubtitleText.textContent = '恭喜所有幸運獲獎貴賓，感謝全體同仁與嘉賓熱情支持！';
      if (finaleStatsSummary) finaleStatsSummary.textContent = '全場共頒發 ' + totalPrizes + ' 項大獎 ｜ 誕生 ' + totalWinners + ' 位幸運得主';
      if (finaleModal) finaleModal.classList.add('active');
    }

    if (btnFinaleExportCsv) {
      btnFinaleExportCsv.onclick = function() {
        var history = state.getState().history;
        if (history.length === 0) {
          openDialog('尚無中獎紀錄', '目前尚未抽出任何中獎者，無法匯出報表。', false);
          return;
        }
        var csv = generateCsv(history);
        downloadFile(csv, (state.config.eventName || '大會抽獎結果') + '_' + Date.now() + '.csv', 'text/csv;charset=utf-8;');
      };
    }

    if (btnFinaleClose) {
      btnFinaleClose.onclick = function() {
        if (finaleModal) finaleModal.classList.remove('active');
      };
    }

    if (finaleModal) {
      finaleModal.onclick = function(e) {
        if (e.target === finaleModal) finaleModal.classList.remove('active');
      };
    }

    if (btnSpin) btnSpin.onclick = triggerSpinAction;
    if (btnModalContinue) {
      btnModalContinue.onclick = function() {
        if (state.getState().status === 'REVEALED') closeModalAndProceed();
      };
    }
    var btnModalClose = document.getElementById('btn-modal-close');
    if (btnModalClose) btnModalClose.onclick = closeModalOnly;
    if (winnerModal) {
      winnerModal.onclick = function(e) {
        if (e.target === winnerModal) closeModalOnly();
      };
    }

    window.addEventListener('keydown', function(e) {
      if (e.code === 'Space' && viewStage && viewStage.classList.contains('active')) {
        var activeTag = document.activeElement ? document.activeElement.tagName : '';
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          e.preventDefault();
          if (winnerModal && winnerModal.classList.contains('active')) {
            closeModalAndProceed();
          } else if (finaleModal && finaleModal.classList.contains('active')) {
            finaleModal.classList.remove('active');
          } else {
            triggerSpinAction();
          }
        }
      }
    });

    function renderLiveFeed(history) {
      if (!historyFeed) return;
      historyFeed.innerHTML = '';
      if (!history || history.length === 0) {
        historyFeed.innerHTML = '<div style="color:var(--text-muted); text-align:center; margin-top:40px; font-size:0.85rem;">大會即將開獎，拭目以待</div>';
        return;
      }
      history.slice().reverse().forEach(function(rec) {
        var item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = 
          '<div class="history-item-top">' +
            '<span class="history-prize-tag">' + escapeHtml(rec.prizeName) + '</span>' +
            '<span class="history-item-time">' + escapeHtml(rec.timestamp.split(' ')[1] || rec.timestamp) + '</span>' +
          '</div>' +
          '<div class="history-winner-name">' + escapeHtml(rec.winnerName) + '</div>';
        historyFeed.appendChild(item);
      });
    }

    if (btnExportCsv) {
      btnExportCsv.onclick = function() {
        var history = state.getState().history;
        if (history.length === 0) {
          openDialog('尚無中獎紀錄', '目前尚未抽出任何中獎者，無法匯出報表。', false);
          return;
        }
        var csv = generateCsv(history);
        downloadFile(csv, (state.config.eventName || '大會抽獎結果') + '_' + Date.now() + '.csv', 'text/csv;charset=utf-8;');
      };
    }

    if (btnExportHtml) {
      btnExportHtml.onclick = function() {
        try {
          var bundle = state.exportBundleBase64();
          var rawHtml = document.documentElement.outerHTML;
          var newHtml = rawHtml.replace(/<script id="__INITIAL_BUNDLE__"[^>]*>[\s\S]*?<\/script>/, '<script id="__INITIAL_BUNDLE__" type="text/plain">' + bundle + '<\/script>');
          downloadFile(newHtml, 'OfflineLuckyDraw_Archive_' + Date.now() + '.html', 'text/html;charset=utf-8;');
        } catch (e) {
          openDialog('自克隆失敗', e.message, false);
        }
      };
    }

    if (btnResetAll) {
      btnResetAll.onclick = function() {
        openDialog('重置大會確認', '確定要重置整個抽獎大會？所有歷史紀錄將被抹除。', true, function() {
          visualEngine.stop();
          confetti.stop();
          if (festiveAmbiance) festiveAmbiance.stop();
          if (winnerModal) winnerModal.classList.remove('active');
          if (finaleModal) finaleModal.classList.remove('active');
          if (finaleTimer) clearTimeout(finaleTimer);
          if (chkLockBatchMode) chkLockBatchMode.checked = false;
          if (selBatchMode) selBatchMode.value = '';
          state.reset();
          viewStage.classList.remove('active');
          viewSetup.classList.add('active');
          if (btnEmergencyEdit) btnEmergencyEdit.classList.add('hidden');
          renderPrizeInputs();
        });
      };
    }

    state.subscribe(function(eventName, newState) {
      if (newState && newState.prizes) {
        updatePrizeCountBadge();
      }
      if (newState && newState.candidatePool && candidateBadge) {
        candidateBadge.textContent = newState.candidatePool.length + ' 人登記';
      }
      if (newState && newState.history && historyCounter) {
        historyCounter.textContent = newState.history.length + ' 人獲獎';
        if (historyCounterBadge) historyCounterBadge.textContent = newState.history.length + '人';
      }
      if (viewStage && viewStage.classList.contains('active')) {
        updateStageView();
      }
      if (eventName === 'ASPECT_RATIO_CHANGED' || (newState && newState.config && newState.config.aspectRatio)) {
        applyAspectRatio(newState.config.aspectRatio || '16:9');
      }
    });

    var bundleScript = document.getElementById('__INITIAL_BUNDLE__');
    if (bundleScript && bundleScript.textContent.trim().length > 0) {
      state.importBundleBase64(bundleScript.textContent.trim());
      if (inputCandidates) inputCandidates.value = state.rawInputText;
      if (themeSelector) themeSelector.value = state.config.theme;
      document.body.setAttribute('data-theme', state.config.theme);
      if (festiveAmbiance) festiveAmbiance.setTheme(state.config.theme);
      if (visualEngine) visualEngine.setTheme(state.config.theme);
      if (inputEventName) inputEventName.value = state.config.eventName;
      if (headerBrandTitle) headerBrandTitle.textContent = state.config.eventName;
      applyAspectRatio(state.config.aspectRatio || '16:9');
      renderPrizeInputs();
      if (state.history.length > 0) switchToStage();
    } else {
      renderPrizeInputs();
      if (themeSelector) document.body.setAttribute('data-theme', themeSelector.value);
      applyAspectRatio(state.config.aspectRatio || '16:9');
    }
  })();
"""
full_js = "\n\n".join([
    state_code,
    audio_code,
    confetti_code,
    festive_code,
    visual_code,
    helpers_and_ui
])

style_m = re.search(r'<style>(.*?)</style>', html, re.DOTALL)
css = style_m.group(1)
css = re.sub(r'/\*.*?\*/', '', css, flags=re.DOTALL)
css = re.sub(r'\s+', ' ', css)
css = re.sub(r'\s*([{};:,>])\s*', r'\1', css)
css = css.replace(';}', '}')

proc = subprocess.Popen(['npx', 'terser', '--compress', 'passes=2,drop_console=true', '--mangle'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
out_js, err_js = proc.communicate(input=full_js)
if proc.returncode != 0:
    raise Exception("Terser error: " + err_js)

head_part = html[:style_m.start()]
body_part = html[style_m.end():html.find('<script>')]
body_part = re.sub(r'<!--.*?-->', '', body_part, flags=re.DOTALL)
body_part = re.sub(r'>\s+<', '><', body_part)
body_part = re.sub(r'\s{2,}', ' ', body_part)

result_html = head_part + '<style>' + css.strip() + '</style>' + body_part.strip() + '<script>\n' + out_js.strip() + '\n</script>\n</body>\n</html>'

result_bytes = result_html.encode('utf-8')
result_bytes = result_bytes.replace(b'\\ufeff', b'\\uFEFF')

with open('index.html', 'wb') as f:
    f.write(result_bytes)

sz = len(result_bytes)
print(f"Build complete! index.html size: {sz} bytes ({sz / 1024:.2f} KB)")
if sz <= 5 * 1024 * 1024:
    print(f"PASS: Size <= 5 MB budget ({sz / 1024:.2f} KB)")
else:
    print(f"OVER BUDGET by {sz - 5 * 1024 * 1024} bytes")

