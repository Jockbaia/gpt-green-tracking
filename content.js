async function main() {
  const dataService = window.__GGT_dataService;

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
