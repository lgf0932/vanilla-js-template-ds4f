/** app/core/preferences.js — 壳层偏好、工作空间、配置文件与头像状态。 */
import { isFileRuntime } from './runtime.js';

const STORAGE_KEY = 'nova:template-preferences';
const LANGUAGES = ['zh-CN', 'zh-TW', 'en'];
const SIDEBAR_VARIANTS = ['inset', 'floating', 'sidebar'];
const COLLAPSE_MODES = ['icon', 'offcanvas'];
const AVATAR_TYPES = ['initial', 'icon', 'emoji', 'image'];
const WORKSPACE_ICONS = ['house', 'briefcase', 'book-open', 'heart', 'gamepad', 'plane', 'folder', 'star', 'globe', 'layers', 'sparkles', 'users', 'building', 'shopping-bag', 'graduation-cap', 'coffee', 'trophy', 'rocket'];
const WORKSPACE_COLORS = ['zinc', 'amber', 'blue', 'cyan', 'emerald', 'fuchsia', 'green', 'indigo', 'lime', 'orange', 'pink', 'purple', 'red', 'rose', 'sky', 'teal', 'violet', 'yellow'];
const AVATAR_ICONS = ['user', 'rocket', 'star', 'heart', 'sparkles', 'globe', 'plane', 'coffee', 'trophy', 'key', 'layers', 'gamepad', 'palette', 'sun', 'moon', 'briefcase', 'graduation-cap'];
const AVATAR_EMOJIS = ['😀', '😎', '🤖', '🚀', '🌟', '🎯', '💡', '🎨', '☕', '🐱', '🐶', '🌸', '🍀', '⚡', '🔥', '👑', '🎮', '📚', '🎵', '🏆'];

const DEFAULT_WORKSPACES = [
  ['ws-default', '默认', '預設', 'Default', 'house', 'zinc'],
  ['ws-work', '工作', '工作', 'Work', 'briefcase', 'blue'],
  ['ws-study', '学习', '學習', 'Study', 'book-open', 'violet'],
  ['ws-life', '生活', '生活', 'Life', 'heart', 'rose'],
  ['ws-fun', '娱乐', '娛樂', 'Entertainment', 'gamepad', 'emerald'],
  ['ws-travel', '旅游', '旅遊', 'Travel', 'plane', 'sky'],
].map(([id, zh, tw, en, icon, color]) => ({ id, names: { 'zh-CN': zh, 'zh-TW': tw, en }, icon, color, note: '' }));
const DEFAULT_PROFILE = { username: '', name: '', email: '', bio: '', links: ['', ''], avatar: { type: 'initial', value: '' } };
const DEFAULTS = {
  locale: 'zh-CN', sidebarOpen: true, sidebarVariant: 'inset', sidebarCollapsible: 'icon', sidebarWidth: 240, hiddenNav: [],
  workspaces: DEFAULT_WORKSPACES, activeWorkspace: 'ws-default',
  profile: DEFAULT_PROFILE, account: { name: '', dob: '', language: '' },
  notifications: { type: 'all', communication: false, marketing: false, social: true, security: true, mobile: false },
  appearance: { style: 'nova', baseColor: 'zinc', chartColor: 'zinc', radius: 'default', bodyFont: 'system', headingFont: 'system', menuColor: 'default', menuAppearance: 'solid' },
};

const clone = (value) => value === undefined ? value : structuredClone(value);
const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
};
const writeLocal = (value) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* storage is optional */ } };
const enumValue = (list, value, fallback) => list.includes(value) ? value : fallback;

function applyVisualPreferences(value) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [key, fallback] of [['baseColor', 'zinc'], ['chartColor', 'zinc'], ['radius', 'default'], ['bodyFont', 'system'], ['headingFont', 'system'], ['menuColor', 'default'], ['menuAppearance', 'solid']]) root.dataset[key] = value.appearance?.[key] || fallback;
  root.dataset.sidebarVariant = value.sidebarVariant || 'inset';
  root.dataset.sidebarCollapsible = value.sidebarCollapsible || 'icon';
  if (Number.isFinite(value.sidebarWidth)) root.style.setProperty('--sidebar-width', `${value.sidebarWidth}px`);
  window.dispatchEvent(new CustomEvent('preferences:change', { detail: clone(value) }));
}

function normalizeWorkspace(value = {}) {
  const names = value.names && typeof value.names === 'object' ? value.names : {};
  const zh = String(names['zh-CN'] || value.name || '').trim();
  const en = String(names.en || zh || 'Workspace').trim();
  return {
    id: String(value.id || '').trim(),
    names: { 'zh-CN': zh || en, 'zh-TW': String(names['zh-TW'] || zh || en).trim(), en },
    icon: enumValue(WORKSPACE_ICONS, value.icon, 'house'),
    color: enumValue(WORKSPACE_COLORS, value.color, 'zinc'),
    note: typeof value.note === 'string' ? value.note.slice(0, 200) : '',
  };
}

