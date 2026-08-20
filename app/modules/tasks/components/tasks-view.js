import { define, attachTemplate, qs, qsa, escapeHtml } from '../../../components/ui/base.js';
import { confirmDialog, toast } from '../../../components/ui/index.js';
import { i18n, t } from '../../../core/i18n.js';
import { LABELS, STATUSES, PRIORITIES, optionByValue } from '../api.js';
import { store, filteredTasks, pageTasks, pageCount, setFilters, setSort, setPage, setPageSize, toggleSelection, togglePageSelection, selectedTasks, clearSelection, saveTask, removeTasks, updateSelected } from '../store.js';

class TasksView extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this._bindStaticEvents();
    this._unsubscribe = store.subscribe(() => this.render());
    this._unsubscribeI18n = i18n.onChange(() => this.render());
    this.render();
  }

  disconnectedCallback() {
    this._unsubscribe?.();
    this._unsubscribeI18n?.();
  }

  _bindStaticEvents() {
    qs(this.shadowRoot, '.search').addEventListener('input', (event) => setFilters({ search: event.detail.value }));
    qs(this.shadowRoot, '.status').addEventListener('change', (event) => setFilters({ status: event.detail.value }));
    qs(this.shadowRoot, '.priority').addEventListener('change', (event) => setFilters({ priority: event.detail.value }));
    qs(this.shadowRoot, '.page-size').addEventListener('change', (event) => setPageSize(event.detail.value));
    qs(this.shadowRoot, '.reset').addEventListener('click', () => setFilters({ search: '', status: 'all', priority: 'all' }));
    qs(this.shadowRoot, '.create').addEventListener('click', () => this._openEditor());
    qs(this.shadowRoot, '.import').addEventListener('click', () => this._import());
    qs(this.shadowRoot, '.export').addEventListener('click', () => this._export());
    qs(this.shadowRoot, '.bulk-status').addEventListener('change', (event) => updateSelected({ status: event.detail.value }));
    qs(this.shadowRoot, '.bulk-priority').addEventListener('change', (event) => updateSelected({ priority: event.detail.value }));
    qs(this.shadowRoot, '.bulk-export').addEventListener('click', () => this._export());
    qs(this.shadowRoot, '.bulk-delete').addEventListener('click', () => this._bulkDelete());
    qs(this.shadowRoot, '.bulk-clear').addEventListener('click', () => clearSelection());
  }

  render() {
    if (!this.shadowRoot) return;
    const state = store.getState();
    const rows = pageTasks();
    const total = filteredTasks().length;
    const pages = pageCount();
    const selected = selectedTasks();
    qs(this.shadowRoot, '.title').textContent = t('tasks.title');
    qs(this.shadowRoot, '.description').textContent = t('tasks.desc');
    qs(this.shadowRoot, '.search').setAttribute('placeholder', t('tasks.searchPlaceholder'));
    this._setSelectOptions();
    qs(this.shadowRoot, '.search').value = state.search;
    qs(this.shadowRoot, '.status').value = state.status;
    qs(this.shadowRoot, '.priority').value = state.priority;
    qs(this.shadowRoot, '.page-size').value = String(state.pageSize);
    qs(this.shadowRoot, '.bulk-status').value = selected.length && selected.every((task) => task.status === selected[0].status) ? selected[0].status : '';
    qs(this.shadowRoot, '.bulk-priority').value = selected.length && selected.every((task) => task.priority === selected[0].priority) ? selected[0].priority : '';
    qs(this.shadowRoot, '.reset').textContent = t('tasks.reset');
    qs(this.shadowRoot, '.create').textContent = t('tasks.create');
    qs(this.shadowRoot, '.import').textContent = t('tasks.import');
    qs(this.shadowRoot, '.export').textContent = t('tasks.export');
    qs(this.shadowRoot, '.result-count').textContent = t('tasks.resultCount', { count: total });
    this._renderColumnToggles();
    this._renderTable(rows, state);
    this._renderPagination(state, pages, total);
    const bulk = qs(this.shadowRoot, '.bulk');
    bulk.hidden = !selected.length;
    qs(this.shadowRoot, '.selected-count').textContent = t('tasks.selectedCount', { count: selected.length });
  }

  _setSelectOptions() {
    const localize = (options) => options.map((option) => ({ value: option.value, label: t(option.labelKey) }));
    qs(this.shadowRoot, '.status').options = [{ value: 'all', label: t('tasks.filter.statusAll') }, ...localize(STATUSES)];
    qs(this.shadowRoot, '.priority').options = [{ value: 'all', label: t('tasks.filter.priorityAll') }, ...localize(PRIORITIES)];
    qs(this.shadowRoot, '.bulk-status').options = localize(STATUSES);
    qs(this.shadowRoot, '.bulk-priority').options = localize(PRIORITIES);
    qs(this.shadowRoot, '.page-size').options = [10, 20, 30, 40, 50].map((value) => ({ value: String(value), label: String(value) }));
  }

  _renderColumnToggles() {
    const state = store.getState();
    qs(this.shadowRoot, '.columns').innerHTML = ['title', 'status', 'priority'].map((key) => `
      <button type="button" class="column-toggle ${state.visibility[key] ? 'active' : ''}" data-column="${key}">${escapeHtml(t(`tasks.col.${key}`))}</button>`).join('');
    for (const button of qsa(this.shadowRoot, '.column-toggle')) {
      button.addEventListener('click', () => store.setState({ visibility: { ...store.getState().visibility, [button.dataset.column]: !store.getState().visibility[button.dataset.column] } }));
    }
  }

  _renderTable(rows, state) {
    const body = qs(this.shadowRoot, '.table-body');
    const all = rows.length > 0 && rows.every((row) => state.selection[row.id]);
    qs(this.shadowRoot, '.check-all').checked = all;
    qs(this.shadowRoot, '.check-all').indeterminate = !all && rows.some((row) => state.selection[row.id]);
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="6"><ui-empty icon="list-todo" title="${escapeHtml(t('tasks.empty'))}" description="${escapeHtml(t('tasks.emptyHint'))}"><ui-button slot="action" size="sm" class="empty-create">${escapeHtml(t('tasks.create'))}</ui-button></ui-empty></td></tr>`;
      qs(body, '.empty-create')?.addEventListener('click', () => this._openEditor());
      return;
    }
    body.innerHTML = rows.map((row) => {
      const label = optionByValue(LABELS, row.label);
      const status = optionByValue(STATUSES, row.status);
      const priority = optionByValue(PRIORITIES, row.priority);
      return `<tr class="${state.selection[row.id] ? 'selected' : ''}">
        <td class="check-cell"><input class="check" type="checkbox" data-check="${row.id}" ${state.selection[row.id] ? 'checked' : ''} aria-label="${escapeHtml(t('tasks.selectRow'))}"></td>
        <td class="id-cell">${escapeHtml(row.id)}</td>
        ${state.visibility.title ? `<td class="task-title"><ui-badge variant="outline">${escapeHtml(t(label.labelKey))}</ui-badge><span>${escapeHtml(row.title)}</span></td>` : '<td></td>'}
        ${state.visibility.status ? `<td><span class="cell-value"><ui-icon name="${status.icon}" size="sm"></ui-icon>${escapeHtml(t(status.labelKey))}</span></td>` : '<td></td>'}
        ${state.visibility.priority ? `<td><span class="cell-value"><ui-icon name="${priority.icon}" size="sm"></ui-icon>${escapeHtml(t(priority.labelKey))}</span></td>` : '<td></td>'}
        <td class="actions"><button type="button" class="icon-button" data-edit="${row.id}" title="${escapeHtml(t('common.edit'))}"><ui-icon name="edit" size="sm"></ui-icon></button><button type="button" class="icon-button danger" data-delete="${row.id}" title="${escapeHtml(t('common.delete'))}"><ui-icon name="trash" size="sm"></ui-icon></button></td>
      </tr>`;
    }).join('');
    for (const input of qsa(body, '[data-check]')) input.addEventListener('change', () => toggleSelection(input.dataset.check, input.checked));
    for (const button of qsa(body, '[data-edit]')) button.addEventListener('click', () => this._openEditor(state.tasks.find((task) => task.id === button.dataset.edit)));
    for (const button of qsa(body, '[data-delete]')) button.addEventListener('click', () => this._delete([button.dataset.delete]));
  }

  _renderPagination(state, pages, total) {
    qs(this.shadowRoot, '.page-label').textContent = t('tasks.pageOf', { current: state.page, total: pages });
    qs(this.shadowRoot, '.first').disabled = state.page <= 1;
    qs(this.shadowRoot, '.prev').disabled = state.page <= 1;
    qs(this.shadowRoot, '.next').disabled = state.page >= pages;
    qs(this.shadowRoot, '.last').disabled = state.page >= pages;
    qs(this.shadowRoot, '.pages').innerHTML = this._pageNumbers(state.page, pages).map((page) => page === '…' ? '<span>…</span>' : `<button type="button" class="page-button ${page === state.page ? 'active' : ''}" data-page="${page}">${page}</button>`).join('');
    for (const button of qsa(this.shadowRoot, '[data-page]')) button.addEventListener('click', () => setPage(Number(button.dataset.page)));
    qs(this.shadowRoot, '.first').onclick = () => setPage(1);
    qs(this.shadowRoot, '.prev').onclick = () => setPage(state.page - 1);
    qs(this.shadowRoot, '.next').onclick = () => setPage(state.page + 1);
    qs(this.shadowRoot, '.last').onclick = () => setPage(pages);
    qs(this.shadowRoot, '.check-all').onchange = (event) => togglePageSelection(event.target.checked);
    qs(this.shadowRoot, '.sort-title').textContent = `${t('tasks.col.title')}${state.sort.key === 'title' ? state.sort.direction === 'asc' ? ' ↑' : ' ↓' : ''}`;
    qs(this.shadowRoot, '.sort-status').textContent = `${t('tasks.col.status')}${state.sort.key === 'status' ? state.sort.direction === 'asc' ? ' ↑' : ' ↓' : ''}`;
    qs(this.shadowRoot, '.sort-priority').textContent = `${t('tasks.col.priority')}${state.sort.key === 'priority' ? state.sort.direction === 'asc' ? ' ↑' : ' ↓' : ''}`;
    for (const button of qsa(this.shadowRoot, '[data-sort]')) button.onclick = () => setSort(button.dataset.sort);
    qs(this.shadowRoot, '.total-label').textContent = t('tasks.total', { count: total });
  }

  _pageNumbers(current, total) {
    if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
    if (current <= 3) return [1, 2, 3, 4, '…', total];
    if (current >= total - 2) return [1, '…', total - 3, total - 2, total - 1, total];
    return [1, '…', current - 1, current, current + 1, '…', total];
  }

  async _delete(ids) {
    const ok = await confirmDialog({ title: t('tasks.deleteTitle'), message: t('tasks.deleteMessage', { count: ids.length }), confirmText: t('common.delete'), cancelText: t('common.cancel'), variant: 'destructive' });
    if (!ok) return;
    removeTasks(ids);
    toast.success(t('common.operateSuccess'));
  }

  async _bulkDelete() {
    const ids = selectedTasks().map((task) => task.id);
    if (ids.length) await this._delete(ids);
  }

  _openEditor(task = null) {
    const dialog = document.createElement('ui-dialog');
    dialog.setAttribute('title', task ? t('tasks.editTitle') : t('tasks.createTitle'));
    dialog.setAttribute('width', 'md');
    const title = document.createElement('ui-input');
    title.setAttribute('label', t('tasks.field.title'));
    title.setAttribute('placeholder', t('tasks.field.titlePlaceholder'));
    title.value = task?.title || '';
    const status = document.createElement('ui-select');
    status.setAttribute('label', t('tasks.field.status'));
    status.options = STATUSES.map((option) => ({ value: option.value, label: t(option.labelKey) }));
    status.value = task?.status || STATUSES[0].value;
    const label = document.createElement('ui-select');
    label.setAttribute('label', t('tasks.field.label'));
    label.options = LABELS.map((option) => ({ value: option.value, label: t(option.labelKey) }));
    label.value = task?.label || LABELS[0].value;
    const priority = document.createElement('ui-select');
    priority.setAttribute('label', t('tasks.field.priority'));
    priority.options = PRIORITIES.map((option) => ({ value: option.value, label: t(option.labelKey) }));
    priority.value = task?.priority || PRIORITIES[1].value;
    const form = document.createElement('div');
    form.className = 'editor-form';
    form.append(title, status, label, priority);
    dialog.appendChild(form);
    const footer = document.createElement('div');
    footer.slot = 'footer';
    const cancel = document.createElement('ui-button');
    cancel.setAttribute('variant', 'secondary');
    cancel.textContent = t('common.cancel');
    const save = document.createElement('ui-button');
    save.textContent = t('common.save');
    footer.append(cancel, save);
    dialog.appendChild(footer);
    this.shadowRoot.appendChild(dialog);
    const close = () => dialog.remove();
    dialog.addEventListener('close', close, { once: true });
    cancel.addEventListener('click', close);
    save.addEventListener('click', () => {
      const valid = saveTask({ title: title.value, status: status.value, label: label.value, priority: priority.value }, task?.id || '');
      if (!valid) {
        title.setAttribute('error', t('tasks.field.required'));
        return;
      }
      toast.success(t('common.saveSuccess'));
      dialog.close();
    });
    dialog.openDialog();
  }

  _export() {
    const payload = JSON.stringify(filteredTasks(), null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nova-tasks.json';
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t('tasks.exported'));
  }

  _import() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        const rows = Array.isArray(data) ? data : data.tasks;
        if (!Array.isArray(rows)) throw new Error('invalid');
        for (const row of rows.slice(0, 100)) saveTask(row);
        toast.success(t('tasks.imported'));
      } catch {
        toast.error(t('tasks.importFailed'));
      }
    }, { once: true });
    input.click();
  }
}

const TEMPLATE = `
<style>
  :host { display: block; padding: var(--content-padding); }
  .page { max-width: var(--content-max-width); margin-inline: auto; display: grid; gap: var(--spacing-4); }
  .heading { display: flex; align-items: end; justify-content: space-between; gap: var(--spacing-3); flex-wrap: wrap; }
  .title { font-size: var(--text-2xl); font-weight: 700; }
  .description { margin-top: var(--spacing-1); color: hsl(var(--muted-foreground)); font-size: var(--text-sm); }
  .heading-actions, .toolbar, .filters, .columns, .bulk, .pagination, .pager, .actions { display: flex; align-items: center; gap: var(--spacing-2); }
  .heading-actions, .toolbar { flex-wrap: wrap; }
  .toolbar { justify-content: space-between; padding-block: var(--spacing-2); border-block: 1px solid hsl(var(--border)); }
  .filters { flex-wrap: wrap; }
  .search { width: min(18rem, 100%); }
  .status, .priority, .page-size { width: 10rem; }
  .columns { flex-wrap: wrap; margin-inline-start: auto; }
  .column-toggle, .page-button, .icon-button, .bulk button { display: inline-flex; align-items: center; justify-content: center; border: 1px solid hsl(var(--border)); border-radius: var(--radius); background: hsl(var(--background)); color: hsl(var(--foreground)); cursor: pointer; }
  .column-toggle { padding: var(--spacing-1) var(--spacing-2); font-size: var(--text-xs); }
  .column-toggle.active { background: hsl(var(--accent)); color: hsl(var(--accent-foreground)); }
  .table-wrap { overflow-x: auto; border: 1px solid hsl(var(--border)); border-radius: var(--radius-lg); background: hsl(var(--card)); }
  table { width: 100%; min-width: var(--task-table-min-width); border-collapse: collapse; font-size: var(--text-sm); }
  th, td { padding: var(--spacing-2); border-bottom: 1px solid hsl(var(--border)); text-align: start; white-space: nowrap; }
  th { color: hsl(var(--muted-foreground)); font-weight: 500; }
  tbody tr:last-child td { border-bottom: 0; }
  tbody tr.selected { background: hsl(var(--accent) / .55); }
  .check-cell { width: var(--spacing-8); text-align: center; }
  .id-cell { color: hsl(var(--muted-foreground)); font-family: var(--font-mono); font-size: var(--text-xs); }
  .task-title { display: flex; align-items: center; gap: var(--spacing-2); min-width: var(--task-title-min-width); }
  .cell-value { display: inline-flex; align-items: center; gap: var(--spacing-1); color: hsl(var(--muted-foreground)); }
  .check { appearance: none; width: var(--spacing-4); height: var(--spacing-4); margin: 0; border: 1px solid hsl(var(--input)); border-radius: var(--radius-sm); background: hsl(var(--background)); cursor: pointer; }
  .check:checked { background: hsl(var(--primary)); border-color: hsl(var(--primary)); box-shadow: inset 0 0 0 var(--spacing-1) hsl(var(--primary)); }
  .icon-button { width: var(--spacing-8); height: var(--spacing-8); border-color: transparent; background: transparent; color: hsl(var(--muted-foreground)); }
  .icon-button:hover { background: hsl(var(--accent)); color: hsl(var(--foreground)); }
  .icon-button.danger:hover { color: hsl(var(--destructive)); background: hsl(var(--destructive) / .1); }
  .pagination { justify-content: space-between; flex-wrap: wrap; color: hsl(var(--muted-foreground)); font-size: var(--text-xs); }
  .pager { flex-wrap: wrap; }
  .pager button { padding: var(--spacing-1) var(--spacing-2); }
  .pager button:disabled { opacity: .45; cursor: not-allowed; }
  .page-button.active { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
  .bulk { padding: var(--spacing-2) var(--spacing-3); border: 1px solid hsl(var(--border)); border-radius: var(--radius-lg); background: hsl(var(--card)); box-shadow: var(--shadow-md); }
  .bulk[hidden] { display: none; }
  .bulk .selected-count { margin-inline-end: auto; font-size: var(--text-sm); font-weight: 600; }
  .bulk-status, .bulk-priority { width: 9rem; }
  .editor-form { display: grid; gap: var(--spacing-3); }
  @media (min-width: 40rem) { .editor-form { grid-template-columns: repeat(2, minmax(0, 1fr)); } .editor-form ui-input { grid-column: 1 / -1; } }
</style>
<div class="page"><header class="heading"><div><h1 class="title"></h1><p class="description"></p></div><div class="heading-actions"><button type="button" class="import"></button><button type="button" class="export"></button><button type="button" class="create"></button></div></header><div class="toolbar"><div class="filters"><ui-input class="search" type="search"></ui-input><ui-select class="status"></ui-select><ui-select class="priority"></ui-select><button type="button" class="reset"></button><span class="result-count"></span></div><div class="columns"></div></div><div class="table-wrap"><table><thead><tr><th class="check-cell"><input class="check check-all" type="checkbox" aria-label="select all"></th><th>${escapeHtml(t('tasks.col.id'))}</th><th><button type="button" class="sort-title" data-sort="title"></button></th><th><button type="button" class="sort-status" data-sort="status"></button></th><th><button type="button" class="sort-priority" data-sort="priority"></button></th><th></th></tr></thead><tbody class="table-body"></tbody></table></div><div class="bulk" hidden><span class="selected-count"></span><ui-select class="bulk-status"></ui-select><ui-select class="bulk-priority"></ui-select><button type="button" class="bulk-export">${escapeHtml(t('tasks.export'))}</button><button type="button" class="bulk-delete">${escapeHtml(t('common.delete'))}</button><button type="button" class="bulk-clear">${escapeHtml(t('tasks.clearSelection'))}</button></div><div class="pagination"><span class="total-label"></span><span class="page-label"></span><div class="pager"><ui-select class="page-size"></ui-select><button type="button" class="first">«</button><button type="button" class="prev">‹</button><span class="pages"></span><button type="button" class="next">›</button><button type="button" class="last">»</button></div></div></div>
`;

define('tasks-view', TasksView);
