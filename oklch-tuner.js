export function initTuner(config = {}) {
  if (typeof document === 'undefined') return;

  // ── Auto-discover if no variables supplied ──────────────────────────────────
  let variables = config.variables || [];
  if (variables.length === 0) {
    const sheets = Array.from(document.styleSheets);
    const found = new Set();
    for (const sheet of sheets) {
      let rules;
      try { rules = Array.from(sheet.cssRules); } catch { continue; }
      for (const rule of rules) {
        if (!(rule instanceof CSSStyleRule)) continue;
        const text = rule.cssText;
        const matches = text.matchAll(/(--[\w-]+)\s*:\s*oklch\(/g);
        for (const m of matches) found.add(m[1]);
      }
    }
    variables = Array.from(found);
  }
  if (variables.length === 0) return;

  // Fix C: Use a host element to attach Shadow DOM
  let host = document.getElementById('oklch-tuner-host');
  if (host) return;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function parseExistingOklch(varName) {
    const rawValue = window.getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (!rawValue) return null;
    
    // Fix B: Handle 'none' values and gracefully fallback for complex values (calc, var, etc.)
    const matches = rawValue.match(/oklch\(([\d.]+%?|none)\s+([\d.]+|none)\s+([\d.]+|none)(?:\s*\/\s*([\d.]+%?|none))?\)/);
    
    if (!matches) {
      // It's likely a complex value (e.g. contains calc() or var()).
      // We return a default fallback but flag it so we can warn the user.
      return { l: 50, c: 0.1, h: 180, a: 1, isComplex: true, rawValue };
    }
    
    const parseChannel = (val, isPercentage, defaultVal) => {
      if (!val || val === 'none') return defaultVal;
      if (isPercentage) return val.endsWith('%') ? parseFloat(val) : parseFloat(val) * 100;
      return parseFloat(val);
    };

    const l = parseChannel(matches[1], true, 0);
    const c = parseChannel(matches[2], false, 0);
    const h = parseChannel(matches[3], false, 0);
    
    let a = 1;
    if (matches[4] && matches[4] !== 'none') {
      a = matches[4].endsWith('%') ? parseFloat(matches[4]) / 100 : parseFloat(matches[4]);
    }
    
    return { l, c, h, a, isComplex: false };
  }

  function toOklchStr({ l, c, h, a }) {
    return `oklch(${l}% ${c} ${h} / ${a})`;
  }

  // ── State ───────────────────────────────────────────────────────────────────
  const state = {};
  variables.forEach(v => {
    const parsed = parseExistingOklch(v);
    if (!parsed) console.warn('[oklch-tuner] could not parse variable:', v);
    if (parsed && parsed.isComplex) console.warn(`[oklch-tuner] Variable ${v} has a complex value: ${parsed.rawValue}. Tuning will overwrite it.`);
    state[v] = parsed || { l: 60, c: 0.1, h: 250, a: 1, isComplex: false };
  });

  const STORAGE_VAR_KEY = 'oklch-tuner:activeVar';
  const STORAGE_POS_KEY = 'oklch-tuner:position';

  const savedVar = localStorage.getItem(STORAGE_VAR_KEY);
  let activeVar = (savedVar && variables.includes(savedVar)) ? savedVar : variables[0];

  // ── Styles (Now inside Shadow DOM) ──────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #oklch-tuner-widget {
      all: initial; position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;
      background: #18181b; color: #f4f4f5; padding: 16px 20px 20px;
      border-radius: 12px; font-family: ui-sans-serif, system-ui, sans-serif;
      width: calc(100vw - 32px); max-width: 320px; box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      border: 1px solid #3f3f46; box-sizing: border-box;
    }
    #oklch-tuner-widget.ot-collapsed .ot-collapsible { display: none; }
    #oklch-tuner-widget.ot-collapsed .ot-header { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
    #oklch-tuner-widget * { box-sizing: border-box; font-family: inherit; }

    .ot-header {
      display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px;
      border-bottom: 1px solid #27272a;
    }
    .ot-drag-handle {
      cursor: grab; color: #fff; width: 16px; height: 16px; display: flex; align-items: center; flex-shrink: 0;
      touch-action: none;
    }
    .ot-drag-handle:hover { color: #e4e4e7; }
    .ot-drag-handle:active { cursor: grabbing; color: #fff; }
    .ot-header h3 { margin: 0; font-size: 13px; font-weight: 600; color: #fff; flex: 1; }

    .ot-icon-btn {
      background: #27272a; border: 1px solid #3f3f46; color: #a1a1aa;
      padding: 4px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .ot-icon-btn:hover { background: #3f3f46; color: #fff; }

    .ot-copy-btn {
      background: #27272a; border: 1px solid #3f3f46; color: #a1a1aa;
      padding: 5px 10px; border-radius: 6px; cursor: pointer;
      font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
      white-space: nowrap; flex-shrink: 0;
    }
    .ot-copy-btn:hover { background: #3f3f46; color: #fff; }
    .ot-copy-btn.ot-copied { background: #166534; border-color: #16a34a; color: #86efac; }

    .ot-var-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
    .ot-var-pill {
      background: #27272a; border: 1px solid #3f3f46; color: #a1a1aa;
      padding: 5px 8px; border-radius: 4px; font-size: 11px; font-family: monospace; cursor: pointer;
    }
    .ot-var-pill.ot-active { background: #3b82f6; border-color: #60a5fa; color: #fff; }

    .ot-complex-warn {
      display: none; background: #3f3f46; color: #fbbf24; padding: 8px 12px;
      border-radius: 6px; font-size: 11px; margin-bottom: 16px; line-height: 1.4;
      border: 1px solid #52525b;
    }

    .ot-control { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 11px; }
    .ot-control label { width: 12px; color: #a1a1aa; font-weight: bold; }
    .ot-control input[type="range"] {
      flex: 1; accent-color: #3b82f6; cursor: pointer; height: 3px; background: #3f3f46; border-radius: 2px;
      appearance: none; -webkit-appearance: none;
    }
    .ot-control input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none; width: 12px; height: 12px; background: #fff; border-radius: 50%;
    }
    .ot-control span { width: 36px; text-align: right; font-variant-numeric: tabular-nums; color: #e4e4e7; }
  `;

  // ── Markup ──────────────────────────────────────────────────────────────────
  host = document.createElement('div');
  host.id = 'oklch-tuner-host';
  
  // Attach shadow DOM
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.appendChild(style);

  const container = document.createElement('div');
  container.id = 'oklch-tuner-widget';

  const dragIcon = `<svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16"><path d="M5 4h2v2H5V4zm4 0h2v2H9V4zm-4 4h2v2H5V8zm4 0h2v2H9V8zm-4 4h2v2H5v-2zm4 0h2v2H9v-2z"/></svg>`;
  const collapseIcon = `<svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><path d="M4 6h8l-4 5z"/></svg>`;

  container.innerHTML = `
    <div class="ot-header">
      <div class="ot-drag-handle" id="ot-drag-handle">${dragIcon}</div>
      <h3>oklch-tuner</h3>
      <button class="ot-icon-btn" id="ot-collapse-btn" style="padding:4px 6px;" title="Toggle widget">${collapseIcon}</button>
      <button class="ot-copy-btn" id="ot-copy-btn">Copy CSS</button>
    </div>
    <div class="ot-collapsible">
      <div class="ot-complex-warn" id="ot-complex-warn">
        ⚠️ Complex CSS value detected (calc/var). Moving sliders will overwrite it with an absolute color.
      </div>
      <div class="ot-var-grid" id="ot-var-grid"></div>
      <div class="ot-control"><label>L</label><input type="range" id="ot-l" min="0" max="100" step="1"><span id="ot-val-l"></span></div>
      <div class="ot-control"><label>C</label><input type="range" id="ot-c" min="0" max="0.4" step="0.005"><span id="ot-val-c"></span></div>
      <div class="ot-control"><label>H</label><input type="range" id="ot-h" min="0" max="360" step="1"><span id="ot-val-h"></span></div>
      <div class="ot-control"><label>A</label><input type="range" id="ot-a" min="0" max="1" step="0.05"><span id="ot-val-a"></span></div>
    </div>
  `;
  shadow.appendChild(container);
  document.body.appendChild(host);

  // ── Restore saved position ──────────────────────────────────────────────────
  const savedPos = JSON.parse(localStorage.getItem(STORAGE_POS_KEY) || 'null');
  if (savedPos) {
    container.style.right = 'auto';
    container.style.bottom = 'auto';
    container.style.left = savedPos.left + 'px';
    container.style.top  = savedPos.top  + 'px';
    
    // Ensure the restored position is within the current viewport (e.g. if switching from desktop to mobile)
    requestAnimationFrame(() => {
      const rect = container.getBoundingClientRect();
      const maxLeft = window.innerWidth - rect.width;
      const maxTop = window.innerHeight - rect.height;
      
      const clampedLeft = Math.max(0, Math.min(savedPos.left, maxLeft));
      const clampedTop = Math.max(0, Math.min(savedPos.top, maxTop));
      
      container.style.left = clampedLeft + 'px';
      container.style.top = clampedTop + 'px';
    });
  }

  // ── Variable tabs ───────────────────────────────────────────────────────────
  const grid = shadow.getElementById('ot-var-grid');
  variables.forEach(v => {
    const btn = document.createElement('button');
    btn.className = `ot-var-pill ${v === activeVar ? 'ot-active' : ''}`;
    btn.textContent = v;
    btn.dataset.var = v;
    btn.onclick = () => {
      shadow.querySelectorAll('.ot-var-pill').forEach(p => p.classList.remove('ot-active'));
      btn.classList.add('ot-active');
      activeVar = v;
      localStorage.setItem(STORAGE_VAR_KEY, v);
      syncUI();
    };
    grid.appendChild(btn);
  });

  // ── Refs ────────────────────────────────────────────────────────────────────
  const domL = shadow.getElementById('ot-l'); const valL = shadow.getElementById('ot-val-l');
  const domC = shadow.getElementById('ot-c'); const valC = shadow.getElementById('ot-val-c');
  const domH = shadow.getElementById('ot-h'); const valH = shadow.getElementById('ot-val-h');
  const domA = shadow.getElementById('ot-a'); const valA = shadow.getElementById('ot-val-a');
  const domWarn = shadow.getElementById('ot-complex-warn');

  // ── Sync UI ─────────────────────────────────────────────────────────────────
  function syncUI() {
    const cur = state[activeVar];
    domL.value = cur.l; valL.textContent = Math.round(cur.l) + '%';
    domC.value = cur.c; valC.textContent = cur.c.toFixed(3);
    domH.value = cur.h; valH.textContent = Math.round(cur.h);
    domA.value = cur.a; valA.textContent = cur.a.toFixed(2);
    
    // Fix B: Show warning if value is complex
    domWarn.style.display = cur.isComplex ? 'block' : 'none';
  }

  function applyCSS() {
    const cur = state[activeVar];
    document.documentElement.style.setProperty(activeVar, toOklchStr(cur));
  }

  // ── Sliders ─────────────────────────────────────────────────────────────────
  [domL, domC, domH, domA].forEach(slider => {
    slider.addEventListener('input', () => {
      state[activeVar] = {
        l: parseFloat(domL.value),
        c: parseFloat(domC.value),
        h: parseFloat(domH.value),
        a: parseFloat(domA.value),
        isComplex: false // Moving slider overrides complex value
      };
      syncUI();
      applyCSS();
    });
  });

  // ── Collapse ────────────────────────────────────────────────────────────────
  const collapseBtn = shadow.getElementById('ot-collapse-btn');
  collapseBtn.addEventListener('click', () => {
    container.classList.toggle('ot-collapsed');
    const isCollapsed = container.classList.contains('ot-collapsed');
    collapseBtn.innerHTML = isCollapsed
      ? `<svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><path d="M4 10h8l-4-5z"/></svg>`
      : `<svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><path d="M4 6h8l-4 5z"/></svg>`;
  });

  // ── Copy CSS ────────────────────────────────────────────────────────────────
  const copyBtn = shadow.getElementById('ot-copy-btn');
  copyBtn.addEventListener('click', () => {
    const lines = variables.map(v => `  ${v}: ${toOklchStr(state[v])};`).join('\n');
    const css = `:root {\n${lines}\n}`;
    navigator.clipboard.writeText(css).then(() => {
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('ot-copied');
      setTimeout(() => {
        copyBtn.textContent = 'Copy CSS';
        copyBtn.classList.remove('ot-copied');
      }, 1800);
    });
  });

  // ── Drag ────────────────────────────────────────────────────────────────────
  const handle = shadow.getElementById('ot-drag-handle');
  let isDragging = false, startX, startY, initialLeft, initialTop;

  handle.addEventListener('pointerdown', (e) => {
    isDragging = true;
    handle.setPointerCapture(e.pointerId);
    const rect = container.getBoundingClientRect();
    initialLeft = rect.left; initialTop = rect.top;
    startX = e.clientX; startY = e.clientY;
    container.style.right  = 'auto';
    container.style.bottom = 'auto';
    container.style.left   = initialLeft + 'px';
    container.style.top    = initialTop  + 'px';
    e.preventDefault();
  });
  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    
    let newLeft = initialLeft + e.clientX - startX;
    let newTop = initialTop + e.clientY - startY;
    
    // Clamp to screen bounds to prevent disappearing off-screen
    const rect = container.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width;
    const maxTop = window.innerHeight - rect.height;
    
    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));
    
    container.style.left = newLeft + 'px';
    container.style.top  = newTop + 'px';
  });
  window.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    handle.releasePointerCapture(e.pointerId);
    localStorage.setItem(STORAGE_POS_KEY, JSON.stringify({
      left: parseFloat(container.style.left),
      top:  parseFloat(container.style.top),
    }));
  });

  syncUI();
}
