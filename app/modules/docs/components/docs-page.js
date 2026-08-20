import { define, attachTemplate, qs, escapeHtml } from '../../../components/ui/base.js';
import { i18n, t } from '../../../core/i18n.js';

class DocsPage extends HTMLElement {
  static observedAttributes = ['page'];

  connectedCallback() {
    if (this.shadowRoot) return;
    attachTemplate(this, TEMPLATE);
    this._unsubscribe = i18n.onChange(() => this.render());
    this.render();
  }

  disconnectedCallback() {
    this._unsubscribe?.();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    if (!this.shadowRoot) return;
    const page = this.getAttribute('page') || 'introduction';
    const icon = { introduction: 'book-open', 'get-started': 'rocket', tutorials: 'graduation-cap', changelog: 'scroll-text' }[page] || 'book-open';
    qs(this.shadowRoot, '.hero-icon').setAttribute('name', icon);
    qs(this.shadowRoot, '.title').textContent = t(`docs.${page}.title`);
    qs(this.shadowRoot, '.description').textContent = t(`docs.${page}.desc`);
    qs(this.shadowRoot, '.badge').textContent = t('docs.wip');
    qs(this.shadowRoot, '.content').innerHTML = this._content(page);
  }

  _section(titleKey, bodyKey) {
    return `<section class="section"><h2>${escapeHtml(t(titleKey))}</h2><p>${escapeHtml(t(bodyKey))}</p></section>`;
  }

  _content(page) {
    if (page === 'introduction') {
      return `${this._section('docs.introduction.s1', 'docs.introduction.s1p')}
        <ul><li>${escapeHtml(t('docs.introduction.l1'))}</li><li>${escapeHtml(t('docs.introduction.l2'))}</li><li>${escapeHtml(t('docs.introduction.l3'))}</li><li>${escapeHtml(t('docs.introduction.l4'))}</li></ul>
        ${this._section('docs.introduction.s2', 'docs.introduction.s2p')}
        ${this._section('docs.introduction.s3', 'docs.introduction.s3p')}`;
    }
    if (page === 'get-started') {
      return `${this._section('docs.getStarted.s1', 'docs.getStarted.s1p')}
        <section class="section"><h2>${escapeHtml(t('docs.getStarted.s2'))}</h2><p>${escapeHtml(t('docs.getStarted.s2p'))}</p><ol><li><code>app/modules/&lt;name&gt;/</code></li><li>${escapeHtml(t('docs.getStarted.step2'))}</li><li>${escapeHtml(t('docs.getStarted.step3'))}</li></ol></section>
        ${this._section('docs.getStarted.s3', 'docs.getStarted.s3p')}`;
    }
    if (page === 'tutorials') {
      return `${this._section('docs.tutorials.s1', 'docs.tutorials.s1p')}<pre><code>${escapeHtml(t('docs.tutorials.code1'))}</code></pre>
        ${this._section('docs.tutorials.s2', 'docs.tutorials.s2p')}<pre><code>${escapeHtml(t('docs.tutorials.code2'))}</code></pre>
        ${this._section('docs.tutorials.s3', 'docs.tutorials.s3p')}`;
    }
    return `<section class="section"><h2>${escapeHtml(t('docs.changelog.v1'))}</h2><ul><li>${escapeHtml(t('docs.changelog.l1'))}</li><li>${escapeHtml(t('docs.changelog.l2'))}</li><li>${escapeHtml(t('docs.changelog.l3'))}</li><li>${escapeHtml(t('docs.changelog.l4'))}</li><li>${escapeHtml(t('docs.changelog.l5'))}</li></ul></section>`;
  }
}

const TEMPLATE = `
<style>
  :host { display: block; padding: var(--content-padding); }
  .page { max-width: var(--dialog-width-lg); margin-inline: auto; display: grid; gap: var(--spacing-4); }
  .hero, .content { background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); }
  .hero { display: grid; justify-items: center; gap: var(--spacing-3); padding: var(--spacing-6); text-align: center; }
  .hero-icon { color: hsl(var(--primary)); font-size: var(--text-3xl); }
  .title { font-size: var(--text-2xl); font-weight: 700; }
  .description { max-width: var(--dialog-width-md); color: hsl(var(--muted-foreground)); font-size: var(--text-sm); }
  .badge { display: inline-flex; padding: var(--spacing-1) var(--spacing-2); border-radius: var(--radius-full); background: hsl(var(--secondary)); color: hsl(var(--secondary-foreground)); font-size: var(--text-xs); }
  .content { display: grid; gap: var(--spacing-4); padding: var(--spacing-4); }
  .section { display: grid; gap: var(--spacing-2); }
  h2 { font-size: var(--text-lg); font-weight: 600; }
  p, li { color: hsl(var(--muted-foreground)); font-size: var(--text-sm); line-height: 1.6; }
  ul, ol { display: grid; gap: var(--spacing-1); padding-inline-start: var(--spacing-5); list-style: disc; }
  ol { list-style: decimal; }
  code { font-family: var(--font-mono); color: hsl(var(--foreground)); }
  pre { overflow-x: auto; padding: var(--spacing-3); border-radius: var(--radius); background: hsl(var(--muted)); white-space: pre-wrap; }
</style>
<div class="page"><section class="hero"><ui-icon class="hero-icon" name="book-open" size="xl"></ui-icon><h1 class="title"></h1><p class="description"></p><span class="badge"></span></section><article class="content"></article></div>
`;

define('docs-page', DocsPage);