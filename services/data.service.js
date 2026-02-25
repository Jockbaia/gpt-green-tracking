(function () {
  const AGENT__BUBBLE = 'div[data-message-author-role="assistant"]';
  const PUE_STORAGE_KEY = 'ggt__selected_pue';
  const JOULES_PER_TOKEN = 2.5; // Source: https://llm-tracker.info/_TOORG/Power-Usage-and-Energy-Efficiency
  const CO2_PER_KWH = 475;
  const GRILLING_TIME_PER_WH = 4 / 0.17; // 4 seconds per 0.17 Wh | Source: https://www.wsj.com/tech/ai/ai-prompt-video-energy-electricity-use-046766d6

  // Image token calculation constants (GPT-Image-1, rough estimations)
  // Source: https://platform.openai.com/docs/models/gpt-image-1
  const BASE_IMAGE_SIZE = 1024 * 1024;
  const IMAGE_TOKEN_QUALITY = {
    low: 272,
    med: 1056,
    high: 4160
  };
  // TODO - Add a picker for image quality in the settings
  const DEFAULT_IMAGE_QUALITY = 'med';

  let nextCharId = parseInt(window.__GGT_nextCharId || 0, 10) || 0;
  let charArray = window.__GGT_charArray || [];

  function ensureBadgeStyle() {
    if (document.getElementById('ggt-badge-style')) return;

    const style = document.createElement('style');
    style.id = 'ggt-badge-style';
    style.textContent = `
      .ggt__badge {
        width: 100%;
        display: inline-flex;
        gap: 8px;
        font-size: 12px;
        color: #fff;
        align-items: center;
        flex-wrap: wrap;
      }
      .ggt__badge .ggt__chip {
        background: #212121;
        padding: 2px 6px;
        border-radius: 6px;
        font-weight: 500;
        color: #e6f4ff;
      }
      .ggt__chip--mwh {
         border: 1px solid #ffb74d;
        color: #ffb74d;
      }
      .ggt__chip--co2 {
        border: 1px solid #81a9c7ff;
        color: #81b1c7ff;
      }
      .ggt__chip--grill {
        border: 1px solid #9aefbcff;
        color: #9aefb2ff;
      }
      .ggt__chip--image {
        border: 1px solid #ba68c8;
        color: #ba68c8;
      }
      ${AGENT__BUBBLE} > .ggt__badge + * {
        margin-top: 6px;
      }
      .ggt__image-badge {
        margin-bottom: 8px !important;
        padding: 8px;
        border-radius: 8px;
        width: fit-content !important;
      }
    `;
    document.head.appendChild(style);
  }

  function computeTokenCount(text) {
    try {
      const tokenizer = window.__GGT_tokenizer;
      const model = window.__GGT_token_model || 'cl100k_base';
      if (tokenizer && typeof tokenizer.encode === 'function') {
        const encoded = tokenizer.encode(text, model);
        return Array.isArray(encoded) ? encoded.length : encoded;
      }
    } catch (e) {
      console.warn('[GGT] Tokenizer encode failed:', e);
    }
    return 0;
  }

  function computeImageTokens(width, height, quality = DEFAULT_IMAGE_QUALITY) {
    const pixelCount = width * height;
    const baseTokens = IMAGE_TOKEN_QUALITY[quality] || IMAGE_TOKEN_QUALITY[DEFAULT_IMAGE_QUALITY];
    const tokens = Math.round((pixelCount / BASE_IMAGE_SIZE) * baseTokens);
    return tokens;
  }

  function addImageBadge(img) {
    try {      
      ensureBadgeStyle();

      const existingBadge = img.parentNode.querySelector('.ggt__image-badge');
      if (existingBadge) {
        return;
      }

      let width, height, tokens;
      
      if (img.dataset.ggtProcessed) {
        width = parseInt(img.dataset.ggtWidth);
        height = parseInt(img.dataset.ggtHeight);
        tokens = parseInt(img.dataset.ggtTokens);
      } else {
        img.dataset.ggtProcessed = 'true';
        width = img.naturalWidth || img.width || img.offsetWidth || img.clientWidth;
        height = img.naturalHeight || img.height || img.offsetHeight || img.clientHeight;
        
        if (!width || !height) {
          const rect = img.getBoundingClientRect();
          width = width || rect.width;
          height = height || rect.height;
        }
                
        if (!width || !height) {
          return;
        }

        width = Math.round(width);
        height = Math.round(height);

        tokens = computeImageTokens(width, height);

        img.dataset.ggtWidth = width;
        img.dataset.ggtHeight = height;
        img.dataset.ggtTokens = tokens;
      }

      const selectedPue = JSON.parse(localStorage.getItem(PUE_STORAGE_KEY)) || { value: 1.0 };
      const totalJoules = tokens * JOULES_PER_TOKEN * selectedPue.value;
      const totalWh = totalJoules / 3600;
      const mWh = totalWh * 1000;
      const totalCO2 = (totalWh / 1000) * CO2_PER_KWH;
      const grillingTime = (totalWh * GRILLING_TIME_PER_WH).toFixed(2);

      const badge = document.createElement('div');
      badge.className = 'ggt__badge ggt__image-badge';
      badge.style.position = 'relative';
      badge.style.zIndex = '1000';
      badge.innerHTML = `
        <span class="ggt__chip ggt__chip--image">🖼️ ${width}×${height}px</span>
        <span class="ggt__chip">${tokens} tokens</span>
        <span class="ggt__chip ggt__chip--mwh">⚡${mWh.toFixed(4)} mWh</span>
        <span class="ggt__chip ggt__chip--co2">🏭${totalCO2.toFixed(4)} gCO₂</span>
        <span class="ggt__chip ggt__chip--grill">🥦${grillingTime}s</span>
      `;

      let targetParent = img.parentNode;
      
      targetParent.insertBefore(badge, targetParent.firstChild);
    } catch (e) {
      console.error('[GGT] Failed to add image badge:', e);
    }
  }

  function processAllGeneratedImages() {
    const allImages = document.querySelectorAll('img[alt="Generated image"]');
    
    allImages.forEach((img, index) => {
      if (img.complete && (img.naturalWidth > 0 || img.offsetWidth > 0)) {
        addImageBadge(img);
      } else {
        img.addEventListener('load', () => {
          setTimeout(() => addImageBadge(img), 100);
        }, { once: true });
        
        setTimeout(() => {
          if (!img.dataset.ggtProcessed) {
            addImageBadge(img);
          }
        }, 1000);
      }
    });
  }

  function addOrUpdateBadge(div, count, tokens) {
    try {
      ensureBadgeStyle();

      let badge = div.querySelector('.ggt__badge:not(.ggt__image-badge)');
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'ggt__badge';
        div.insertBefore(badge, div.firstChild);
      }

      const selectedPue = JSON.parse(localStorage.getItem(PUE_STORAGE_KEY)) || { value: 1.0 };
      const totalJoules = tokens * JOULES_PER_TOKEN * selectedPue.value;
      const totalWh = totalJoules / 3600;
      const mWh = totalWh * 1000;
      const totalCO2 = (totalWh / 1000) * CO2_PER_KWH;
      const grillingTime = (totalWh * GRILLING_TIME_PER_WH).toFixed(2);

      badge.innerHTML = `
        <span class="ggt__chip">${count} chars</span>
        <span class="ggt__chip">${tokens} tokens</span>
        <span class="ggt__chip ggt__chip--mwh">⚡${mWh.toFixed(4)} mWh</span>
        <span class="ggt__chip ggt__chip--co2">🏭${totalCO2.toFixed(4)} gCO₂</span>
        <span class="ggt__chip ggt__chip--grill">🥦${grillingTime}s</span>
      `;
    } catch (e) {
      console.warn('[GGT] Failed to add or update badge:', e);
    }
  }

  function getOriginalBubbleText(div) {
    if (div.firstElementChild && div.firstElementChild.classList.contains('ggt__badge')) {
      return Array.from(div.childNodes)
        .slice(1)
        .map((child) => (child.nodeType === Node.TEXT_NODE ? child.textContent : child.innerText || ''))
        .join('')
        .trim();
    }
    return (div.innerText || '').trim();
  }

  function getInfo() {
    const divs = document.querySelectorAll(AGENT__BUBBLE);
    const arr = [];

    divs.forEach((div) => {
      if (!div.dataset.assCharId) {
        div.dataset.assCharId = `ass-${++nextCharId}`;
      }

      const text = getOriginalBubbleText(div);
      const count = text.length;
      const tokens = computeTokenCount(text);

      arr.push({ id: div.dataset.assCharId, count, tokens, text });
      addOrUpdateBadge(div, count, tokens);
    });

    processAllGeneratedImages();

    // Persist data for future runs
    charArray = arr;
    window.__GGT_nextCharId = nextCharId;
    window.__GGT_charArray = charArray;

    // Sync with storage
    try {
      if (chrome?.storage?.local) {
        chrome.storage.local.set({ ggtData: charArray });
      } else {
        localStorage.setItem('ggtData', JSON.stringify(charArray));
      }
    } catch (e) {
      console.warn('[GGT] Failed to sync data:', e);
    }

    return arr;
  }

  // Expose the data service
  window.__GGT_dataService = {
    getTexts: () => Array.from(document.querySelectorAll(AGENT__BUBBLE)).map((div) => div.innerText.trim()),
    getInfo,
    computeTokenCount,
    computeImageTokens,
  };
})();
