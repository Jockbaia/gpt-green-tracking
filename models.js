// List of available token models with description and path
// This file exposes window.__GGT_MODELS for the picker to consume

window.__GGT_MODELS = [
  {
    id: 'cl100k_base',
    name: 'cl100k_base',
    description: 'Recommended for modern OpenAI models (gpt-4/gpt-3.5-turbo)',
    path: 'assets/models/cl100k_base.js'
  },
  {
    id: 'r50k_base',
    name: 'r50k_base',
    description: 'BPE used by some legacy models, different tokenization from cl100k',
    path: 'assets/models/r50k_base.js'
  },
  {
    id: 'p50k_base',
    name: 'p50k_base',
    description: 'Common tokenizer, useful for compatibility testing',
    path: 'assets/models/p50k_base.js'
  },
  {
    id: 'o200k_base',
    name: 'o200k_base',
    description: 'Extended encoder for non-UTF bytes, large vocab',
    path: 'assets/models/o200k_base.js'
  }
];