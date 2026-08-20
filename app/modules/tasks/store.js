import { createStore } from '../../core/store.js';
import { seedTasks, LABELS, STATUSES, PRIORITIES } from './api.js';

export const store = createStore({
  tasks: seedTasks(),
  search: '',
  status: 'all',
  priority: 'all',
  sort: { key: '', direction: 'asc' },
  page: 1,
  pageSize: 10,
  selection: {},
  visibility: { title: true, status: true, priority: true },
});

export function filteredTasks() {
  const state = store.getState();
  const query = state.search.trim().toLocaleLowerCase();
  const rows = state.tasks.filter((task) => {
    if (query && !`${task.id} ${task.title}`.toLocaleLowerCase().includes(query)) return false;
    if (state.status !== 'all' && task.status !== state.status) return false;
    if (state.priority !== 'all' && task.priority !== state.priority) return false;
    return true;
  });
  if (!state.sort.key) return rows;
  return rows.slice().sort((a, b) => {
    const result = String(a[state.sort.key]).localeCompare(String(b[state.sort.key]));
    return state.sort.direction === 'desc' ? -result : result;
  });
}

export function pageTasks() {
  const state = store.getState();
  const rows = filteredTasks();
  const start = (state.page - 1) * state.pageSize;
  return rows.slice(start, start + state.pageSize);
}

export function pageCount() {
  return Math.max(1, Math.ceil(filteredTasks().length / store.getState().pageSize));
}

export function setFilters(patch) {
  store.setState({ ...patch, page: 1 });
}

export function setSort(key) {
  const state = store.getState();
  store.setState({ sort: { key, direction: state.sort.key === key && state.sort.direction === 'asc' ? 'desc' : 'asc' }, page: 1 });
}

export function setPage(page) {
  store.setState({ page: Math.min(Math.max(1, page), pageCount()) });
}

export function setPageSize(pageSize) {
  store.setState({ pageSize: Number(pageSize) || 10, page: 1 });
}

export function toggleSelection(id, selected) {
  const selection = { ...store.getState().selection };
  if (selected) selection[id] = true;
  else delete selection[id];
  store.setState({ selection });
}

export function togglePageSelection(selected) {
  const selection = { ...store.getState().selection };
  for (const task of pageTasks()) {
    if (selected) selection[task.id] = true;
    else delete selection[task.id];
  }
  store.setState({ selection });
}

export function selectedTasks() {
  const selection = store.getState().selection;
  return store.getState().tasks.filter((task) => selection[task.id]);
}

export function clearSelection() {
  store.setState({ selection: {} });
}

export function saveTask(task, editingId = '') {
  const value = { id: editingId || task.id || `TASK-${Date.now().toString(36).toUpperCase()}`, title: String(task.title || '').trim(), status: task.status, label: task.label, priority: task.priority };
  if (!value.title || !STATUSES.some((option) => option.value === value.status) || !LABELS.some((option) => option.value === value.label) || !PRIORITIES.some((option) => option.value === value.priority)) return false;
  const tasks = store.getState().tasks.slice();
  const index = tasks.findIndex((item) => item.id === editingId);
  if (index >= 0) tasks[index] = value;
  else tasks.unshift(value);
  store.setState({ tasks, page: 1 });
  return true;
}

export function removeTasks(ids) {
  const set = new Set(ids);
  store.setState({ tasks: store.getState().tasks.filter((task) => !set.has(task.id)), selection: {}, page: 1 });
}

export function updateSelected(patch) {
  const ids = new Set(selectedTasks().map((task) => task.id));
  store.setState({ tasks: store.getState().tasks.map((task) => ids.has(task.id) ? { ...task, ...patch } : task) });
}