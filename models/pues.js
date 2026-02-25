window.__GGT_PUES = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Published PUE for large AI-training cluster (multi-datacenter setup)',
    value: 1.223,
    source: 'https://newsletter.semianalysis.com/p/multi-datacenter-training-openais',
    default: true
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Global fleet average for Google Data Centers (2024)',
    value: 1.09,
    source: 'https://datacenters.google/operating-sustainably',
    default: false
  },
  {
    id: 'amazon_aws',
    name: 'Amazon Web Services (AWS)',
    description: 'Reported global average PUE across AWS data centers (2024)',
    value: 1.15,
    source: 'https://sustainability.aboutamazon.com/products-services/aws-cloud',
    default: false
  },
  {
    id: 'microsoft',
    name: 'Microsoft Azure',
    description: 'Average PUE achieved across Microsoft data centers, recent report',
    value: 1.18,
    source: 'https://baxtel.com/news/microsoft-shares-data-center-pue-and-wue-data-for-the-first-time',
    default: false
  },
  {
    id: 'meta',
    name: 'Meta',
    description: 'Typical operational PUE across Meta data centers (2024)',
    value: 1.08,
    source: 'https://sustainability.fb.com/data-centers/',
    default: false
  },
  {
    id: 'oracle',
    name: 'Oracle Cloud',
    description: 'Estimated PUE for modern Oracle Cloud Infrastructure facilities',
    value: 1.29,
    source: 'https://www.oracle.com/corporate/sustainability/energy-efficiency/',
    default: false
  }
];