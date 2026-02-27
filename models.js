// List of available token models with description and path
// This file exposes window.__GGT_MODELS for the picker to consume

window.__GGT_MODELS = [
  {
    id: 'o200k_base',
    name: 'GPT-5.x & O1/3',
    description: '[o200k_base] Current default OpenAI tokenizer, used by GPT-5.x and O1/3 models.',
    path: 'assets/models/o200k_base.js',
    default: true
  },
  {
    id: 'cl100k_base',
    name: 'GPT-4 & GPT-3.5 (legacy)',
    description: '[cl100k_base] An older tokenizer used by GPT-4 and GPT-3.5 models.',
    path: 'assets/models/cl100k_base.js',
    default: false
  },
  {
    id: 'r50k_base',
    name: 'GPT-3 (legacy)',
    description: '[r50k_base] A less efficient tokenizer used by GPT-3 models.',
    path: 'assets/models/r50k_base.js',
    default: false
  },
  /*{
    id: 'p50k_base',
    name: 'p50k_base',
    description: 'Common tokenizer, useful for compatibility testing',
    path: 'assets/models/p50k_base.js',
    default: false
  }*/
];