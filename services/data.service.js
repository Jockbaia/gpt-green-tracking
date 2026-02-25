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

  // Tooltip definitions
  const TOOLTIP_TEXTS = {
    chars: "Number of characters in the AI response.",
    tokens: "Numbers of tokens. Text is broken into tokens (words, parts of words, or punctuation) for the AI to understand and generate responses.",
    mwh: "Estimated electrical energy used to generate this response, measured in milliwatt-hours (mWh).",
    co2: "Estimated emissions from the electricity used to generate this response, measured in grams of CO₂ equivalent.",
    grill: "Time equivalent of energy consumption compared to cook broccoli (4 seconds = 0.17 Wh).",
    image_size: "Image size: Width × height in pixels.",
    image_tokens: "Estimated tokens required to generate this image."
  };

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
        cursor: help;
        position: relative;
        transition: background-color 0.2s ease;
      }
      .ggt__badge .ggt__chip:hover {
        background: #333;
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
      
      /* Tooltip styles */
      .ggt__tooltip {
        position: fixed;
        background: rgba(0, 0, 0, 0.9);
        color: #fff;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        max-width: 300px;
        z-index: 2147483647;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        line-height: 1.4;
      }
      .ggt__tooltip.visible {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  // Tooltip management
  let currentTooltip = null;

  function showTooltip(element, text, event) {
    hideTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'ggt__tooltip';
    tooltip.textContent = text;
    document.body.appendChild(tooltip);
    
    // Position tooltip - use element position instead of mouse position initially
    const rect = element.getBoundingClientRect();
    
    // Get tooltip dimensions after adding to DOM
    requestAnimationFrame(() => {
      const tooltipRect = tooltip.getBoundingClientRect();
      
      let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
      let top = rect.top - tooltipRect.height - 8;
      
      // Keep tooltip within viewport
      if (left < 10) left = 10;
      if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
      }
      if (top < 10) {
        top = rect.bottom + 8;
      }
      
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      tooltip.classList.add('visible');
    });
    
    currentTooltip = tooltip;
  }

  function hideTooltip() {
    if (currentTooltip) {
      currentTooltip.remove();
      currentTooltip = null;
    }
  }

  function addTooltipListeners(chip, tooltipKey) {
    chip.addEventListener('mouseenter', (e) => {
      showTooltip(chip, TOOLTIP_TEXTS[tooltipKey], e);
    });
    
    chip.addEventListener('mouseleave', () => {
      hideTooltip();
    });
  }

  function computeTokenCount(text) {
    try {
      const tokenizer = window.__GGT_tokenizer;
      const model = window.__GGT_token_model || 'cl100k_base';
      
      if (tokenizer && typeof tokenizer.encode === 'function') {
        const encoded = tokenizer.encode(text, model);
        const tokenCount = Array.isArray(encoded) ? encoded.length : encoded;
        return tokenCount;
      } else {
        // Fallback: rough estimation
        return Math.ceil(text.length / 4);
      }
    } catch (e) {
      console.warn('[GGT] Tokenizer encode failed:', e);
      // Fallback: rough estimation  
      return Math.ceil(text.length / 4);
    }
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
      
      const imageSizeChip = document.createElement('span');
      imageSizeChip.className = 'ggt__chip ggt__chip--image';
      imageSizeChip.textContent = `🖼️ ${width}×${height}px`;
      addTooltipListeners(imageSizeChip, 'image_size');
      
      const imageTokensChip = document.createElement('span');
      imageTokensChip.className = 'ggt__chip';
      imageTokensChip.textContent = `${tokens} tokens`;
      addTooltipListeners(imageTokensChip, 'image_tokens');
      
      const mwhChip = document.createElement('span');
      mwhChip.className = 'ggt__chip ggt__chip--mwh';
      mwhChip.textContent = `⚡${mWh.toFixed(4)} mWh`;
      addTooltipListeners(mwhChip, 'mwh');
      
      const co2Chip = document.createElement('span');
      co2Chip.className = 'ggt__chip ggt__chip--co2';
      co2Chip.textContent = `🏭${totalCO2.toFixed(4)} gCO₂`;
      addTooltipListeners(co2Chip, 'co2');
      
      const grillChip = document.createElement('span');
      grillChip.className = 'ggt__chip ggt__chip--grill';
      grillChip.textContent = `🥦${grillingTime}s`;
      addTooltipListeners(grillChip, 'grill');

      badge.appendChild(imageSizeChip);
      badge.appendChild(imageTokensChip);
      badge.appendChild(mwhChip);
      badge.appendChild(co2Chip);
      badge.appendChild(grillChip);

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
      // DON'T SKIP - always create badges even with 0 tokens
      // Use fallback token count if tokenizer failed
      if (tokens === 0 && count > 0) {
        tokens = Math.ceil(count / 4); // Fallback estimation
      }
      
      // Skip only if there's truly no content
      if (count === 0) {
        return;
      }

      ensureBadgeStyle();

      let badge = div.querySelector('.ggt__badge:not(.ggt__image-badge)');
      
      // Check if badge already exists and has same data - NO FLICKERING!
      if (badge && badge.dataset.ggtChars == count && badge.dataset.ggtTokens == tokens) {
        return;
      }
      
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'ggt__badge';
        div.insertBefore(badge, div.firstChild);
      }

      // Store current values to prevent unnecessary updates
      badge.dataset.ggtChars = count;
      badge.dataset.ggtTokens = tokens;

      const selectedPue = JSON.parse(localStorage.getItem(PUE_STORAGE_KEY)) || { value: 1.0 };
      const totalJoules = tokens * JOULES_PER_TOKEN * selectedPue.value;
      const totalWh = totalJoules / 3600;
      const mWh = totalWh * 1000;
      const totalCO2 = (totalWh / 1000) * CO2_PER_KWH;
      const grillingTime = (totalWh * GRILLING_TIME_PER_WH).toFixed(2);

      badge.innerHTML = '';
      
      const charsChip = document.createElement('span');
      charsChip.className = 'ggt__chip';
      charsChip.textContent = `${count} chars`;
      addTooltipListeners(charsChip, 'chars');
      
      const tokensChip = document.createElement('span');
      tokensChip.className = 'ggt__chip';
      tokensChip.textContent = `${tokens} tokens`;
      addTooltipListeners(tokensChip, 'tokens');
      
      const mwhChip = document.createElement('span');
      mwhChip.className = 'ggt__chip ggt__chip--mwh';
      mwhChip.textContent = `⚡${mWh.toFixed(4)} mWh`;
      addTooltipListeners(mwhChip, 'mwh');
      
      const co2Chip = document.createElement('span');
      co2Chip.className = 'ggt__chip ggt__chip--co2';
      co2Chip.textContent = `🏭${totalCO2.toFixed(4)} gCO₂`;
      addTooltipListeners(co2Chip, 'co2');
      
      const grillChip = document.createElement('span');
      grillChip.className = 'ggt__chip ggt__chip--grill';
      grillChip.textContent = `🥦${grillingTime}s`;
      addTooltipListeners(grillChip, 'grill');

      badge.appendChild(charsChip);
      badge.appendChild(tokensChip);
      badge.appendChild(mwhChip);
      badge.appendChild(co2Chip);
      badge.appendChild(grillChip);
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

      // Only process if we have meaningful content
      if (count > 0) {
        arr.push({ id: div.dataset.assCharId, count, tokens, text });
        addOrUpdateBadge(div, count, tokens);
        
        // Mark as processed AFTER creating the badge
        div.dataset.ggtProcessed = 'true';
      }
    });

    processAllGeneratedImages();

    // Update storage with all data
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

  // Function to refresh all existing badges with new calculations
  function refreshAllBadges() {
    console.log('[GGT] Refreshing all badges with new PUE/model settings');
    
    // Refresh text badges
    const textDivs = document.querySelectorAll(`${AGENT__BUBBLE}[data-ggt-processed]`);
    textDivs.forEach((div) => {
      const text = getOriginalBubbleText(div);
      const count = text.length;
      const tokens = computeTokenCount(text);
      
      if (count > 0) {
        // Force update by clearing the stored values
        const badge = div.querySelector('.ggt__badge:not(.ggt__image-badge)');
        if (badge) {
          badge.dataset.ggtChars = '';
          badge.dataset.ggtTokens = '';
        }
        addOrUpdateBadge(div, count, tokens);
      }
    });
    
    // Refresh image badges
    const imageBadges = document.querySelectorAll('.ggt__image-badge');
    imageBadges.forEach((badge) => {
      const img = badge.parentNode.querySelector('img[data-ggt-processed]');
      if (img) {
        const width = parseInt(img.dataset.ggtWidth);
        const height = parseInt(img.dataset.ggtHeight);
        const tokens = parseInt(img.dataset.ggtTokens);
        
        if (width && height && tokens) {
          // Remove existing badge and recreate
          badge.remove();
          img.dataset.ggtProcessed = ''; // Reset to allow recreation
          addImageBadge(img);
        }
      }
    });
  }

  // Auto-run the badge creation
  console.log('[GGT] Data service initialized, creating badges...');
  
  // Initial run - process all existing messages
  setTimeout(() => {
    console.log('[GGT] Running initial badge creation');
    getInfo();
  }, 1000);

  // Watch for new messages (ChatGPT adds messages dynamically)
  let updateTimeout = null;
  const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.matches && node.matches(AGENT__BUBBLE)) {
            shouldUpdate = true;
          }
        });
      }
    });
    
    if (shouldUpdate) {
      // Debounce updates to prevent flickering
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        console.log('[GGT] New AI response detected, updating badges');
        
        // Only process new, unprocessed messages
        const newDivs = document.querySelectorAll(`${AGENT__BUBBLE}:not([data-ggt-processed])`);
        console.log('[GGT] Found', newDivs.length, 'new messages to process');
        
        newDivs.forEach((div) => {
          if (!div.dataset.assCharId) {
            div.dataset.assCharId = `ass-${++nextCharId}`;
          }

          const text = getOriginalBubbleText(div);
          const count = text.length;
          const tokens = computeTokenCount(text);

          if (count > 0) {
            addOrUpdateBadge(div, count, tokens);
            div.dataset.ggtProcessed = 'true';
          }
        });
      }, 300);
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('[GGT] Badge observer started');

  // Listen for PUE changes
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('ggt-pue-btn')) {
      console.log('[GGT] PUE selection changed, refreshing badges in 100ms');
      setTimeout(refreshAllBadges, 100);
    }
  });

  // Listen for model changes
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('ggt-btn') && e.target.hasAttribute('data-model')) {
      console.log('[GGT] Model selection changed, refreshing badges in 100ms');
      setTimeout(refreshAllBadges, 100);
    }
  });

  // Also listen for storage changes (in case other tabs change settings)
  window.addEventListener('storage', (e) => {
    if (e.key === PUE_STORAGE_KEY) {
      console.log('[GGT] PUE changed in storage, refreshing badges');
      setTimeout(refreshAllBadges, 100);
    }
  });

  // Listen for custom events from pickers (more reliable)
  document.addEventListener('ggt-pue-changed', () => {
    console.log('[GGT] PUE changed event received, refreshing badges');
    setTimeout(refreshAllBadges, 100);
  });

  document.addEventListener('ggt-model-changed', () => {
    console.log('[GGT] Model changed event received, refreshing badges');
    setTimeout(refreshAllBadges, 100);
  });

  // Expose the data service
  window.__GGT_dataService = {
    getTexts: () => Array.from(document.querySelectorAll(AGENT__BUBBLE)).map((div) => div.innerText.trim()),
    getInfo,
    computeTokenCount,
    computeImageTokens,
    refreshAllBadges: refreshAllBadges
  };

})();
