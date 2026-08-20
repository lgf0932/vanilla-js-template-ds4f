import { createStore } from '../../core/store.js';
import { APP_CATALOG } from './api.js';

const STORAGE_KEY = 'nova:app-integrations';

function readConnected() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

export const store = createStore({
  term: '',
  type: 'all',
  sort: 'asc',
  connected: readConnected(),
});

export function setFilter(patch) {
  store.setState(patch);
}

export function toggleConnection(id) {
  const connected = { ...store.getState().connected, [id]: !store.getState().connected[id] };
  store.setState({ connected });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(connected));
  } catch {
    // 本地存储不可用时仍保持当前页面状态。
  }
}

export function visibleApps(locale, translate) {
  const state = store.getState();
  const term = state.term.trim().toLocaleLowerCase(locale);
  return APP_CATALOG
    .map((app) => ({
      ...app,
      name: translate(`apps.items.${app.id}.name`),
      description: translate(`apps.items.${app.id}.description`),
      isConnected: Boolean(state.connected[app.id]),
    }))
    .filter((app) => {
      if (state.type === 'connected' && !app.isConnected) return false;
      if (state.type === 'notConnected' && app.isConnected) return false;
      return !term || app.name.toLocaleLowerCase(locale).includes(term);
    })
    .sort((a, b) => {
      const result = a.name.localeCompare(b.name, locale);
      return state.sort === 'asc' ? result : -result;
    });
}