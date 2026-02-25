window.__GGT_tokenizer = {
  encode: (text, model) => {
    const name = 'GPTTokenizer_' + (model || 'cl100k_base');
    const tok = window[name];
    if (tok && typeof tok.encode === 'function') {
      return tok.encode(String(text || ''));
    }
    return [];
  },
  getModels: () => [
    'o200k_base',
    'cl100k_base',
    'r50k_base',
    'p50k_base',
  ]
};
console.log('[GGT] tokenizer service initialized');