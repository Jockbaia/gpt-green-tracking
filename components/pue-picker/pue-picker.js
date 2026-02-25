console.log('[GGT] PUE picker script loaded');
console.log('[GGT] chrome.runtime:', chrome.runtime);

(async function initPuePicker() {
  const PUE_STORAGE_KEY = 'ggt__selected_pue';
  const HTML_PATH = chrome.runtime.getURL('components/pue-picker/pue-picker.html');

  async function loadPuePickerHtml() {
    try {
      const response = await fetch(HTML_PATH);
      if (!response.ok) throw new Error('Failed to load PUE picker HTML');
      const html = await response.text();
      const container = document.createElement('div');
      container.innerHTML = html;
      return container.firstElementChild;
    } catch (e) {
      console.error('[GGT] Failed to load PUE picker HTML:', e);
      return null;
    }
  }

  // Get PUE options from `window.__GGT_PUES`
  function getPueOptions() {
    return window.__GGT_PUES || [];
  }

  // Save the selected PUE to local storage
  function savePueSelection(pue) {
    try {
      localStorage.setItem(PUE_STORAGE_KEY, JSON.stringify(pue));
      console.log('[GGT] PUE saved:', pue);
    } catch (e) {
      console.warn('[GGT] Failed to save PUE:', e);
    }
  }

  // Set default PUE (OpenAI) if none is selected
  function setDefaultPue() {
    const selectedPue = JSON.parse(localStorage.getItem(PUE_STORAGE_KEY));
    if (!selectedPue) {
      const options = getPueOptions();
      const defaultPue = options.find((pue) => pue.id === 'openai');
      if (defaultPue) {
        savePueSelection(defaultPue);
        console.log('[GGT] Default PUE set to OpenAI:', defaultPue);
      }
    }
  }

  function renderPueOptions(container) {
    const optionsContainer = container.querySelector('.ggt-pue-options');
    const options = getPueOptions();
    const selectedPue = JSON.parse(localStorage.getItem(PUE_STORAGE_KEY));

    options.forEach((pue) => {
      const button = document.createElement('button');
      button.className = 'ggt-pue-btn';
      button.textContent = pue.name;

      if (pue.default) {
        button.classList.add('ggt-pue-default');
      }

      if (selectedPue && selectedPue.id === pue.id) {
        button.classList.add('active');
      }

      button.addEventListener('mouseenter', () => {
        const tooltip = document.getElementById('ggt-overlay-tooltip');
        if (tooltip) {
          tooltip.textContent = `PUE: ${pue.value} — ${pue.description}`;
          tooltip.style.display = 'block';

          const rect = button.getBoundingClientRect();
          const left = Math.min(
            window.innerWidth - tooltip.offsetWidth - 10,
            rect.left + (rect.width - tooltip.offsetWidth) / 2
          );
          const top = rect.bottom + 8;
          tooltip.style.left = `${left}px`;
          tooltip.style.top = `${top}px`;
          tooltip.setAttribute('aria-hidden', 'false');
        }
      });

      button.addEventListener('mouseleave', () => {
        const tooltip = document.getElementById('ggt-overlay-tooltip');
        if (tooltip) {
          tooltip.style.display = 'none';
          tooltip.setAttribute('aria-hidden', 'true');
        }
      });

      button.addEventListener('click', () => {
        savePueSelection(pue);
        document.querySelectorAll('.ggt-pue-btn').forEach((btn) => {
          btn.classList.remove('active');
        });
        button.classList.add('active');
      });

      optionsContainer.appendChild(button);
    });
  }

  async function insertPuePicker() {
    const MAX_RETRIES = 10; // Number of retries
    const RETRY_DELAY = 200; // Delay between retries (in ms)

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const modelPicker = document.getElementById('ggt-overlay-ui');
      if (modelPicker) {
        console.log('[GGT] Model picker found:', modelPicker);
        const puePicker = await loadPuePickerHtml();
        if (puePicker) {
          renderPueOptions(puePicker);
          modelPicker.insertAdjacentElement('afterend', puePicker);
          console.log('[GGT] PUE picker inserted.');
        }
        return;
      }

      console.warn(`[GGT] Model picker not found. Retrying... (${attempt + 1}/${MAX_RETRIES})`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }

    console.error('[GGT] Model picker not found after maximum retries. PUE picker not inserted.');
  }

  // Initialize the PUE picker
  try {
    setDefaultPue();
    await insertPuePicker();
  } catch (e) {
    console.error('[GGT] Failed to initialize PUE picker:', e);
  }
})();