/* 
    MODEL_PICKER.JS
    ----------------
    - Loads HTML and CSS from external files (keeps inline content out of script for MV3 CSP)
    - Renders model buttons, handles selection, tooltips and publishes change events
    - Takes models from window.__GGT_tokenizer if available
*/

(async function initModelPicker() {
  const BASE = 'model-picker/';
  const HTML_PATH = BASE + 'model-picker.html';
  const CSS_PATH = BASE + 'model-picker.css';

  // Get full URL for extension resource
  function getAssetUrl(rel) {
    try { return chrome.runtime.getURL(rel); } catch (e) { return rel; }
  }

  // Inject CSS file contents into <head>
  async function injectCss(path) {
    try {
      const url = getAssetUrl(path);
      const res = await fetch(url);
      if (!res.ok) throw new Error('[GGT] model-picker CSS fetch failed');
      const css = await res.text();
      const style = document.createElement('style');
      style.setAttribute('data-ggt','model-picker-style');
      style.textContent = css;
      document.head.appendChild(style);
    } catch (err) {
      console.warn('[GGT] model-picker injectCss failed', err);
    }
  }

  // Inject HTML template into the document body
  async function injectHtml(path) {
    try {
      const url = getAssetUrl(path);
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTML fetch failed');
      const html = await res.text();
      // Avoid multiple injections
      if (document.getElementById('ggt-overlay-ui')) return;
      // Insert at end of body
      document.body.insertAdjacentHTML('beforeend', html);
    } catch (err) {
      console.warn('[GGT] model-picker injectHtml failed', err);
    }
  }

  // Get models from tokenizer
  function getAvailableModels() {
    try {
      const tok = window.__GGT_tokenizer;
      if (tok && typeof tok.getModels === 'function') return tok.getModels();
    } catch (e) { /* ignore */ }
  }

  // Publish selection to page + extension storage so other parts update immediately
  function publishModelSelection(model) {
    try {
      window.__GGT_token_model = model;
      localStorage.setItem('ggt__token_model', model);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ ggt__token_model: model }, () => {});
        try { chrome.runtime.sendMessage({ type: 'ggt__model_changed', model }); } catch (e) {}
      }
      // in-page events for content scripts
      window.dispatchEvent(new CustomEvent('ggt__model_changed', { detail: { model } }));
      window.postMessage({ ggt__model_changed: true, model }, '*');
    } catch (e) { console.warn('[GGT] publishModelSelection failed', e); }
  }

  // Tooltip helper: show/hide and position below button
  function showTooltip(btn, text) {
    const tip = document.getElementById('ggt-overlay-tooltip');
    if (!tip) return;
    tip.textContent = text;
    tip.style.display = 'block';
    // allow layout to compute size
    requestAnimationFrame(() => {
      const r = btn.getBoundingClientRect();
      const left = Math.min(window.innerWidth - 10 - tip.offsetWidth, Math.max(8, r.left + (r.width - tip.offsetWidth) / 2));
      const top = Math.min(window.innerHeight - 10 - tip.offsetHeight, r.bottom + 8);
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
      tip.setAttribute('aria-hidden','false');
    });
  }
  function hideTooltip() {
    const tip = document.getElementById('ggt-overlay-tooltip');
    if (!tip) return;
    tip.style.display = 'none';
    tip.setAttribute('aria-hidden','true');
  }

  // Render model buttons into the picker and attach handlers
  function renderButtons(models, selected) {
    const wrap = document.getElementById('ggt-btn-wrap');
    if (!wrap) return;
    wrap.innerHTML = '';
    models.forEach(m => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ggt-btn' + (m === selected ? ' ggt-btn-active' : '');
      b.textContent = m;
      b.dataset.model = m;
      b.addEventListener('click', () => {
        publishModelSelection(m);
        Array.from(wrap.children).forEach(ch => ch.classList.toggle('ggt-btn-active', ch.dataset.model === m));
      });
      b.addEventListener('mouseenter', () => showTooltip(b, `Model: ${m} — click to select`));
      b.addEventListener('mouseleave', hideTooltip);
      b.addEventListener('focus', () => showTooltip(b, `Model: ${m} — press Enter to select`));
      b.addEventListener('blur', hideTooltip);
      wrap.appendChild(b);
    });
  }

  // Rebuild buttons when tokenizer becomes available or selection changes externally
  function tryRebuild() {
    const models = getAvailableModels();
    const selected = window.__GGT_token_model || localStorage.getItem('ggt__token_model') || models[0];
    renderButtons(models, selected);
  }

  // Load assets and initialize UI
  try {
    await injectCss(CSS_PATH);
    await injectHtml(HTML_PATH);
    // Initial render
    tryRebuild();

    // Re-run rebuild shortly after in case tokenizer loads late
    setTimeout(tryRebuild, 300);
    setTimeout(tryRebuild, 1200);

    // Listen for external model changes (settings popup, storage, runtime messages)
    window.addEventListener('ggt__model_changed', () => tryRebuild());
    window.addEventListener('storage', (e) => {
      if (e.key === 'ggt__token_model') tryRebuild();
    });
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((msg) => {
          if (msg && msg.type === 'ggt__model_changed') tryRebuild();
        });
      }
    } catch (e) { /* ignore */ }

  } catch (err) {
    console.warn('[GGT] model picker init failed', err);
  }
})();