(function () {

  const AGENT__BUBBLE = 'div[data-message-author-role="assistant"]';
  let nextCharId = parseInt(window.__GGT_nextCharId || 0, 10) || 0;
  let charArray = window.__GGT_charArray || [];

  function ensureBadgeStyle() {
    if (document.getElementById('ggt-badge-style')) return;
    const s = document.createElement('style');
    s.id = 'ggt-badge-style';
    s.textContent = `
      .ggt__badge {
        width: 100%;
        display: inline-flex;
        gap: 8px;
        font-size: 12px;
        color: #fff;
      }
      .ggt__badge .ggt__chip {
        background: rgba(255,255,255,0.08);
        padding: 2px 6px;
        border-radius: 6px;
        font-weight: 500;
        color: #e6f4ff;
      }
      /* ensure the badge doesn't break layout too much */
      ${AGENT__BUBBLE} > .ggt__badge + * { margin-top: 6px; }
    `;
    document.head.appendChild(s);
  }

  function computeTokenCount(text) {
    text = String(text || '');
    try {
      const tok = window.__GGT_tokenizer;
      if (tok && typeof tok.encode === 'function') {
        const encoded = tok.encode(text);
        if (Array.isArray(encoded)) return encoded.length;
        if (typeof encoded === 'number') return encoded;
      }
    } catch (e) {
      console.warn('[GGT] tokenizer.encode failed', e);
    }
  }

  function addOrUpdateBadge(div, count, tokens) {
    try {
      ensureBadgeStyle();
      let badge = null;
      try { badge = div.querySelector(':scope > .ggt__badge'); } 
      catch (e) { badge = div.querySelector('.ggt__badge'); }
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'ggt__badge';
        div.insertBefore(badge, div.firstChild);
      }
      // Update content
      badge.innerHTML = `<span class="ggt__chip">${count} characters</span><span class="ggt__chip">${tokens} tokens</span>`;
    } catch (e) {
      console.warn('[GGT] addOrUpdateBadge failed', e);
    }
  }

  function getTexts() {
    const divs = document.querySelectorAll(AGENT__BUBBLE);
    return Array.from(divs).map(d => (d.innerText || '').trim()).filter(Boolean);
  }

  function getInfo() {
    const divs = document.querySelectorAll(AGENT__BUBBLE);
    const arr = [];

    nextCharId = nextCharId || 0;
    divs.forEach(d => {
      if (!d.dataset.assCharId) {
        nextCharId += 1;
        d.dataset.assCharId = 'ass-' + nextCharId;
      }
      const text = (d.innerText || '').trim();
      const count = text.length;
      const tokens = computeTokenCount(text);
      arr.push({ id: d.dataset.assCharId, count, tokens, text });

      // Append badge on current div
      addOrUpdateBadge(d, count, tokens);
    });

    // #region Utilities

    // Persist counter for future runs
    charArray = arr;
    window.__GGT_nextCharId = nextCharId;
    window.__GGT_charArray = charArray;

    // Keep overview page in sync
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ ggtData: charArray }, () => {});
      } else {
        localStorage.setItem('ggtData', JSON.stringify(charArray));
      }
    } catch (e) { /* ignore */ }

    return arr;
  }

  window.__GGT_dataService = {
    getTexts,
    getInfo,
    computeTokenCount
  };

  // #endregion Utilities

})();
