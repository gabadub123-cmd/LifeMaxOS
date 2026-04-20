// Ideas — Constants & Enums

export const STAGES = [
  { key: 'spark',       label: 'SPARK',       icon: '◆' },
  { key: 'researching', label: 'RESEARCHING', icon: '▲' },
  { key: 'mvp',         label: 'MVP',         icon: '●' },
  { key: 'launched',    label: 'LAUNCHED',    icon: '◉' },
  { key: 'scaling',     label: 'SCALING',     icon: '⬆' },
  { key: 'killed',      label: 'KILLED',      icon: '✕' },
];

export const STAGE_KEYS = STAGES.map(s => s.key);

export const CATEGORIES = {
  ai:           { label: 'AI',           color: '#00E5FF' },
  '3d-printing':{ label: '3D Printing',  color: '#B388FF' },
  grappling:    { label: 'Grappling',    color: '#76FF03' },
  videography:  { label: 'Videography',  color: '#FF6D00' },
  trading:      { label: 'Trading',      color: '#FFD600' },
  events:       { label: 'Events',       color: '#E91E63' },
  content:      { label: 'Content',      color: '#FF3D00' },
  other:        { label: 'Other',        color: '#78909C' },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

export const REVENUE_OPTIONS = [
  { key: 'low',     label: '<€500/mo',    icon: '€',    value: 10  },
  { key: 'medium',  label: '€500-3k/mo',  icon: '€€',   value: 30  },
  { key: 'high',    label: '€3-10k/mo',   icon: '€€€',  value: 60  },
  { key: 'massive', label: '€10k+/mo',    icon: '€€€€', value: 100 },
];

export const EFFORT_OPTIONS = [
  { key: 'quick',  label: '<1 week',    multiplier: 1.0  },
  { key: 'medium', label: '1-4 weeks',  multiplier: 0.85 },
  { key: 'heavy',  label: '1-3 months', multiplier: 0.6  },
  { key: 'major',  label: '3m+',        multiplier: 0.35 },
];

export const CAPITAL_OPTIONS = [
  { key: 'none',   label: 'None',      multiplier: 1.0  },
  { key: 'small',  label: '<€500',     multiplier: 0.9  },
  { key: 'medium', label: '€500-3k',   multiplier: 0.7  },
  { key: 'large',  label: '€3k+',      multiplier: 0.45 },
];

export const SCORE_COLORS = {
  green:  '#76FF03',
  yellow: '#FFD600',
  red:    '#FF5252',
};

export const STALE_DAYS = 14;

export const DEFAULT_IDEA = {
  title: '',
  category: 'other',
  stage: 'spark',
  description: '',
  why_it_fits: '',
  first_step: '',
  revenue_potential: 'medium',
  effort: 'medium',
  capital_needed: 'small',
  fits_year_one: true,
  tags: [],
  notes: [],
  analyses: [],
};
