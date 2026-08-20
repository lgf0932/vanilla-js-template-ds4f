/**
 * app/components/ui/base.js
 * Nova 基础组件共用工具：自定义元素注册、Shadow DOM 挂载、HTML 转义。
 */

/** 注册自定义元素（幂等，避免重复定义报错） */
export function define(tag, Klass) {
  if (!customElements.get(tag)) customElements.define(tag, Klass);
}

/** 创建/复用 host 的 shadow root 并注入模板 HTML */
export function attachTemplate(host, html) {
  if (host.shadowRoot) return host.shadowRoot;
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = html;
  return root;
}

/** HTML 转义（渲染用户输入时必须使用） */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

/** shadow root/元素内查询单个节点 */
export const qs = (root, sel) => root.querySelector(sel);
export const qsa = (root, sel) => [...root.querySelectorAll(sel)];

/** 防抖 */
export function debounce(fn, ms = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** 派发自定义事件（bubbles + composed，可穿透 shadow 边界） */
export function emit(host, type, detail) {
  host.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}