export const LABELS = [
  { value: 'bug', labelKey: 'tasks.label.bug' },
  { value: 'feature', labelKey: 'tasks.label.feature' },
  { value: 'documentation', labelKey: 'tasks.label.documentation' },
];

export const STATUSES = [
  { value: 'backlog', icon: 'circle-help', labelKey: 'tasks.status.backlog' },
  { value: 'todo', icon: 'circle', labelKey: 'tasks.status.todo' },
  { value: 'in-progress', icon: 'timer', labelKey: 'tasks.status.inProgress' },
  { value: 'done', icon: 'circle-check', labelKey: 'tasks.status.done' },
  { value: 'canceled', icon: 'circle-off', labelKey: 'tasks.status.canceled' },
];

export const PRIORITIES = [
  { value: 'low', icon: 'arrow-down', labelKey: 'tasks.priority.low' },
  { value: 'medium', icon: 'arrow-right', labelKey: 'tasks.priority.medium' },
  { value: 'high', icon: 'arrow-up', labelKey: 'tasks.priority.high' },
  { value: 'critical', icon: 'circle-alert', labelKey: 'tasks.priority.critical' },
];

const WORDS = ['implement', 'design', 'review', 'refactor', 'optimize', 'document', 'fix', 'integrate', 'migrate', 'configure', 'validate', 'monitor', 'dashboard', 'checkout', 'payment', 'session', 'webhook', 'notification', 'search', 'pagination', 'sidebar', 'layout', 'theme', 'component', 'table', 'form', 'dialog', 'export', 'import', 'endpoint', 'database', 'schema', 'migration', 'caching', 'logging', 'responsive', 'accessibility', 'dark-mode', 'onboarding', 'billing', 'analytics', 'sync', 'batch', 'upload', 'preview'];
const NOUNS = ['flow', 'page', 'system', 'module', 'service', 'view', 'pipeline', 'workflow', 'API', 'UX', 'UI', 'panel', 'modal', 'card', 'screen'];

function random(seed) {
  let value = seed >>> 0;
  return () => {
    value = Math.imul(1664525, value) + 1013904223;
    return (value >>> 0) / 4294967296;
  };
}

export function seedTasks(count = 100) {
  const next = random(20240817);
  const pick = (items) => items[Math.floor(next() * items.length)];
  return Array.from({ length: count }, (_, index) => ({
    id: `TASK-${String(1000 + index).padStart(4, '0')}`,
    title: `${pick(WORDS).replace(/^./, (letter) => letter.toUpperCase())} ${pick(NOUNS)} #${Math.floor(next() * 99) + 1}`,
    status: pick(STATUSES).value,
    label: pick(LABELS).value,
    priority: pick(PRIORITIES).value,
  }));
}

export function optionByValue(options, value) {
  return options.find((option) => option.value === value) || null;
}