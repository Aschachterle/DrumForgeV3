(() => {
  const state = {
    rows: [],
    areaColors: {},
    colorPalette: [
      '#93c5fd', '#a7f3d0', '#fcd34d', '#f9a8d4', '#c4b5fd', '#fdba74', '#86efac', '#fca5a5',
      '#67e8f9', '#f5d0fe', '#bfdbfe', '#ddd6fe', '#fde68a', '#99f6e4', '#fecaca', '#d9f99d'
    ]
  };

  const els = {
    totalSlots: document.getElementById('totalSlots'),
    generateRowsBtn: document.getElementById('generateRowsBtn'),
    csvFile: document.getElementById('csvFile'),
    sheetSizeControls: document.getElementById('sheetSizeControls'),
    labelSizeControls: document.getElementById('labelSizeControls'),
    sheetWidth: document.getElementById('sheetWidth'),
    sheetHeight: document.getElementById('sheetHeight'),
    labelWidth: document.getElementById('labelWidth'),
    labelHeight: document.getElementById('labelHeight'),
    printBtn: document.getElementById('printBtn'),
    tableBody: document.getElementById('breakerTableBody'),
    areaColorLegend: document.getElementById('areaColorLegend')
  };

  function parseCsv(text) {
    const lines = text
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);

    if (!lines.length) return [];

    const headers = splitCsvLine(lines[0]).map((h, index) => normalizeCsvHeader(h, index));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = splitCsvLine(lines[i]);
      if (!cols.join('').trim()) continue;
      const item = {};
      headers.forEach((h, idx) => {
        item[h] = (cols[idx] || '').trim();
      });
      rows.push(item);
    }

    return rows;
  }

  function normalizeCsvHeader(header, index) {
    const lower = String(header || '').trim().toLowerCase();
    const compact = lower.replace(/[^a-z0-9]/g, '');

    const hasLeft = /\bleft\b|\blhs\b|leftside/.test(lower) || compact.includes('left');
    const hasRight = /\bright\b|\brhs\b|rightside/.test(lower) || compact.includes('right');
    const hasBreaker = /\bbreaker\b|\bcircuit\b|\bslot\b|#|\bnumber\b|\bnum\b/.test(lower)
      || /(breaker|circuit|slot|number|num)/.test(compact);
    const hasArea = /\barea\b/.test(lower) || compact.includes('area');
    const hasDescription = /\bdescription\b|\bdesc\b|\blabel\b|\bload\b/.test(lower)
      || /(description|desc|label|load)/.test(compact);

    if (hasLeft && hasBreaker) return 'breakerleft';
    if (hasRight && hasBreaker) return 'breakerright';
    if (hasLeft && hasArea) return 'arealeft';
    if (hasRight && hasArea) return 'arearight';
    if (hasLeft && hasDescription) return 'descriptionleft';
    if (hasRight && hasDescription) return 'descriptionright';

    const fallbackOrder = [
      'breakerleft',
      'arealeft',
      'descriptionleft',
      'arearight',
      'descriptionright',
      'breakerright'
    ];
    return fallbackOrder[index] || compact;
  }

  function splitCsvLine(line) {
    const out = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  function autoColor(areaName) {
    // Prefer first unused color from the palette
    const used = new Set(Object.values(state.areaColors || {}));
    for (let i = 0; i < state.colorPalette.length; i++) {
      const c = state.colorPalette[i];
      if (!used.has(c)) return c;
    }
    // Palette exhausted — generate a new distinct HSL color deterministically
    const hueStep = 47; // prime-ish step to spread colors
    const idx = Object.keys(state.areaColors).length || 0;
    const hue = (idx * hueStep) % 360;
    return `hsl(${hue} 65% 70%)`;
  }

  function ensureColor(areaName) {
    const key = (areaName || '').trim();
    if (!key) return;
    if (!state.areaColors[key]) {
      state.areaColors[key] = autoColor(key);
    }
  }

  function rebuildAreaColorsFromRows() {
    const existing = { ...state.areaColors };
    state.areaColors = {};

    state.rows.forEach((r) => {
      const left = (r.leftArea || '').trim();
      const right = (r.rightArea || '').trim();
      if (left) state.areaColors[left] = existing[left] || autoColor(left);
      if (right) state.areaColors[right] = existing[right] || autoColor(right);
    });
  }

  function updateRowHighlights(index) {
    const tr = els.tableBody.children[index];
    if (!tr) return;

    const leftAreaInput = tr.querySelector('input[data-field="leftArea"]');
    const leftDescInput = tr.querySelector('[data-field="leftDescription"]');
    const rightAreaInput = tr.querySelector('[data-field="rightArea"]');
    const rightDescInput = tr.querySelector('[data-field="rightDescription"]');

    if (leftAreaInput) {
      const bg = leftAreaInput.value ? toTint(areaColor(leftAreaInput.value)) : '';
      leftAreaInput.parentElement.style.background = bg;
      if (leftDescInput) leftDescInput.parentElement.style.background = bg;
    }
    if (rightAreaInput) {
      const bg = rightAreaInput.value ? toTint(areaColor(rightAreaInput.value)) : '';
      rightAreaInput.parentElement.style.background = bg;
      if (rightDescInput) rightDescInput.parentElement.style.background = bg;
    }
  }

  function updateAllRowHighlights() {
    for (let i = 0; i < els.tableBody.children.length; i++) updateRowHighlights(i);
  }

  function toTint(color, alpha = 0.6) {
    if (!color) return '';
    const s = String(color).trim();
    if (s.startsWith('#')) {
      // expand short hex
      let hex = s.slice(1);
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const int = parseInt(hex, 16);
      const r = (int >> 16) & 255;
      const g = (int >> 8) & 255;
      const b = int & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (s.startsWith('hsl(')) {
      // convert to hsla
      return s.replace(/^hsl\(/, 'hsla(').replace(/\)$/, `, ${alpha})`);
    }
    if (s.startsWith('hsla(') || s.startsWith('rgba(')) {
      return s; // assume caller provided alpha
    }
    return s;
  }

  function generateRowsFromSlots(totalSlots) {
    const slots = Math.max(2, Number(totalSlots) || 2);
    const evenSlots = slots % 2 === 0 ? slots : slots + 1;
    const rowCount = evenSlots / 2;
    state.rows = [];

    for (let i = 0; i < rowCount; i++) {
      state.rows.push({
        leftBreaker: i * 2 + 1,
        leftArea: '',
        leftDescription: '',
        leftSpan: 1,
        rightArea: '',
        rightDescription: '',
        rightSpan: 1,
        rightBreaker: i * 2 + 2
      });
    }
    rebuildAreaColorsFromRows();
    renderTable();
    renderAreaLegend();
  }

  function renderTable() {
    els.tableBody.innerHTML = '';

    state.rows.forEach((row, index) => {
      const tr = document.createElement('tr');

      // Left side cells (if leftSpan === 0 this row is occupied by previous row)
      const leftBg = row.leftArea ? toTint(areaColor(row.leftArea)) : '';
      const rightBg = row.rightArea ? toTint(areaColor(row.rightArea)) : '';

      const leftCells = row.leftSpan === 0
        ? `<td class="spanned" colspan="1"><em>—</em></td><td class="spanned"><small>spanned</small></td><td class="spanned"></td>`
        : `
          <td>
            <div class="cell-with-controls">
              <input type="number" data-field="leftBreaker" data-index="${index}" value="${escapeAttr(row.leftBreaker)}" />
              <button type="button" class="span-btn" data-field="leftSpanToggle" data-index="${index}">${row.leftSpan>1 ? '−' : '+'}</button>
            </div>
          </td>
          <td style="background:${leftBg};">
            <input type="text" data-field="leftArea" data-index="${index}" value="${escapeAttr(row.leftArea)}">
          </td>
          <td style="background:${leftBg};">
            <textarea data-field="leftDescription" data-index="${index}" rows="1">${escapeHtml(row.leftDescription)}</textarea>
          </td>
        `;

      // Right side cells
      const rightCells = row.rightSpan === 0
        ? `<td class="spanned"></td><td class="spanned"><small>spanned</small></td><td class="spanned"><em>—</em></td>`
        : `
          <td style="background:${rightBg};"><input type="text" data-field="rightArea" data-index="${index}" value="${escapeAttr(row.rightArea)}"></td>
          <td style="background:${rightBg};"><textarea data-field="rightDescription" data-index="${index}" rows="1">${escapeHtml(row.rightDescription)}</textarea></td>
          <td>
            <div class="cell-with-controls">
              <input type="number" data-field="rightBreaker" data-index="${index}" value="${escapeAttr(row.rightBreaker)}" />
              <button type="button" class="span-btn" data-field="rightSpanToggle" data-index="${index}">${row.rightSpan>1 ? '−' : '+'}</button>
            </div>
          </td>
        `;

      tr.innerHTML = leftCells + rightCells;

      els.tableBody.appendChild(tr);
    });

    els.tableBody.querySelectorAll('input, textarea').forEach((el) => {
      el.addEventListener('change', onTableInputChange);
      el.addEventListener('input', onTableInputChange);
      // auto-resize textareas
      if (el.tagName.toLowerCase() === 'textarea') {
        el.style.overflow = 'hidden';
        const autoResize = (t) => {
          t.style.height = 'auto';
          const expandedMin = t.dataset.expanded === 'true' ? 120 : 0;
          t.style.height = Math.max(t.scrollHeight, expandedMin) + 'px';
        };
        autoResize(el);
        el.addEventListener('input', () => autoResize(el));
        el.addEventListener('focus', () => {
          el.dataset.expanded = 'true';
          autoResize(el);
        });
        el.addEventListener('blur', () => {
          delete el.dataset.expanded;
          autoResize(el);
        });
      }
    });
    // Attach click handlers for span buttons
    els.tableBody.querySelectorAll('button[data-field]').forEach((btn) => {
      btn.addEventListener('click', onTableInputChange);
    });
  }

  function onTableInputChange(event) {
    const index = Number(event.target.dataset.index);
    const field = event.target.dataset.field;
    if (!state.rows[index]) return;

    if (field === 'leftBreaker' || field === 'rightBreaker') {
      state.rows[index][field] = event.target.value === '' ? '' : Number(event.target.value);
    } else {
      // Handle span toggles separately
      if (field === 'leftSpanToggle' || field === 'rightSpanToggle') {
        // Button click toggles span; if event.target.checked exists (older checkbox), use it
        const side = field.startsWith('left') ? 'left' : 'right';
        const cur = state.rows[index][`${side}Span`] || 1;
        const newSpan = cur > 1 ? 1 : 2;
        state.rows[index][`${side}Span`] = newSpan;
        // Update next row reservation
        if (index + 1 < state.rows.length) {
          state.rows[index + 1][`${side}Span`] = newSpan > 1 ? 0 : (state.rows[index + 1][`${side}Span`] === 0 ? 1 : state.rows[index + 1][`${side}Span`]);
        }
        renderTable();
        rebuildAreaColorsFromRows();
        renderAreaLegend();
        return;
      }

      state.rows[index][field] = event.target.value;
      if (field === 'leftArea' || field === 'rightArea') {
        rebuildAreaColorsFromRows();
        renderAreaLegend();
        // update only this row's background highlights to avoid losing focus
        updateRowHighlights(index);
      }
    }
  }

  function renderAreaLegend() {
    const names = Object.keys(state.areaColors);
    if (!names.length) {
      els.areaColorLegend.className = 'color-legend empty-state';
      els.areaColorLegend.textContent = 'No areas yet. Fill the table or import CSV.';
      return;
    }

    els.areaColorLegend.className = 'color-legend';
    els.areaColorLegend.innerHTML = '';

    names.forEach((name) => {
      const wrap = document.createElement('div');
      wrap.className = 'color-item';
      wrap.innerHTML = `
        <span class="swatch" style="background:${state.areaColors[name]}"></span>
        <strong>${escapeHtml(name)}</strong>
        <input type="color" value="${state.areaColors[name]}" aria-label="Color for ${escapeAttr(name)}" />
      `;
      const colorInput = wrap.querySelector('input[type="color"]');
      colorInput.addEventListener('input', () => {
        state.areaColors[name] = colorInput.value;
        const sw = wrap.querySelector('.swatch');
        sw.style.background = colorInput.value;
        // update table highlights for any rows using this area
        updateAllRowHighlights();
      });
      els.areaColorLegend.appendChild(wrap);
    });
  }

  function importCsv(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCsv(String(reader.result || ''));
        if (!parsed.length) return;

        if (state.rows.length < parsed.length) {
          generateRowsFromSlots(parsed.length * 2);
        }

        parsed.forEach((item, idx) => {
          if (!state.rows[idx]) return;
          state.rows[idx].leftBreaker = item.breakerleft || state.rows[idx].leftBreaker;
          state.rows[idx].leftArea = item.arealeft || '';
          state.rows[idx].leftDescription = item.descriptionleft || '';
          state.rows[idx].leftSpan = 1;
          state.rows[idx].rightArea = item.arearight || '';
          state.rows[idx].rightDescription = item.descriptionright || '';
          state.rows[idx].rightSpan = 1;
          state.rows[idx].rightBreaker = item.breakerright || state.rows[idx].rightBreaker;
        });

        // Detect merged/blank-following rows to infer 2-row spans
        for (let i = 0; i < state.rows.length - 1; i++) {
          // Left side: if current has content and next row left cells are empty, treat as span
          const curL = state.rows[i].leftArea || state.rows[i].leftDescription || state.rows[i].leftBreaker;
          const nextL = state.rows[i+1].leftArea || state.rows[i+1].leftDescription || state.rows[i+1].leftBreaker;
          if (curL && !nextL) {
            state.rows[i].leftSpan = 2;
            state.rows[i+1].leftSpan = 0;
          }
          // Right side similar
          const curR = state.rows[i].rightArea || state.rows[i].rightDescription || state.rows[i].rightBreaker;
          const nextR = state.rows[i+1].rightArea || state.rows[i+1].rightDescription || state.rows[i+1].rightBreaker;
          if (curR && !nextR) {
            state.rows[i].rightSpan = 2;
            state.rows[i+1].rightSpan = 0;
          }
        }

        rebuildAreaColorsFromRows();
        renderTable();
        renderAreaLegend();
      } catch (err) {
        alert('Failed to parse CSV. Please verify the format.');
      }
    };
    reader.readAsText(file);
  }

  function areaColor(name) {
    const key = (name || '').trim();
    if (!key) return '#ffffff';
    ensureColor(key);
    return state.areaColors[key];
  }

  function buildLabelCell(label) {
    return `
      <div class="label" style="background:${label.color};">
        <div class="line"><strong>${escapeHtml(label.breaker || '')}</strong></div>
        <div class="line area">${escapeHtml(label.area || '')}</div>
        <div class="line desc">${escapeHtml(label.description || '')}</div>
      </div>
    `;
  }

  function buildPlacedLabel(label, rowIndex) {
    // compute grid placement for full-sheet: left -> column 1, right -> column 2
    const col = label.side === 'left' ? 1 : 2;
    const span = label.span || 1;
    const rowStart = rowIndex + 1; // grid rows are 1-based
    const style = `background:${label.color}; grid-column: ${col}; grid-row: ${rowStart} / span ${span};`;
    // Two-column internal layout: large breaker number on left, area+description on right
    return `
      <div class="label" style="${style}">
        <div class="label-inner">
          <div class="num">${escapeHtml(label.breaker || '')}</div>
          <div class="content">
            <div class="area">${escapeHtml(label.area || '')}</div>
            <div class="desc">${escapeHtml(label.description || '')}</div>
          </div>
        </div>
      </div>
    `;
  }

  function buildSizedLabel(label, baseHeightIn) {
    const span = label.span || 1;
    const heightIn = (baseHeightIn || 0.6) * span;
    const style = `background:${label.color}; height: ${heightIn}in;`;
    return `
      <div class="label" style="${style}">
        <div class="label-inner">
          <div class="num">${escapeHtml(label.breaker || '')}</div>
          <div class="content">
            <div class="area">${escapeHtml(label.area || '')}</div>
            <div class="desc">${escapeHtml(label.description || '')}</div>
          </div>
        </div>
      </div>
    `;
  }

  function getAllLabels(includeUnselected) {
    const labels = [];
    state.rows.forEach((r) => {
      const left = { breaker: r.leftBreaker, area: r.leftArea, description: r.leftDescription, color: areaColor(r.leftArea), span: r.leftSpan || 1, side: 'left' };
      const right = { breaker: r.rightBreaker, area: r.rightArea, description: r.rightDescription, color: areaColor(r.rightArea), span: r.rightSpan || 1, side: 'right' };
      if (r.leftSpan !== 0 && (includeUnselected || left.breaker || left.area || left.description)) labels.push(left);
      if (r.rightSpan !== 0 && (includeUnselected || right.breaker || right.area || right.description)) labels.push(right);
    });
    return labels;
  }

  function printFullSheet() {
    const width = Number(els.sheetWidth.value) || 8.5;
    const height = Number(els.sheetHeight.value) || 11;
    const rows = state.rows.length;

    // Build grid-placed labels so spans occupy multiple rows
    const placed = [];
    for (let i = 0; i < state.rows.length; i++) {
      const r = state.rows[i];
      if (r.leftSpan !== 0) {
        const left = { breaker: r.leftBreaker, area: r.leftArea, description: r.leftDescription, color: areaColor(r.leftArea), span: r.leftSpan || 1, side: 'left' };
        placed.push(buildPlacedLabel(left, i));
      }
      if (r.rightSpan !== 0) {
        const right = { breaker: r.rightBreaker, area: r.rightArea, description: r.rightDescription, color: areaColor(r.rightArea), span: r.rightSpan || 1, side: 'right' };
        placed.push(buildPlacedLabel(right, i));
      }
    }

    const html = `
      <html>
      <head>
        <title>Breaker Label Sheet</title>
        <style>
          @page { size: ${width}in ${height}in; margin: 0.2in; }
          body { margin: 0; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .sheet {
            width: ${width}in;
            height: ${height}in;
            box-sizing: border-box;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(${rows}, 1fr);
            gap: 0.03in;
            padding: 0.03in;
          }
          .label {
            border: 1px solid #222;
            padding: 0.04in;
            box-sizing: border-box;
            overflow: visible;
            display: flex;
            align-items: center;
          }
          .label-inner {
            display: flex;
            width: 100%;
            gap: 0.05in;
            align-items: center;
            min-width: 0;
          }
          .num {
            flex: 0 0 0.72in;
            max-width: 0.9in;
            font-weight: 800;
            font-size: 11pt;
            line-height: 1;
            text-align: center;
            overflow-wrap: anywhere;
          }
          .content {
            flex: 1 1 auto;
            min-width: 0;
          }
          .area {
            font-weight: 700;
            font-size: 9pt;
            line-height: 1.1;
            margin: 0 0 2px 0;
            white-space: normal;
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          .desc {
            font-size: 7.8pt;
            line-height: 1.15;
            margin: 0;
            white-space: normal;
            overflow-wrap: anywhere;
            word-break: break-word;
          }
        </style>
      </head>
      <body>
        <div class="sheet">${placed.join('')}</div>
      </body>
      </html>
    `;

    openPrintWindow(html);
  }

  function printSelectedLabels() {
    const width = Number(els.labelWidth.value) || 2;
    const height = Number(els.labelHeight.value) || 0.6;
    const labels = getAllLabels(false);
    if (!labels.length) {
      alert('No labels found. Fill the table or import CSV.');
      return;
    }

    // For individual labels, respect span by scaling height
    const html = `
      <html>
      <head>
        <title>Individual Breaker Labels</title>
        <style>
          @page { margin: 0.25in; }
          body { margin: 0; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .sheet {
            display: flex;
            flex-wrap: wrap;
            gap: 0.05in;
            padding: 0.04in;
          }
          .label {
            width: ${width}in;
            border: 1px solid #222;
            padding: 0.04in;
            box-sizing: border-box;
            overflow: visible;
            display: flex;
            align-items: center;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .label-inner {
            display: flex;
            width: 100%;
            gap: 0.05in;
            align-items: center;
            min-width: 0;
          }
          .num {
            flex: 0 0 0.68in;
            max-width: 0.86in;
            font-weight: 800;
            font-size: 10.5pt;
            line-height: 1;
            text-align: center;
            overflow-wrap: anywhere;
          }
          .content {
            flex: 1 1 auto;
            min-width: 0;
          }
          .area {
            font-weight: 700;
            font-size: 8.7pt;
            line-height: 1.1;
            margin: 0 0 2px 0;
            white-space: normal;
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          .desc {
            font-size: 7.6pt;
            line-height: 1.15;
            margin: 0;
            white-space: normal;
            overflow-wrap: anywhere;
            word-break: break-word;
          }
        </style>
      </head>
      <body>
        <div class="sheet">${labels.map(l => buildSizedLabel(l, height)).join('')}</div>
      </body>
      </html>
    `;

    openPrintWindow(html);
  }

  function openPrintWindow(html) {
    const w = window.open('', '_blank');
    if (!w) {
      alert('Popup blocked. Please allow popups for printing.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 150);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function bindEvents() {
    els.generateRowsBtn.addEventListener('click', () => {
      generateRowsFromSlots(els.totalSlots.value);
    });

    els.csvFile.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) importCsv(file);
    });

    document.querySelectorAll('input[name="printMode"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        const isSheet = radio.value === 'sheet' && radio.checked;
        els.sheetSizeControls.classList.toggle('hidden', !isSheet);
        els.labelSizeControls.classList.toggle('hidden', isSheet);
      });
    });

    els.printBtn.addEventListener('click', () => {
      const mode = document.querySelector('input[name="printMode"]:checked')?.value || 'sheet';
      if (mode === 'sheet') {
        printFullSheet();
      } else {
        printSelectedLabels();
      }
    });
  }

  bindEvents();
  generateRowsFromSlots(els.totalSlots.value);
})();
