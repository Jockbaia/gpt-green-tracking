(function () {

  const AGENT__BUBBLE = 'div[data-message-author-role="assistant"]';
  const PUE_STORAGE_KEY = 'ggt__selected_pue';
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
        align-items: center;
      }
      .ggt__badge .ggt__chip {
        background: rgba(255,255,255,0.08);
        padding: 2px 6px;
        border-radius: 6px;
        font-weight: 500;
        color: #e6f4ff;
      }
      ${AGENT__BUBBLE} > .ggt__badge + * { margin-top: 6px; }
    `;
    document.head.appendChild(s);
  }

  function computeTokenCount(text) {
    text = String(text || '');
    try {
      const tok = window.__GGT_tokenizer;
      const model = window.__GGT_token_model || 'cl100k_base';
      if (tok && typeof tok.encode === 'function') {
        const encoded = tok.encode(text, model);
        if (Array.isArray(encoded)) return encoded.length;
        if (typeof encoded === 'number') return encoded;
      }
    } catch (e) {
      console.warn('[GGT] tokenizer.encode failed', e);
    }
    return 0;
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

      // Only show the selected model
      const models = (window.__GGT_tokenizer && typeof window.__GGT_tokenizer.getModels === 'function')
        ? window.__GGT_tokenizer.getModels() : [];

      const selectedModel = window.__GGT_token_model || localStorage.getItem('ggt__token_model') || models[0];

      const text = getOriginalBubbleText(div);

      // Compute tokens for the selected model
      let toks = [];
      try {
        toks = window.__GGT_tokenizer.encode(text, selectedModel);
      } catch (e) {
        toks = [];
      }

      // Get the selected PUE from local storage
      const selectedPue = JSON.parse(localStorage.getItem(PUE_STORAGE_KEY)) || { value: 1.0 };

      // Calculate watts consumed
      const FLOPS_PER_TOKEN = 3e11;            
      const GPU_FLOPS_PER_JOULE = 7.8e11;     
      const JOULES_PER_TOKEN = FLOPS_PER_TOKEN / GPU_FLOPS_PER_JOULE; 
      const totalJoules = tokens * JOULES_PER_TOKEN * selectedPue.value;
      const totalWh = totalJoules / 3600; // 1 Wh = 3600 J
      const mWh = totalWh * 1000;

      // Calculate gCO2 emissions
      const CO2_PER_KWH = 475;
      const totalCO2 = (totalWh / 1000) * CO2_PER_KWH;

      // Display values
      const mwattsConsumed = mWh.toFixed(4);
      const gCO2 = totalCO2.toFixed(4);

      const html = `
        <span class="ggt__chip">${count} chars</span>
        <span class="ggt__chip">${toks.length} tokens</span>
        <span class="ggt__chip">${mwattsConsumed} mWh</span>
        <span class="ggt__chip">${gCO2} gCO₂</span>
      `;

      badge.innerHTML = html;
    } catch (e) {
      console.warn('[GGT] addOrUpdateBadge failed', e);
    }
  }

  function getOriginalBubbleText(div) {
    // Prevent counting badge text
    let node = div;
    if (div.firstElementChild && div.firstElementChild.classList.contains('ggt__badge')) {
      let text = '';
      for (let i = 1; i < div.childNodes.length; ++i) {
        const child = div.childNodes[i];
        if (child.nodeType === Node.TEXT_NODE) text += child.textContent;
        else if (child.nodeType === Node.ELEMENT_NODE) text += (child.innerText || '');
      }
      return text.trim();
    } else {
      // If no badge, return full text
      return (div.innerText || '').trim();
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
      const text = getOriginalBubbleText(d);
      const count = text.length;
      const tokens = computeTokenCount(text);

      // Debug: log the content and character count
      // console.log('[GGT] Bubble content:', JSON.stringify(text), '| Characters:', count);

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
