// ============================================
// Pea 全能格式转换器 - 交互脚本
// ============================================

(function () {
  'use strict';

  // ---------- 全局状态（用 localStorage 模拟跨页面） ----------
  const STORAGE_KEY = 'pea_converter_state';
  const defaultState = {
    files: [
      { id: 1, name: '年度报告.docx', size: 2458624, srcFormat: 'DOCX', status: 'wait', progress: 0, targetFormat: 'PDF' },
      { id: 2, name: '产品演示.pptx', size: 5242880, srcFormat: 'PPTX', status: 'wait', progress: 0, targetFormat: 'PDF' },
      { id: 3, name: '风景照片.png', size: 3145728, srcFormat: 'PNG', status: 'wait', progress: 0, targetFormat: 'JPG' }
    ],
    settings: {
      quality: 'high',
      outputDir: 'downloads',
      autoOpen: true,
      preserveMeta: true
    }
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return JSON.parse(JSON.stringify(defaultState));
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function resetState() {
    saveState(JSON.parse(JSON.stringify(defaultState)));
  }

  // ---------- 工具函数 ----------
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }

  function getFileIconExt(format) {
    const f = format.toLowerCase();
    if (['doc', 'docx'].includes(f)) return 'doc';
    if (['ppt', 'pptx'].includes(f)) return 'ppt';
    if (['xls', 'xlsx'].includes(f)) return 'xls';
    if (['pdf'].includes(f)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(f)) return 'img';
    if (['mp3', 'wav', 'flac', 'aac'].includes(f)) return 'audio';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(f)) return 'video';
    if (['zip', 'rar', '7z'].includes(f)) return 'zip';
    if (['txt', 'md'].includes(f)) return 'txt';
    return 'file';
  }

  function getFileColor(format) {
    const ext = getFileIconExt(format);
    const map = {
      doc: 'linear-gradient(135deg, var(--chart-2), var(--chart-3))',
      ppt: 'linear-gradient(135deg, #f97316, #ea580c)',
      xls: 'linear-gradient(135deg, var(--chart-2), #10b981)',
      pdf: 'linear-gradient(135deg, var(--destructive), #dc2626)',
      img: 'linear-gradient(135deg, var(--chart-4), var(--primary))',
      audio: 'linear-gradient(135deg, #8b5cf6, var(--chart-1))',
      video: 'linear-gradient(135deg, #ec4899, var(--destructive))',
      zip: 'linear-gradient(135deg, #f59e0b, #d97706)',
      txt: 'linear-gradient(135deg, var(--muted-foreground), var(--foreground))',
      file: 'linear-gradient(135deg, var(--chart-1), var(--chart-4))'
    };
    return map[ext] || map.file;
  }

  function getFileEmoji(format) {
    const ext = getFileIconExt(format);
    const map = { doc: '📝', ppt: '📊', xls: '📈', pdf: '📕', img: '🖼️', audio: '🎵', video: '🎬', zip: '🗂️', txt: '📄', file: '📁' };
    return map[ext] || '📁';
  }

  function showToast(message, type = 'info', duration = 2500) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.borderLeftColor = type === 'err' ? 'var(--destructive)' : type === 'ok' ? 'var(--chart-2)' : 'var(--primary)';
    toast.style.borderLeftWidth = '3px';
    requestAnimationFrame(() => toast.classList.add('show'));
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), duration);
  }

  // ---------- 首页功能 ----------
  function initHomePage() {
    const uploadInput = document.getElementById('file-upload');
    const dropZone = document.querySelector('[data-dropzone]');
    const ctaBtn = document.querySelector('[data-dom-id="cta-upload-start"]');

    if (dropZone) {
      ['dragenter', 'dragover'].forEach(evt => {
        dropZone.addEventListener(evt, e => {
          e.preventDefault();
          dropZone.classList.add('drag-over');
        });
      });
      ['dragleave', 'drop'].forEach(evt => {
        dropZone.addEventListener(evt, e => {
          e.preventDefault();
          dropZone.classList.remove('drag-over');
        });
      });
      dropZone.addEventListener('drop', e => {
        const files = Array.from(e.dataTransfer.files);
        addFiles(files);
      });
    }

    if (uploadInput) {
      uploadInput.addEventListener('change', e => {
        const files = Array.from(e.target.files);
        addFiles(files);
        uploadInput.value = '';
      });
    }

    if (ctaBtn) {
      ctaBtn.addEventListener('click', e => {
        const state = loadState();
        if (!state.files.length) {
          e.preventDefault();
          showToast('请先上传至少一个文件', 'err');
        }
      });
    }

    // 格式卡片点击
    document.querySelectorAll('[data-format-card]').forEach(card => {
      card.addEventListener('click', () => {
        showToast('格式已添加到偏好设置', 'ok');
      });
    });
  }

  function addFiles(fileList) {
    const state = loadState();
    let added = 0;
    fileList.forEach(f => {
      const ext = (f.name.split('.').pop() || '').toUpperCase();
      state.files.push({
        id: Date.now() + Math.random(),
        name: f.name,
        size: f.size,
        srcFormat: ext || 'FILE',
        status: 'wait',
        progress: 0,
        targetFormat: suggestTarget(ext)
      });
      added++;
    });
    saveState(state);
    if (added) {
      showToast(`已添加 ${added} 个文件`, 'ok');
      setTimeout(() => { location.href = 'settings.html'; }, 500);
    }
  }

  function suggestTarget(srcExt) {
    const map = {
      DOCX: 'PDF', DOC: 'PDF', PPTX: 'PDF', PPT: 'PDF',
      XLSX: 'CSV', XLS: 'CSV',
      PNG: 'JPG', JPG: 'PNG', BMP: 'PNG', WEBP: 'PNG',
      MP4: 'MP3', MOV: 'MP4', AVI: 'MP4',
      WAV: 'MP3', FLAC: 'MP3',
      ZIP: '7Z', RAR: 'ZIP',
      TXT: 'PDF', MD: 'PDF'
    };
    return map[srcExt && srcExt.toUpperCase()] || 'PDF';
  }

  // ---------- 转换设置页 ----------
  function initSettingsPage() {
    renderFileList();
    renderTargetFormats();
    renderSettings();

    const addBtn = document.querySelector('[data-dom-id="action-add-files"]');
    const clearBtn = document.querySelector('[data-dom-id="action-clear-list"]');
    const startBtn = document.querySelector('[data-dom-id="action-start-convert"]');
    const backBtn = document.querySelector('[data-dom-id="action-back"]');

    if (addBtn) {
      const hidden = document.createElement('input');
      hidden.type = 'file';
      hidden.multiple = true;
      hidden.style.display = 'none';
      addBtn.appendChild(hidden);
      addBtn.addEventListener('click', () => hidden.click());
      hidden.addEventListener('change', e => {
        addFiles(Array.from(e.target.files));
        hidden.value = '';
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const state = loadState();
        if (!state.files.length) return;
        if (confirm('确定要清空文件列表吗？')) {
          state.files = [];
          saveState(state);
          renderFileList();
          showToast('已清空文件列表', 'info');
        }
      });
    }

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const state = loadState();
        if (!state.files.length) {
          showToast('请先添加文件', 'err');
          return;
        }
        // 重置状态为等待
        state.files.forEach(f => { f.status = 'wait'; f.progress = 0; });
        saveState(state);
        location.href = 'progress.html';
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => location.href = 'index.html');
    }

    // 设置开关
    document.querySelectorAll('[data-setting]').forEach(el => {
      el.addEventListener('change', () => {
        const state = loadState();
        const key = el.dataset.setting;
        if (el.type === 'checkbox') {
          state.settings[key] = el.checked;
        } else {
          state.settings[key] = el.value;
        }
        saveState(state);
      });
    });
  }

  function renderFileList() {
    const container = document.querySelector('[data-file-list]');
    if (!container) return;
    const state = loadState();
    const countBadge = document.querySelector('[data-files-count]');
    if (countBadge) countBadge.textContent = state.files.length;
    if (!state.files.length) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <span data-icon class="h-12 w-12 text-muted-foreground/40 mb-3" style="mask-image:url(assets/image_1_tgt36j.svg);-webkit-mask-image:url(assets/image_1_tgt36j.svg);"></span>
          <p class="text-sm text-muted-foreground">暂无待转换文件，请添加文件后继续</p>
        </div>`;
      return;
    }

    container.innerHTML = state.files.map(f => `
      <div class="file-item flex items-center gap-3 px-4 py-3 fade-in">
        <span class="ic" style="width:36px;height:36px;flex:none;border-radius:10px;display:grid;place-items:center;font-size:16px;color:var(--primary-foreground);background:${getFileColor(f.srcFormat)}">${getFileEmoji(f.srcFormat)}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-card-foreground truncate">${f.name}</span>
          </div>
          <div class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>${f.srcFormat}</span>
            <span class="w-1 h-1 rounded-full bg-current opacity-40"></span>
            <span>${formatSize(f.size)}</span>
            <span class="w-1 h-1 rounded-full bg-current opacity-40 hide-sm"></span>
            <span class="hide-sm">→ 目标格式:</span>
          </div>
        </div>
        <div class="flex items-center gap-2 hide-sm">
          <select data-target-select="${f.id}" class="h-8 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            ${renderTargetOptions(f.srcFormat, f.targetFormat)}
          </select>
        </div>
        <button data-remove-file="${f.id}" class="act inline-flex items-center justify-center w-8 h-8 border-0 rounded-lg bg-transparent text-muted-foreground cursor-pointer hover:bg-muted hover:text-foreground transition-colors" aria-label="移除">
          <span data-icon class="h-4 w-4" style="mask-image:url(assets/image_5_tgt36j.svg);-webkit-mask-image:url(assets/image_5_tgt36j.svg);"></span>
        </button>
      </div>
    `).join('');

    // 绑定事件
    container.querySelectorAll('[data-remove-file]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.removeFile);
        const state = loadState();
        state.files = state.files.filter(x => x.id !== id);
        saveState(state);
        renderFileList();
        showToast('已移除文件', 'info');
      });
    });
    container.querySelectorAll('[data-target-select]').forEach(sel => {
      sel.addEventListener('change', () => {
        const id = Number(sel.dataset.targetSelect);
        const state = loadState();
        const f = state.files.find(x => x.id === id);
        if (f) { f.targetFormat = sel.value; saveState(state); }
      });
    });
  }

  function renderTargetOptions(srcFormat, selected) {
    const formats = ['PDF', 'DOCX', 'DOC', 'TXT', 'MD', 'HTML', 'JPG', 'PNG', 'WEBP', 'GIF', 'MP4', 'MP3', 'WAV', 'ZIP', 'CSV', 'XLSX'];
    return formats.map(f => `<option value="${f}" ${f === selected ? 'selected' : ''}>${f}</option>`).join('');
  }

  function renderTargetFormats() {
    const grid = document.querySelector('[data-target-grid]');
    if (!grid) return;
    const popular = ['PDF', 'DOCX', 'JPG', 'PNG', 'MP4', 'MP3', 'XLSX', 'ZIP'];
    grid.innerHTML = popular.map((fmt, i) => `
      <button data-target-fmt="${fmt}" class="target-card flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-card text-card-foreground cursor-pointer transition-all hover:border-primary/40 hover:bg-accent/30 ${i === 0 ? 'border-primary/60 ring-1 ring-primary/30 bg-accent/20' : ''}">
        <span class="text-2xl">${getFileEmoji(fmt)}</span>
        <span class="text-sm font-semibold">${fmt}</span>
      </button>
    `).join('');
    grid.querySelectorAll('[data-target-fmt]').forEach(btn => {
      btn.addEventListener('click', () => {
        const fmt = btn.dataset.targetFmt;
        grid.querySelectorAll('[data-target-fmt]').forEach(b => {
          b.classList.remove('border-primary/60', 'ring-1', 'ring-primary/30', 'bg-accent/20');
        });
        btn.classList.add('border-primary/60', 'ring-1', 'ring-primary/30', 'bg-accent/20');
        const state = loadState();
        state.files.forEach(f => f.targetFormat = fmt);
        saveState(state);
        renderFileList();
        showToast(`所有文件目标格式已设为 ${fmt}`, 'ok');
      });
    });
  }

  function renderSettings() {
    const state = loadState();
    Object.keys(state.settings).forEach(key => {
      const el = document.querySelector(`[data-setting="${key}"]`);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!state.settings[key];
      else el.value = state.settings[key];
    });
  }

  // ---------- 转换进度页 ----------
  let progressTimers = [];

  function initProgressPage() {
    const state = loadState();
    if (!state.files.length) {
      setTimeout(() => location.href = 'settings.html', 800);
      return;
    }
    renderProgress();
    startProgressSimulation();

    const retryBtn = document.querySelector('[data-dom-id="action-retry-failed"]');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        const st = loadState();
        const failed = st.files.filter(f => f.status === 'err');
        if (!failed.length) { showToast('没有失败的项目', 'info'); return; }
        failed.forEach(f => { f.status = 'wait'; f.progress = 0; });
        saveState(st);
        progressTimers.forEach(t => clearInterval(t));
        progressTimers = [];
        renderProgress();
        startProgressSimulation();
        showToast(`已重试 ${failed.length} 个失败项`, 'ok');
      });
    }

    const pauseBtn = document.querySelector('[data-dom-id="action-pause"]');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        if (pauseBtn.dataset.paused === '1') {
          pauseBtn.dataset.paused = '0';
          pauseBtn.innerHTML = '<span data-icon class="inline-flex" style="width:14px;height:14px;mask-image:url(assets/image_6_tgt36j.svg);-webkit-mask-image:url(assets/image_6_tgt36j.svg);"></span>暂停全部';
          startProgressSimulation();
          showToast('已继续转换', 'info');
        } else {
          pauseBtn.dataset.paused = '1';
          pauseBtn.innerHTML = '<span data-icon class="inline-flex" style="width:14px;height:14px;mask-image:url(assets/image_8_tgt36j.svg);-webkit-mask-image:url(assets/image_8_tgt36j.svg);"></span>继续';
          progressTimers.forEach(t => clearInterval(t));
          progressTimers = [];
          showToast('已暂停转换', 'info');
        }
      });
    }
  }

  function renderProgress() {
    const state = loadState();
    const container = document.querySelector('[data-progress-list]');
    const overallBar = document.querySelector('[data-overall-progress]');
    const overallPct = document.querySelector('[data-overall-pct]');
    const overallCount = document.querySelector('[data-overall-count]');

    const total = state.files.length;
    const done = state.files.filter(f => f.status === 'ok').length;
    const failed = state.files.filter(f => f.status === 'err').length;
    const avgProg = Math.round(state.files.reduce((s, f) => s + f.progress, 0) / total);
    const overallProgress = overallBar ? overallBar.dataset.manual === undefined ? avgProg : parseInt(overallBar.style.width) || 0 : avgProg;

    if (overallCount) overallCount.innerHTML = `· ${total} 个文件 · ${done} 个成功 · ${failed} 个失败`;
    if (overallPct) overallPct.textContent = overallProgress + '%';
    if (overallBar) overallBar.style.width = overallProgress + '%';

    if (!container) return;

    container.innerHTML = state.files.map(f => {
      const pct = Math.round(f.progress);
      let statusHtml = '';
      if (f.status === 'ok') statusHtml = '<span class="status-chip ok">已完成</span>';
      else if (f.status === 'err') statusHtml = '<span class="status-chip err">失败</span>';
      else if (f.status === 'run') statusHtml = `<span class="status-chip run">转换中 ${pct}%</span>`;
      else statusHtml = '<span class="status-chip wait">等待中</span>';

      const errMsg = f.status === 'err' ? `<p class="mt-1 text-xs text-destructive">文件格式不支持或损坏</p>` : '';

      return `
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 p-4 fade-in">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <span class="ic shrink-0" style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center;font-size:16px;color:var(--primary-foreground);background:${getFileColor(f.srcFormat)}">${getFileEmoji(f.srcFormat)}</span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-medium truncate">${f.name}</span>
                <span class="text-xs text-muted-foreground">${f.srcFormat} → ${f.targetFormat}</span>
              </div>
              <div class="mt-2 w-full h-2 bg-muted rounded-full overflow-hidden max-w-md">
                <div class="h-full rounded-full ${f.status === 'err' ? 'bg-destructive' : f.status === 'ok' ? 'bg-chart-2' : 'bg-primary'} progress-bar-fill" style="width:${pct}%;"></div>
              </div>
              ${errMsg}
            </div>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <span class="text-xs text-muted-foreground tabular-nums hide-sm">${formatSize(f.size)}</span>
            ${statusHtml}
            ${f.status === 'err' ? `<button class="btn outline sm" data-retry-one="${f.id}">重试</button>` : ''}
          </div>
        </div>
      `;
    }).join('<div class="h-px bg-border mx-4"></div>');

    // 绑定单个重试
    container.querySelectorAll('[data-retry-one]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.retryOne);
        const st = loadState();
        const f = st.files.find(x => x.id === id);
        if (f) { f.status = 'run'; f.progress = 0; saveState(st); renderProgress(); simulateOne(f.id); }
      });
    });

    // 检查是否全部完成
    const allDone = state.files.every(f => f.status === 'ok' || f.status === 'err');
    if (allDone) {
      progressTimers.forEach(t => clearInterval(t));
      progressTimers = [];
      setTimeout(() => { location.href = 'result.html'; }, 1200);
    }
  }

  function startProgressSimulation() {
    const state = loadState();
    // 启动2个并发
    let concurrency = 0;
    const maxConc = 2;
    state.files.forEach(f => {
      if (f.status === 'wait' && concurrency < maxConc) {
        f.status = 'run';
        concurrency++;
        simulateOne(f.id);
      }
    });
    saveState(state);
    renderProgress();
  }

  function simulateOne(fileId) {
    const timer = setInterval(() => {
      const state = loadState();
      const f = state.files.find(x => x.id === fileId);
      if (!f || f.status !== 'run') { clearInterval(timer); return; }
      f.progress += Math.random() * 12 + 4;
      if (f.progress >= 100) {
        f.progress = 100;
        // 5% 失败概率模拟
        f.status = Math.random() < 0.08 ? 'err' : 'ok';
        clearInterval(timer);
        // 启动下一个等待中的
        const next = state.files.find(x => x.status === 'wait');
        if (next) {
          next.status = 'run';
          simulateOne(next.id);
        }
      }
      saveState(state);
      renderProgress();
    }, 380);
    progressTimers.push(timer);
  }

  // ---------- 转换结果页 ----------
  function initResultPage() {
    const state = loadState();
    if (!state.files.length) { setTimeout(() => location.href = 'index.html', 800); return; }
    renderResult();

    const dlAllBtn = document.querySelector('[data-dom-id="action-download-all"]');
    if (dlAllBtn) {
      dlAllBtn.addEventListener('click', () => {
        const st = loadState();
        const count = st.files.filter(f => f.status === 'ok').length;
        if (!count) { showToast('没有可下载的文件', 'err'); return; }
        showToast(`开始打包下载 ${count} 个文件...`, 'ok');
        dlAllBtn.disabled = true;
        dlAllBtn.innerHTML = '<span data-icon class="inline-flex animate-spin" style="width:16px;height:16px;mask-image:url(assets/image_8_tgt36j.svg);-webkit-mask-image:url(assets/image_8_tgt36j.svg);"></span>打包中...';
        setTimeout(() => {
          dlAllBtn.disabled = false;
          dlAllBtn.innerHTML = '<span data-icon class="inline-flex" style="width:16px;height:16px;mask-image:url(assets/image_2_tgt36j.svg);-webkit-mask-image:url(assets/image_2_tgt36j.svg);"></span>打包下载全部';
          showToast('下载完成！', 'ok');
        }, 2000);
      });
    }

    const redoBtn = document.querySelector('[data-dom-id="action-again"]');
    if (redoBtn) {
      redoBtn.addEventListener('click', () => {
        if (confirm('开始新的转换任务将清空当前结果，是否继续？')) {
          resetState();
          location.href = 'index.html';
        }
      });
    }

    // 过滤按钮
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active', 'bg-primary/10', 'text-primary'));
        btn.classList.add('active', 'bg-primary/10', 'text-primary');
        renderResult(btn.dataset.filter);
      });
    });
  }

  function renderResult(filter) {
    const state = loadState();
    const ok = state.files.filter(f => f.status === 'ok');
    const err = state.files.filter(f => f.status === 'err');
    const total = state.files.length;

    document.getElementById('result-total').textContent = total;
    document.getElementById('result-ok').textContent = ok.length;
    document.getElementById('result-err').textContent = err.length;

    // 统计数据
    const origTotal = state.files.reduce((s, f) => s + (f.size || 0), 0);
    const convertedTotal = state.files.filter(f => f.status === 'ok').reduce((s, f) => s + (f.size * 0.75 || 0), 0);
    const savedPct = origTotal ? Math.max(0, Math.round((1 - convertedTotal / origTotal) * 100)) : 0;
    const statEls = document.querySelectorAll('[data-stat]');
    statEls.forEach(el => {
      const key = el.dataset.stat;
      if (key === 'total') el.textContent = total;
      else if (key === 'orig') el.textContent = formatSize(origTotal);
      else if (key === 'converted') el.textContent = formatSize(convertedTotal);
      else if (key === 'saved') el.textContent = savedPct + '%';
    });

    const container = document.querySelector('[data-result-list]');
    if (!container) return;

    let list = state.files.slice();
    if (filter === 'ok') list = ok;
    else if (filter === 'err') list = err;

    if (!list.length) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <span data-icon class="h-14 w-14 text-muted-foreground/30 mb-3" style="mask-image:url(assets/image_5_tgt36j.svg);-webkit-mask-image:url(assets/image_5_tgt36j.svg);"></span>
          <p class="text-sm text-muted-foreground">暂无匹配的转换结果</p>
        </div>`;
      return;
    }

    const html = [];
    list.forEach((f, i) => {
      const isOk = f.status === 'ok';
      if (isOk) {
        const convSize = f.size * (0.7 + Math.random() * 0.5);
        html.push(`
          <div class="flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:p-5 fade-in" style="animation-delay:${i * 60}ms">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <span class="ic shrink-0" style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:18px;color:var(--primary-foreground);background:${getFileColor(f.targetFormat)}">${getFileEmoji(f.targetFormat)}</span>
              <div class="min-w-0 flex-1">
                <p class="font-medium text-card-foreground truncate">${f.name.replace(/\.[^.]+$/, '')}.${f.targetFormat.toLowerCase()}</p>
                <div class="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span class="inline-flex items-center gap-1">
                    <span>${f.srcFormat}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    <span>${f.targetFormat}</span>
                  </span>
                  <span class="w-1 h-1 rounded-full bg-current opacity-40"></span>
                  <span>原始: ${formatSize(f.size)}</span>
                  <span class="w-1 h-1 rounded-full bg-current opacity-40 hide-sm"></span>
                  <span>转换后: ${formatSize(convSize)}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="status-chip ok hide-sm sm:inline-flex">已完成</span>
              <button data-preview="${f.id}" class="btn outline sm hide-sm sm:inline-flex">预览</button>
              <button data-dl="${f.id}" class="btn primary sm">
                <span data-icon class="inline-flex" style="width:14px;height:14px;mask-image:url(assets/image_2_tgt36j.svg);-webkit-mask-image:url(assets/image_2_tgt36j.svg);"></span>
                <span class="hide-sm sm:inline">下载</span>
                <span class="sm:hidden inline">下载</span>
              </button>
            </div>
          </div>
        `);
      } else {
        html.push(`
          <div class="flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:p-5 fade-in" style="animation-delay:${i * 60}ms">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <span class="ic shrink-0" style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:18px;color:var(--primary-foreground);background:${getFileColor(f.srcFormat)};filter:grayscale(.7);opacity:.8">${getFileEmoji(f.srcFormat)}</span>
              <div class="min-w-0 flex-1">
                <p class="font-medium text-card-foreground truncate">${f.name}</p>
                <p class="mt-1 text-xs text-destructive">转换失败：不支持的格式转换（${f.srcFormat} → ${f.targetFormat}）</p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="status-chip err">失败</span>
              <button data-retry-result="${f.id}" class="btn outline sm">重试</button>
            </div>
          </div>
        `);
      }
    });

    container.innerHTML = html.join('<div class="h-px bg-border mx-4 sm:mx-5"></div>');

    container.querySelectorAll('[data-dl]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.dl);
        const f = loadState().files.find(x => x.id === id);
        if (f) {
          const origText = btn.innerHTML;
          btn.disabled = true;
          btn.innerHTML = '<span data-icon class="inline-flex animate-spin" style="width:14px;height:14px;mask-image:url(assets/image_8_tgt36j.svg);-webkit-mask-image:url(assets/image_8_tgt36j.svg);"></span>下载中';
          setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = origText;
            showToast(`正在下载 ${f.name.replace(/\.[^.]+$/, '')}.${f.targetFormat.toLowerCase()}`, 'ok');
          }, 900);
        }
      });
    });
    container.querySelectorAll('[data-preview]').forEach(btn => {
      btn.addEventListener('click', () => showToast('预览功能开发中', 'info'));
    });
    container.querySelectorAll('[data-retry-result]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.retryResult);
        const st = loadState();
        const f = st.files.find(x => x.id === id);
        if (!f) return;
        f.status = 'wait'; f.progress = 0;
        saveState(st);
        location.href = 'progress.html';
      });
    });
  }

  // ---------- 主题切换（基础） ----------
  function initTheme() {
    const saved = localStorage.getItem('pea_theme');
    if (saved === 'dark') document.documentElement.classList.add('dark');
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('pea_theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      });
    });
  }

  // ---------- 导航高亮 ----------
  function initNavHighlight() {
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('nav a').forEach(a => {
      const href = a.getAttribute('href');
      if (!href) return;
      if (href === page) {
        a.classList.remove('text-muted-foreground', 'hover:text-foreground', 'hover:bg-muted');
        a.classList.add('bg-primary', 'text-primary-foreground');
      }
    });
  }

  // ---------- 启动 ----------
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavHighlight();
    const page = location.pathname.split('/').pop() || 'index.html';
    if (page === 'index.html' || page === '') initHomePage();
    else if (page === 'settings.html') initSettingsPage();
    else if (page === 'progress.html') initProgressPage();
    else if (page === 'result.html') initResultPage();
  });

  // 暴露全局函数
  window.renderProgress = renderProgress;
  window.renderResult = renderResult;
  window.renderFileList = renderFileList;
  window.loadState = loadState;
  window.saveState = saveState;

})();
