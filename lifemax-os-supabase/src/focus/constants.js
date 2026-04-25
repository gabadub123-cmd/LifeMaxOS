// FOCUS tab — Constants

export const WORK_DURATION  = 90 * 60;  // 90 min in seconds
export const BREAK_DURATION = 20 * 60;  // 20 min in seconds

export const PHASES = {
  idle:  { label: 'READY',  color: '#555' },
  work:  { label: 'WORK',   color: '#FF3D00' },
  break: { label: 'BREAK',  color: '#76FF03' },
};

export const SOURCE_COLORS = {
  'today-targets': '#FF3D00',
  'ideas':         '#00E5FF',
  'schedule':      '#FFD600',
  'stale':         '#FF5252',
  'manual':        '#B388FF',
};

export const SOURCE_LABELS = {
  'today-targets': 'TODAY',
  'ideas':         'IDEAS',
  'schedule':      'SCHEDULE',
  'stale':         'OVERDUE',
  'manual':        'CUSTOM',
};

// Default focus targets per day of week (0 = Sunday)
export const DAY_TEMPLATES = {
  0: {
    label: 'Sunday',
    targets: [
      'Review weekly targets — what hit, what missed',
      'Plan top 3 priorities for the coming week',
      'Journal: wins + lessons + what to kill',
    ],
  },
  1: {
    label: 'Monday',
    targets: [
      '90 min deep work on highest-ROI client deliverable',
      '20+ outreach messages sent',
      'Review pipeline — advance or kill 1 idea',
    ],
  },
  2: {
    label: 'Tuesday',
    targets: [
      '90 min deep work — AI delivery block',
      'Follow up every open proposal',
      '1 piece of content captured and scheduled',
    ],
  },
  3: {
    label: 'Wednesday',
    targets: [
      'Deep work: product or skill sharpening block',
      'Discovery calls / booking push',
      'Training session + mobility',
    ],
  },
  4: {
    label: 'Thursday',
    targets: [
      'Client delivery + admin batch in one go',
      'Content capture session',
      'Outreach push — fill the calendar',
    ],
  },
  5: {
    label: 'Friday',
    targets: [
      'Week review: did you hit your numbers?',
      'Batch admin + invoicing',
      'Learn 1 new AI tool or technique for 45 min',
    ],
  },
  6: {
    label: 'Saturday',
    targets: [
      'Content creation block — film or write',
      'Pipeline: kill or advance 1 stale idea',
      'Recovery: mobility, rest, family time',
    ],
  },
};
