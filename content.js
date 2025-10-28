async function main() {
  const dataService = window.__GGT_dataService;
  const overlayService = window.__GGT_overlayService;
  let overlayHtml = '';
  let overlayCss = '';

  async function loadOverlayAssets() {
    try {
      if (window.__GGT_assetService && typeof window.__GGT_assetService.loadAsset === 'function') {
        overlayHtml = await window.__GGT_assetService.loadAsset('overlay/overlay.html');
        overlayCss = await window.__GGT_assetService.loadAsset('overlay/overlay.css');
      } else {
        const getURL = (p) => {
          try {
            if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
              return chrome.runtime.getURL(p);
            }
          } catch (e) { /* ignore */ }
          return p;
        };

        try {
          const resHtml = await fetch(getURL('overlay/overlay.html'));
          if (resHtml.ok) overlayHtml = await resHtml.text();
        } catch (e) { console.warn('[GGT] fetch overlay.html failed', e); }

        try {
          const resCss = await fetch(getURL('overlay/overlay.css'));
          if (resCss.ok) overlayCss = await resCss.text();
        } catch (e) { console.warn('[GGT] fetch overlay.css failed', e); }
      }

      try {
        const evt = new CustomEvent('GGT_overlay_assets_ready', { detail: { html: overlayHtml, css: overlayCss } });
        window.dispatchEvent(evt);
      } catch (e) { console.error('[GGT] Dispatch overlay assets ready event error', e); }
    } catch (err) { console.error('[GGT] Asset loading error', err); }
  }

  await loadOverlayAssets();

  // Get data for each assistant bubble
  function getBubbleInfo() {
    try {
      if (dataService && typeof dataService.getInfo === 'function') {
        return dataService.getInfo();
      }
    } catch (e) { console.error('[GGT] getBubbleInfo error', e); }
  }

  // Send updates to overlay service
  function sendCount(bubbleDiv) {
    try {
      if (overlayService && typeof overlayService.sendCount === 'function') {
        overlayService.sendCount(bubbleDiv);
        return;
      }
    } catch (e) { console.error('[GGT] sendCount error', e); }
  }


  // #region Utilities

  function debounce(fn, ms) {
    let t = null;
    return function () {
      if (t) clearTimeout(t);
      t = setTimeout(() => { t = null; fn(); }, ms);
    };
  }

  const update = debounce(() => {
    const bubbleDiv = getBubbleInfo();
    sendCount(bubbleDiv);
  }, 120);

  try {
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    update();
  } catch (e) {
    console.warn('[GGT] Observer failed', e);
  }

  // #endregion Utilities
}

main().catch(err => { console.error('[GGT] Main error', err); });
