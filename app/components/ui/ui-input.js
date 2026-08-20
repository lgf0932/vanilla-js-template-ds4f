/**
 * app/components/ui/ui-input.js
 * <ui-input label="..." [multiline] [type] [value] [placeholder] [error] [hint] [disabled] [name]>
 * 替代原生 input/textarea 的视觉封装（Shadow DOM + token 样式）。
 * 事件：input（输入中）/ change（失焦提交），detail = { value }。
 */

import { define, attachTemplate, qs, emit, debounce } from './base.js';

class UiInput extends HTMLElement {
  static observedAttributes = ['label', 'value', 'placeholder', 'error', 'hint', 'disabled', 'type', 'multiline', 'name', 'rows'];

  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this.render();

    const field = this._getField();
    if (!field) return;
    field.addEventListener('input', (e) => {
      emit(this, 'input', { value: field.value });
      this._debouncedEmitChange(field.value);
    });
    field.addEventListener('change', () => emit(this, 'change', { value: field.value }));
  }

  attributeChangedCallback() {
    this.render();
  }

  get value() {
    return this._getField()?.value ?? this.getAttribute('value') ?? '';
  }

  set value(v) {
    this.setAttribute('value', String(v));
  }

  get name() {
    return this.getAttribute('name') || '';
  }

  focus() {
    this._getField()?.focus();
  }

  _getField() {
    return this.shadowRoot?.querySelector('input, textarea');
  }

  _debouncedEmitChange = debounce((value) => emit(this, 'change', { value }), 350);

  render() {
    if (!this.shadowRoot) return;
    const multiline = this.hasAttribute('multiline');
    const type = this.getAttribute('type') || (multiline ? 'text' : 'text');
    const label = this.getAttribute('label') || '';
    const placeholder = this.getAttribute('placeholder') || '';
    const error = this.getAttribute('error') || '';
    const hint = this.getAttribute('hint') || '';
    const disabled = this.hasAttribute('disabled');
    const rows = this.getAttribute('rows') || '4';
    const name = this.getAttribute('name') || '';
    const value = this.getAttribute('value') || '';

    const fieldHTML = multiline
      ? `<textarea name="${name}" rows="${rows}" placeholder="${placeholder}" ${disabled ? 'disabled' : ''}>${value}</textarea>`
      : `<input type="${type}" name="${name}" placeholder="${placeholder}" value="${value}" ${disabled ? 'disabled' : ''} />`;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .field { display: grid; gap: var(--spacing-1); }
        .label { font-size: var(--text-sm); font-weight: 500; color: hsl(var(--foreground)); }
        .label:empty { display: none; }
        input, textarea {
          width: 100%; box-sizing: border-box; font-size: var(--text-sm); line-height: 1.5;
          color: hsl(var(--foreground)); background: hsl(var(--background));
          border: 1px solid hsl(var(--input)); border-radius: var(--radius);
          padding: var(--spacing-2) var(--spacing-3);
          transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
        }
        textarea { resize: vertical; min-height: calc(var(--spacing-10) + var(--spacing-2)); }
        input::placeholder, textarea::placeholder { color: hsl(var(--muted-foreground)); }
        input:focus, textarea:focus {
          outline: none; border-color: hsl(var(--ring)); box-shadow: 0 0 0 2px hsl(var(--ring) / .25);
        }
        input:disabled, textarea:disabled { opacity: .5; cursor: not-allowed; }
        .error, .hint { font-size: var(--text-xs); }
        .error { color: hsl(var(--destructive)); }
        .error:empty, .hint:empty { display: none; }
        .hint { color: hsl(var(--muted-foreground)); }
        .has-error input, .has-error textarea { border-color: hsl(var(--destructive)); }
      </style>
      <div class="field ${error ? 'has-error' : ''}">
        <label class="label" part="label">${label}</label>
        ${fieldHTML}
        <span class="error">${error}</span>
        <span class="hint">${hint}</span>
      </div>
    `;
  }
}

const TEMPLATE = '';

define('ui-input', UiInput);