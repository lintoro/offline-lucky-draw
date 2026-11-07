import subprocess, os, re

def build():
    with open('src/stateManager.js', 'r', encoding='utf-8') as f:
        state_code = f.read()

    with open('src/audioSynthesizer.js', 'r', encoding='utf-8') as f:
        audio_code = f.read()

    with open('src/confetti.js', 'r', encoding='utf-8') as f:
        confetti_code = f.read()

    with open('src/masterVisualEngine.js', 'r', encoding='utf-8') as f:
        visual_code = f.read()

    with open('src/exporter.js', 'r', encoding='utf-8') as f:
        export_code = f.read()

    ui_code = """
  function sanitizeCsvCell(val) {
    if (val === null || val === undefined) return '""';
    var str = String(val);
    if (/^[=+\\-@]/.test(str)) str = "'" + str;
    if (/[",\\r\\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return '"' + str + '"';
  }

  function generateCsv(history) {
    var lines = ['\\uFEFF序號,獎項名稱,中獎姓名,抽獎時間'];
    (history || []).forEach(function(rec, i) {
      lines.push([
        sanitizeCsvCell(rec.sequence || (i + 1)),
        sanitizeCsvCell(rec.prizeName),
        sanitizeCsvCell(rec.winnerName),
        sanitizeCsvCell(rec.timestamp)
      ].join(','));
    });
    return lines.join('\\r\\n');
  }

  function downloadFile(content, fileName, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initApp() {
    var state = new StateManager({
      eventName: '2026 年度盛典離線抽獎大會',
      theme: 'OBSIDIAN_GOLD',
      prizes: [
        { name: '特獎 (大獎)', totalQuota: 1 },
        { name: '頭獎', totalQuota: 2 },
        { name: '二獎 (普獎)', totalQuota: 5 }
      ]
    });

    var audio = new AudioSynthesizer();
    var confetti = new ConfettiEngine(document.getElementById('confetti-canvas'));
    var visualEngine = new MasterVisualEngine(document.getElementById('stage-canvas'), audio);

    var viewSetup = document.getElementById('view-setup');
    var viewStage = document.getElementById('view-stage');
    var inputEventName = document.getElementById('input-event-name');
    var selTheme = document.getElementById('select-theme');
    var inputCandidates = document.getElementById('input-candidates');
    var candidateBadge = document.getElementById('candidate-count-badge');
    var prizesList = document.getElementById('prizes-list');
    var btnAddPrize = document.getElementById('btn-add-prize');
    var selDrawOrder = document.getElementById('config-draw-order');
    var chkAllowDup = document.getElementById('config-allow-duplicates');
    var inputMaxWin = document.getElementById('config-max-win');
    var wrapMaxWin = document.getElementById('wrap-max-win');
    var chkAutoSwitch = document.getElementById('config-auto-switch');
    var btnToStage = document.getElementById('btn-to-stage');
    var btnSpin = document.getElementById('btn-spin');
    var btnEmergencyEdit = document.getElementById('btn-emergency-edit');
    var btnExportCsv = document.getElementById('btn-export-csv');
    var btnSelfClone = document.getElementById('btn-self-clone');
    var btnFullscreen = document.getElementById('btn-fullscreen');
    var stageTitle = document.getElementById('stage-title');
    var stageRoundPill = document.getElementById('stage-round-pill');
    var stageRemainingPill = document.getElementById('stage-remaining-pill');
    var stageCandidatePill = document.getElementById('stage-candidate-pill');
    var stageAnimBadge = document.getElementById('stage-anim-badge');
    var historyFeed = document.getElementById('history-feed');
    var historyCount = document.getElementById('history-count');
    var winnerModal = document.getElementById('winner-modal');
    var modalPrizeTag = document.getElementById('modal-prize-tag');
    var modalWinnerName = document.getElementById('modal-winner-name');
    var btnModalNext = document.getElementById('btn-modal-next');
    var dialogOverlay = document.getElementById('dialog-overlay');
    var dialogTitle = document.getElementById('dialog-title');
    var dialogMessage = document.getElementById('dialog-message');
    var btnDialogCancel = document.getElementById('btn-dialog-cancel');
    var btnDialogConfirm = document.getElementById('btn-dialog-confirm');

    var currentDialogCb = null;
    function openDialog(opts) {
      dialogTitle.textContent = opts.title || '系統提示';
      dialogMessage.textContent = opts.message || '';
      btnDialogCancel.style.display = opts.showCancel ? 'inline-block' : 'none';
      btnDialogConfirm.textContent = opts.confirmText || '確認';
      currentDialogCb = opts.onConfirm || null;
      dialogOverlay.classList.add('active');
    }

    btnDialogConfirm.onclick = function() {
      dialogOverlay.classList.remove('active');
      if (typeof currentDialogCb === 'function') currentDialogCb();
      currentDialogCb = null;
    };
    btnDialogCancel.onclick = function() {
      dialogOverlay.classList.remove('active');
      currentDialogCb = null;
    };

    function applyTheme(theme) {
      document.body.setAttribute('data-theme', theme);
      state.setTheme(theme);
      selTheme.value = theme;
    }

    selTheme.onchange = function() {
      applyTheme(selTheme.value);
    };

    inputEventName.oninput = function() {
      state.setEventName(inputEventName.value.trim() || '純前端離線抽獎大會');
    };

    chkAllowDup.onchange = function() {
      wrapMaxWin.style.display = chkAllowDup.checked ? 'inline-flex' : 'none';
    };

    function renderPrizeInputs() {
      prizesList.innerHTML = '';
      var order = selDrawOrder.value;
      state.config.prizes.forEach(function(p, i) {
        var card = document.createElement('div');
        card.className = 'prize-card';

        var orderLabel = '';
        if (order === 'BOTTOM_UP') {
          orderLabel = (i === state.config.prizes.length - 1) ? '壓軸大獎' : ('第 ' + (i + 1) + ' 順位');
        } else {
          orderLabel = (i === 0) ? '首抽大獎' : ('第 ' + (i + 1) + ' 順位');
        }

        card.innerHTML = 
          '<span class="prize-rank-pill">' + orderLabel + '</span>' +
          '<input type="text" class="prize-name" value="' + escapeHtml(p.name) + '" placeholder="獎項名稱">' +
          '<input type="number" class="prize-quota" min="1" value="' + (p.totalQuota || 1) + '" placeholder="名額">' +
          '<div class="reorder-btns">' +
            '<button type="button" class="btn-icon btn-move-up" ' + (i === 0 ? 'disabled style="opacity:0.2"' : '') + '>▲</button>' +
            '<button type="button" class="btn-icon btn-move-down" ' + (i === state.config.prizes.length - 1 ? 'disabled style="opacity:0.2"' : '') + '>▼</button>' +
          '</div>' +
          '<button type="button" class="btn-icon btn-delete-prize" style="color:#ef4444;" ' + (state.config.prizes.length <= 1 ? 'disabled style="opacity:0.2"' : '') + '>✕</button>';
        prizesList.appendChild(card);
      });
      syncPrizeListeners();
    }

    function syncPrizeListeners() {
      var cards = prizesList.querySelectorAll('.prize-card');
      cards.forEach(function(c, i) {
        var inputName = c.querySelector('.prize-name');
        var inputQuota = c.querySelector('.prize-quota');
        var btnUp = c.querySelector('.btn-move-up');
        var btnDown = c.querySelector('.btn-move-down');
        var btnDel = c.querySelector('.btn-delete-prize');

        inputName.oninput = function() { state.config.prizes[i].name = inputName.value; };
        inputQuota.oninput = function() { state.config.prizes[i].totalQuota = parseInt(inputQuota.value, 10) || 1; };
        btnUp.onclick = function() { state.reorderPrize(i, i - 1); renderPrizeInputs(); };
        btnDown.onclick = function() { state.reorderPrize(i, i + 1); renderPrizeInputs(); };
        btnDel.onclick = function() {
          if (state.config.prizes.length > 1) {
            state.config.prizes.splice(i, 1);
            renderPrizeInputs();
          }
        };
      });
    }

    btnAddPrize.onclick = function() {
      state.config.prizes.push({ name: '新獎項', totalQuota: 1 });
      renderPrizeInputs();
    };

    selDrawOrder.onchange = function() {
      state.setDrawOrder(selDrawOrder.value);
      renderPrizeInputs();
    };

    inputCandidates.oninput = function() {
      var list = parseCandidateText(inputCandidates.value);
      candidateBadge.textContent = list.length + ' 人';
    };

    document.getElementById('btn-tool-trim').onclick = function() {
      var list = parseCandidateText(inputCandidates.value);
      inputCandidates.value = list.join('\\n');
      candidateBadge.textContent = list.length + ' 人';
    };
    document.getElementById('btn-tool-dedup').onclick = function() {
      var list = parseCandidateText(inputCandidates.value);
      var set = Array.from(new Set(list));
      inputCandidates.value = set.join('\\n');
      candidateBadge.textContent = set.length + ' 人';
    };
    document.getElementById('btn-tool-mock50').onclick = function() {
      var arr = [];
      for (var k = 1; k <= 50; k++) arr.push('測試員工_' + (k < 10 ? '0' : '') + k);
      inputCandidates.value = arr.join('\\n');
      candidateBadge.textContent = arr.length + ' 人';
    };

    var dropzone = document.getElementById('file-dropzone');
    var fileInput = document.getElementById('input-file-import');
    dropzone.onclick = function() { fileInput.click(); };
    fileInput.onchange = function(e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(evt) {
        inputCandidates.value = evt.target.result;
        var list = parseCandidateText(inputCandidates.value);
        candidateBadge.textContent = list.length + ' 人';
      };
      reader.readAsText(file);
    };

    btnToStage.onclick = function() {
      try {
        var names = parseCandidateText(inputCandidates.value);
        state.config.allowDuplicates = chkAllowDup.checked;
        state.config.maxWinLimit = chkAllowDup.checked ? (parseInt(inputMaxWin.value, 10) || 2) : 0;
        state.config.autoSwitchTier = chkAutoSwitch.checked;
        state.config.eventName = inputEventName.value.trim() || '純前端離線抽獎大會';
        state.config.theme = selTheme.value;
        state.initialize(names, state.config);
        visualEngine.setCandidates(state.candidatePool);
        switchToStage();
      } catch (err) {
        openDialog({ title: '設定防呆阻擋', message: err.message });
      }
    };

    function switchToStage() {
      viewSetup.classList.remove('active');
      viewStage.classList.add('active');
      updateStageView();
    }

    function updateStageView() {
      var cur = state.getCurrentPrize();
      stageTitle.textContent = state.config.eventName + (cur ? (' ｜ ' + cur.name) : ' ｜ 抽獎大會已圓滿落幕');
      var orderLabel = state.config.drawOrder === 'BOTTOM_UP' ? '循序漸進' : '大獎首抽';
      stageRoundPill.textContent = '抽獎順序：' + orderLabel + ' ｜ 第 ' + (state.currentPrizeIndex + 1) + ' 輪 (共 ' + state.config.prizes.length + ' 輪)';
      stageRemainingPill.innerHTML = '獎項剩餘名額：<strong>' + (cur ? cur.remainingQuota : 0) + '</strong>';
      stageCandidatePill.innerHTML = '可抽候選總人數：<strong>' + state.candidatePool.length + '</strong>';

      var modeNames = {
        'WINDOWED_WHEEL': '動態視窗輪盤',
        'LOTTO_EGG': '氣壓式彩球抽獎機',
        'SLOT_MACHINE': '復古拉霸輪軸',
        'SPLIT_FLAP': '翻牌式機械看板',
        'HYPERSPACE': '時空跳躍光斑'
      };
      var nextMode = state.getPrizeAnimationMode(state.currentPrizeIndex);
      stageAnimBadge.textContent = '開獎模式：' + (modeNames[nextMode] || '動態輪盤');
      visualEngine.setMode(nextMode);

      if (state.status === 'READY') {
        btnSpin.disabled = false;
        btnSpin.textContent = '開始抽獎 (SPACE)';
        btnSpin.className = 'btn-cta btn-gold-action';
      } else if (state.status === 'SPINNING') {
        btnSpin.disabled = true;
        btnSpin.textContent = '開獎中...';
      } else if (state.status === 'REVEALED') {
        btnSpin.disabled = false;
        btnSpin.textContent = '確認領獎並繼續 (SPACE)';
      } else if (state.status === 'PARTIAL_FILLED') {
        btnSpin.disabled = false;
        btnSpin.textContent = '名冊抽空：結算大會';
        btnSpin.className = 'btn-cta btn-secondary-action';
      } else if (state.status === 'COMPLETED') {
        btnSpin.disabled = true;
        btnSpin.textContent = '全數獎項開出完畢';
      }

      renderLiveFeed();
    }

    function triggerSpinAction() {
      audio.init();
      var s = state.status;
      if (s === 'READY') {
        try {
          var pending = state.startSpin();
          updateStageView();
          visualEngine.spinTo(pending.mode, pending.winnerIndex, pending.winnerName, state.config.spinDurationMs, function() {
            var record = state.revealWinner();
            audio.playFanfare();
            confetti.fire(75);
            // 音畫共振慶祝 800ms，在第 800ms 樂音收斂時無縫滑出得獎彈窗
            visualEngine.celebrateWinner(record.winnerName, 800, function() {
              modalPrizeTag.textContent = '恭喜榮獲 ' + record.prizeName;
              modalWinnerName.textContent = record.winnerName;
              winnerModal.classList.add('active');
              updateStageView();
            });
          });
        } catch (err) {
          console.warn(err);
        }
      } else if (s === 'REVEALED') {
        winnerModal.classList.remove('active');
        confetti.stop();
        state.continueSpin();
        visualEngine.setCandidates(state.candidatePool);
        updateStageView();
      } else if (s === 'PARTIAL_FILLED') {
        state.finishDraw();
        updateStageView();
      }
    }

    btnSpin.onclick = triggerSpinAction;
    btnModalNext.onclick = function() {
      if (state.status === 'REVEALED') triggerSpinAction();
    };

    window.addEventListener('keydown', function(e) {
      if (e.code === 'Space' && viewStage.classList.contains('active')) {
        var activeTag = document.activeElement ? document.activeElement.tagName : '';
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          e.preventDefault();
          triggerSpinAction();
        }
      }
    });

    function renderLiveFeed() {
      historyFeed.innerHTML = '';
      historyCount.textContent = state.history.length + ' 人';
      state.history.slice().reverse().forEach(function(rec) {
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

    btnEmergencyEdit.onclick = function() {
      openDialog({
        title: '緊急編輯返回',
        message: '確認要返回設定頁面嗎？已抽出的中獎紀錄將會完整保留，未抽出的獎項可隨時調整。',
        showCancel: true,
        confirmText: '確認返回',
        onConfirm: function() {
          visualEngine.stop();
          confetti.stop();
          state.emergencyEdit();
          viewStage.classList.remove('active');
          viewSetup.classList.add('active');
          renderPrizeInputs();
        }
      });
    };

    btnExportCsv.onclick = function() {
      if (state.history.length === 0) {
        openDialog({ title: '尚無中獎紀錄', message: '目前尚未抽出任何中獎者，無法匯出報表。' });
        return;
      }
      var csv = generateCsv(state.history);
      downloadFile(csv, (state.config.eventName || '抽獎結果') + '_' + Date.now() + '.csv', 'text/csv;charset=utf-8;');
    };

    btnSelfClone.onclick = function() {
      try {
        var bundle = state.exportBundle();
        var rawHtml = document.documentElement.outerHTML;
        var newHtml = rawHtml.replace(/<script id="__INITIAL_BUNDLE__"[^>]*>[\s\S]*?<\/script>/, '<script id="__INITIAL_BUNDLE__" type="application/json">' + bundle + '<\\/script>');
        downloadFile(newHtml, 'OfflineLuckyDraw_Archive_' + Date.now() + '.html', 'text/html;charset=utf-8;');
      } catch (e) {
        openDialog({ title: '自克隆封裝失敗', message: e.message });
      }
    };

    btnFullscreen.onclick = function() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function() {});
      } else {
        document.exitFullscreen().catch(function() {});
      }
    };

    applyTheme(state.config.theme);
    renderPrizeInputs();
    candidateBadge.textContent = '0 人';

    var anchor = document.getElementById('__INITIAL_BUNDLE__');
    if (anchor && anchor.textContent && anchor.textContent.trim()) {
      try {
        state.importBundle(anchor.textContent.trim());
        inputCandidates.value = state.candidates.join('\\n');
        candidateBadge.textContent = state.candidates.length + ' 人';
        inputEventName.value = state.config.eventName;
        applyTheme(state.config.theme);
        renderPrizeInputs();
        if (state.history.length > 0) switchToStage();
      } catch (err) {
        console.warn('自克隆還原失敗:', err);
      }
    }
  }

  window.addEventListener('DOMContentLoaded', initApp);
"""

    full_js = "\n\n".join([
        state_code,
        audio_code,
        confetti_code,
        visual_code,
        ui_code
    ])

    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    style_m = re.search(r'<style>(.*?)</style>', html, re.DOTALL)
    css = style_m.group(1)

    # Minify CSS
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.DOTALL)
    css = re.sub(r'\s+', ' ', css)
    css = re.sub(r'\s*([{};:,>])\s*', r'\1', css)
    css = css.replace(';}', '}')

    # Minify JS with terser
    proc = subprocess.Popen(['npx', 'terser', '--compress'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    out_js, err_js = proc.communicate(input=full_js)
    if proc.returncode != 0:
        raise Exception("Terser error: " + err_js)

    # Assemble HTML
    head_part = html[:style_m.start()]
    body_part = html[style_m.end():html.find('<script>')]
    body_part = re.sub(r'>\s+<', '><', body_part)

    result_html = head_part + '<style>' + css.strip() + '</style>' + body_part + '<script>\n' + out_js.strip() + '\n</script>\n</body>\n</html>'

    # Binary check and fix BOM representation
    result_bytes = result_html.encode('utf-8')
    result_bytes = result_bytes.replace(b'\\ufeff', b'\\uFEFF')

    with open('index.html', 'wb') as f:
        f.write(result_bytes)

    sz = len(result_bytes)
    print(f"Build complete! index.html size: {sz} bytes ({sz / 1024:.2f} KB)")
    if sz <= 65 * 1024:
        print("PASS: Size <= 65 KB budget")
    else:
        print("FAIL: Size exceeds 65 KB budget")

if __name__ == '__main__':
    build()
