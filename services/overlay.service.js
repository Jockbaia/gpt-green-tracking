(function () {

  const DATA_LOADING_DIV = '.streaming-animation';
  let overlayCss = window.__GGT_overlayCss || '';
  let overlayHtml = window.__GGT_overlayHtml || '';

  function createOverlay(html) {
    // check if overlay already exists
    let overlay = document.getElementById('overlay');
    if (overlay) return overlay;

    // if not, create it from provided HTML
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html.trim();
    overlay = wrapper.firstElementChild;
    if (!overlay) return null;
    overlay.id = overlay.id || 'overlay';
    document.body.appendChild(overlay);
    return overlay;
  }

  function updateOverlay(perDiv) {
    const overlay = createOverlay(overlayHtml || '');
    if (!overlay) return;
    const textEl = overlay.querySelector('#overlay__text');
    const loadingIcon = overlay.querySelector('#overlay__spinner');
    const dataIsLoading = !!document.querySelector(DATA_LOADING_DIV);

    // show or hide loading icon based on data loading state
    if (loadingIcon) {
      try {
        const src = safeGetURL((loadingIcon.dataset && loadingIcon.dataset.src) || 'assets/svg/loading.svg');
        loadingIcon.src = src;
      } catch (e) { /* ignore */ }
      loadingIcon.style.display = dataIsLoading ? 'inline-block' : 'none';
    }

    const texts = Array.isArray(perDiv) ? perDiv.map(p => p.text) : [];
    const joined = texts.join('\n\n---\n\n');
    const count = joined.length;

    if (textEl) textEl.textContent = `Assistant characters: ${count}`;
    overlay.__assistantCharData = Array.isArray(perDiv) ? perDiv : [];
    return count;
  }

  function loadOverlayStyle(css) {
    const styleId = 'overlay__style';
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      s.textContent = css || '';
      document.head.appendChild(s);
    }
  }

  // if safeGetURL is defined, preload spinner image
  try {
    const preloadPath = safeGetURL('assets/svg/loading.svg');
    const __ggt_preload_spinner = new Image();
    __ggt_preload_spinner.src = preloadPath;
  } catch (e) { /* ignore */ }

  function safeGetURL(path) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
        return chrome.runtime.getURL(path);
      }
    } catch (e) { /* ignore */ }
    return path;
  }

  // [!] manage sending of assistant data messages

  function safeSendMessage(msg) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
        const res = chrome.runtime.sendMessage(msg);
        if (res && typeof res.then === 'function') res.catch(() => {});
      }
    } catch (e) { /* ignore */ }
  }

  function sendCount(perDiv) {
    const texts = Array.isArray(perDiv) ? perDiv.map(p => p.text) : [];
    const joined = texts.join('\n\n---\n\n');
    const count = joined.length;

    updateOverlay(perDiv);

    try {
      safeSendMessage({ type: 'ggt__assistant-data', count: count, snippets: texts, perDiv });
    } catch (e) { /* ignore */ }

    return count;
  }


  // #region Utilities

  function onAssetsReady(e) {
    try {
      const detail = (e && e.detail) || {};
      if (detail.css) loadOverlayStyle(detail.css);
      if (detail.html) {
        overlayHtml = detail.html;
        createOverlay(detail.html);
      }
    } catch (err) { /* ignore */ }
  }

  window.addEventListener('GGT_overlay_assets_ready', onAssetsReady);

  if (overlayHtml) {
    try { 
        loadOverlayStyle(overlayCss || '');
        createOverlay(overlayHtml);
    } catch (e) {}
  }

  window.__GGT_overlayService = {
    loadOverlayStyle,
    createOverlay,
    updateOverlay,
    sendCount
  };

  // #endregion Utilities
})();
