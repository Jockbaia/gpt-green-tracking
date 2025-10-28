import * as GPTToken from 'gpt-tokenizer';

(function () {
  const lib = GPTToken && (GPTToken.default || GPTToken);
  let encodeFn = null;

  if (lib) {
    encodeFn = lib.encode || lib.tokenize || lib.tokenizeSync || lib.encodeSync || lib;
  }

  if (!encodeFn || typeof encodeFn !== 'function') {
    console.warn('[GGT] tokenizer: encode function not found in gpt-tokenizer bundle');
    return;
  }

  window.__GGT_tokenizer = {
    encode(text) {
      try {
        const res = encodeFn(String(text || ''));
        if (Array.isArray(res)) return res;
        if (typeof res === 'number') return new Array(res).fill(0);
        if (res && typeof res.then === 'function') {
          res.then(arr => { window.__GGT_tokenizer._last = Array.isArray(arr) ? arr : []; }).catch(() => {});
          return window.__GGT_tokenizer._last || [];
        }
      } catch (e) {
        console.warn('[GGT] tokenizer.encode error', e);
      }
      return [];
    },
    _last: []
  };

  console.info('[GGT] tokenizer bundle initialized');
})();