function normalizeProfile(value = {}) {
  const avatar = value.avatar && typeof value.avatar === 'object' ? value.avatar : {};
  return {
    ...clone(DEFAULT_PROFILE), ...value,
    links: Array.isArray(value.links) ? value.links.filter((item) => typeof item === 'string').slice(0, 4) : ['', ''],
    avatar: { type: enumValue(AVATAR_TYPES, avatar.type, 'initial'), value: typeof avatar.value === 'string' ? avatar.value.slice(0, 400000) : '' },
  };
}

function normalize(value = {}) {
  const raw = value && typeof value === 'object' ? value : {};
  const workspaces = Array.isArray(raw.workspaces) ? raw.workspaces.map(normalizeWorkspace).filter((item) => item.id && item.names.en) : [];
  const safeWorkspaces = workspaces.length ? workspaces : clone(DEFAULT_WORKSPACES);
  const width = Number(raw.sidebarWidth);
  const appearance = { ...clone(DEFAULTS.appearance), ...(raw.appearance && typeof raw.appearance === 'object' ? raw.appearance : {}) };
  return {
    ...clone(DEFAULTS), ...raw,
    locale: enumValue(LANGUAGES, raw.locale, DEFAULTS.locale),
    sidebarOpen: raw.sidebarOpen !== false,
    sidebarVariant: enumValue(SIDEBAR_VARIANTS, raw.sidebarVariant, DEFAULTS.sidebarVariant),
    sidebarCollapsible: enumValue(COLLAPSE_MODES, raw.sidebarCollapsible, DEFAULTS.sidebarCollapsible),
    sidebarWidth: Number.isFinite(width) ? Math.min(480, Math.max(160, Math.round(width))) : DEFAULTS.sidebarWidth,
    hiddenNav: Array.isArray(raw.hiddenNav) ? raw.hiddenNav.filter((item) => typeof item === 'string' && item) : [],
    workspaces: safeWorkspaces,
    activeWorkspace: safeWorkspaces.some((item) => item.id === raw.activeWorkspace) ? raw.activeWorkspace : safeWorkspaces[0].id,
    profile: normalizeProfile(raw.profile),
    account: { ...clone(DEFAULTS.account), ...(raw.account && typeof raw.account === 'object' ? raw.account : {}) },
    notifications: { ...clone(DEFAULTS.notifications), ...(raw.notifications && typeof raw.notifications === 'object' ? raw.notifications : {}) },
    appearance,
  };
}

let state = normalize({ ...clone(DEFAULTS), ...readLocal() });
const listeners = new Set();
applyVisualPreferences(state);

function notify() { for (const listener of listeners) listener(clone(state)); }
function updateState(patch) {
  state = normalize({ ...state, ...(patch || {}) });
  writeLocal(state); applyVisualPreferences(state); notify();
  return clone(state);
}
function slugify(value) { return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-'); }
export const preferences = {
  getState: () => clone(state),
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  update: updateState,
  setWorkspace(id) { return state.workspaces.some((item) => item.id === id) ? updateState({ activeWorkspace: id }) : state; },
  saveWorkspace(value, editingId = '') {
    const workspace = normalizeWorkspace({ ...value, id: editingId || value.id });
    if (!workspace.names['zh-CN'] || !workspace.names.en) return null;
    const list = state.workspaces.slice();
    if (editingId) {
      const index = list.findIndex((item) => item.id === editingId); if (index < 0) return null; list[index] = workspace;
    } else {
      const base = `ws-${slugify(workspace.names.en) || 'workspace'}`; let id = base; let index = 2;
      while (list.some((item) => item.id === id)) id = `${base}-${index++}`;
      workspace.id = id; list.push(workspace);
    }
    updateState({ workspaces: list, ...(editingId ? {} : { activeWorkspace: workspace.id }) });
    return clone(workspace);
  },
  deleteWorkspace(id) {
    if (state.workspaces.length <= 1 || !state.workspaces.some((item) => item.id === id)) return false;
    const workspaces = state.workspaces.filter((item) => item.id !== id);
    updateState({ workspaces, activeWorkspace: state.activeWorkspace === id ? workspaces[0].id : state.activeWorkspace }); return true;
  },
  updateProfile(patch) { return updateState({ profile: { ...state.profile, ...(patch || {}) } }); },
  workspaceName(workspace, locale = state.locale) { return workspace?.names?.[locale] || workspace?.names?.['zh-CN'] || workspace?.names?.en || workspace?.id || ''; },
  constants: { LANGUAGES, WORKSPACE_ICONS, WORKSPACE_COLORS, AVATAR_TYPES, AVATAR_ICONS, AVATAR_EMOJIS },
};

export function getPreferences() { return preferences.getState(); }
export function resetPreferences() { state = normalize(clone(DEFAULTS)); writeLocal(state); applyVisualPreferences(state); notify(); return clone(state); }
