/*
 * app/file-preview.js
 * file:// 专用的独立预览入口：浏览器禁止本地 ESM 跨文件加载时，仍能双击 index.html 查看交互。
 * 这是演示层，不连接 API、不写数据库；HTTP 模式继续使用 app/core/bootstrap.js。
 */

(() => {
  const root = document.getElementById('app-root');
  if (!root) return;

  const state = {
    authenticated: false,
    notes: [],
    conversations: [],
    profile: { name: '', email: '' },
    display: { theme: 'system', language: navigator.language?.startsWith('en') ? 'en' : 'zh-CN' },
  };

  const copy = {
    'zh-CN': {
      brand: 'Nova', version: '本地预览', offline: '本地文件预览：数据只保留在当前页面内存中。',
      setup: '开始体验 Nova', setupHint: '输入任意至少 8 位密码进入本地预览。不会连接服务器。',
      password: '预览密码', confirm: '确认密码', enter: '进入预览', weak: '密码至少需要 8 个字符', mismatch: '两次密码不一致',
      dashboard: '仪表盘', notes: '笔记', chat: '对话', settings: '设置', profile: '个人资料', display: '显示', security: '安全', database: '数据库',
      welcome: '欢迎使用 Nova', notesCount: '笔记', chatsCount: '对话', recentNotes: '最近笔记', recentChats: '最近对话',
      noNotes: '还没有笔记', noChats: '还没有对话', createNote: '新建笔记', createChat: '新建对话',
      allNotes: '全部笔记', title: '标题', body: '正文', tags: '标签（用逗号分隔）', save: '保存', delete: '删除',
      noteTitle: '笔记标题', noteBody: '写下你的想法…', noteTags: '工作, 灵感', chatTitle: '对话标题', message: '输入消息…', send: '发送',
      noMessages: '发送第一条消息开始对话', displayTitle: '主题与语言', theme: '主题', system: '系统', light: '浅色', dark: '深色', language: '语言',
      chinese: '简体中文', english: 'English', profileTitle: '个人资料（内存预览）', name: '姓名', email: '邮箱', databaseTitle: '数据库状态',
      driver: '当前驱动', memory: '内存预览', persistence: '持久化', none: '无（关闭页面即清空）', securityTitle: '安全说明',
      securityBody: '本地文件预览不会保存或校验管理密码，也不会访问服务器。需要真实鉴权和数据库时请运行 just dev。',
    },
    en: {
      brand: 'Nova', version: 'Local preview', offline: 'Local file preview: data stays in this page memory.',
      setup: 'Start with Nova', setupHint: 'Enter any password with at least 8 characters. No server connection is made.',
      password: 'Preview password', confirm: 'Confirm password', enter: 'Open preview', weak: 'Password must be at least 8 characters', mismatch: 'Passwords do not match',
      dashboard: 'Dashboard', notes: 'Notes', chat: 'Chat', settings: 'Settings', profile: 'Profile', display: 'Display', security: 'Security', database: 'Database',
      welcome: 'Welcome to Nova', notesCount: 'Notes', chatsCount: 'Conversations', recentNotes: 'Recent notes', recentChats: 'Recent conversations',
      noNotes: 'No notes yet', noChats: 'No conversations yet', createNote: 'New note', createChat: 'New conversation',
      allNotes: 'All notes', title: 'Title', body: 'Body', tags: 'Tags (comma separated)', save: 'Save', delete: 'Delete',
      noteTitle: 'Note title', noteBody: 'Write your thoughts…', noteTags: 'work, ideas', chatTitle: 'Conversation title', message: 'Type a message…', send: 'Send',
      noMessages: 'Send the first message to begin', displayTitle: 'Theme & language', theme: 'Theme', system: 'System', light: 'Light', dark: 'Dark', language: 'Language',
      chinese: '简体中文', english: 'English', profileTitle: 'Profile (memory preview)', name: 'Name', email: 'Email', databaseTitle: 'Database status',
      driver: 'Driver', memory: 'In-memory preview', persistence: 'Persistence', none: 'None (cleared on close)', securityTitle: 'Security note',
      securityBody: 'The local file preview does not store or verify a password and never contacts a server. Run just dev for real auth and database access.',
    },
  };

  const style = document.createElement('style');
  style.textContent = `
    .nova-file-preview { min-height: 100dvh; background: hsl(var(--background)); color: hsl(var(--foreground)); }
    .nova-file-preview button, .nova-file-preview input, .nova-file-preview textarea {
      font: inherit; box-sizing: border-box;
    }
    .nova-file-preview button { border: var(--border-width) solid hsl(var(--border)); border-radius: var(--radius); background: hsl(var(--card));
      color: hsl(var(--foreground)); cursor: pointer; padding: var(--spacing-2) var(--spacing-3); }
    .nova-file-preview button:hover, .nova-file-preview button.active { background: hsl(var(--accent)); border-color: hsl(var(--ring)); }
    .nova-file-preview .primary { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border-color: hsl(var(--primary)); }
    .nova-file-preview input, .nova-file-preview textarea { width: 100%; border: var(--border-width) solid hsl(var(--input)); border-radius: var(--radius);
      background: hsl(var(--background)); color: hsl(var(--foreground)); padding: var(--spacing-2) var(--spacing-3); }
    .nova-file-preview textarea { min-height: calc(var(--spacing-10) + var(--spacing-6)); resize: vertical; }
    .nova-file-preview label { display: grid; gap: var(--spacing-1); font-size: var(--text-sm); }
    .nova-file-preview .auth { min-height: 100dvh; display: grid; place-items: center; padding: var(--spacing-4); }
    .nova-file-preview .auth-card { width: min(100%, var(--dialog-width-md)); display: grid; gap: var(--spacing-4); padding: var(--spacing-6);
      border: var(--border-width) solid hsl(var(--border)); border-radius: var(--radius-lg); background: hsl(var(--card)); box-shadow: var(--shadow-md); }
    .nova-file-preview .auth-card h1, .nova-file-preview .page h1 { margin: 0; font-size: var(--text-xl); }
    .nova-file-preview .muted { color: hsl(var(--muted-foreground)); font-size: var(--text-sm); }
    .nova-file-preview .error { min-height: var(--text-base); color: hsl(var(--destructive)); font-size: var(--text-sm); }
    .nova-file-preview .brand { display: flex; align-items: center; gap: var(--spacing-2); font-weight: 700; }
    .nova-file-preview .brand small { color: hsl(var(--muted-foreground)); font-weight: 400; }
    .nova-file-preview .shell { min-height: 100dvh; display: grid; grid-template-columns: var(--sidebar-width) 1fr; grid-template-rows: auto 1fr; }
    .nova-file-preview aside { grid-row: 1 / -1; border-inline-end: var(--border-width) solid hsl(var(--border)); padding: var(--spacing-3); }
    .nova-file-preview nav { display: grid; gap: var(--spacing-1); margin-top: var(--spacing-4); }
    .nova-file-preview nav a { color: hsl(var(--muted-foreground)); text-decoration: none; border-radius: var(--radius); padding: var(--spacing-2); }
    .nova-file-preview nav a:hover, .nova-file-preview nav a.active { background: hsl(var(--accent)); color: hsl(var(--foreground)); }
    .nova-file-preview header { display: flex; align-items: center; gap: var(--spacing-2); padding: var(--spacing-3) var(--spacing-4); border-bottom: var(--border-width) solid hsl(var(--border)); }
    .nova-file-preview header .spacer { flex: 1; }
    .nova-file-preview main { min-width: 0; padding: var(--spacing-4); }
    .nova-file-preview .page { max-width: var(--content-max-width); margin-inline: auto; display: grid; gap: var(--spacing-4); }
    .nova-file-preview .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: var(--spacing-3); }
    .nova-file-preview .card { display: grid; gap: var(--spacing-2); padding: var(--spacing-3); border: var(--border-width) solid hsl(var(--border));
      border-radius: var(--radius-lg); background: hsl(var(--card)); }
    .nova-file-preview .metric { font-size: var(--text-2xl); font-weight: 700; }
    .nova-file-preview .note, .nova-file-preview .conversation { display: grid; gap: var(--spacing-2); padding: var(--spacing-3);
      border: var(--border-width) solid hsl(var(--border)); border-radius: var(--radius); background: hsl(var(--card)); }
    .nova-file-preview .row { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-2); }
    .nova-file-preview .form { display: grid; gap: var(--spacing-3); }
    .nova-file-preview .actions { display: flex; flex-wrap: wrap; gap: var(--spacing-2); }
    .nova-file-preview .tabs { display: flex; flex-wrap: wrap; gap: var(--spacing-1); }
    .nova-file-preview .empty { display: grid; gap: var(--spacing-2); place-items: start; padding: var(--spacing-4); border: var(--border-width) dashed hsl(var(--border)); border-radius: var(--radius); }
    .nova-file-preview .message { padding: var(--spacing-2) var(--spacing-3); border-radius: var(--radius); background: hsl(var(--muted)); }
    .nova-file-preview .message.user { margin-inline-start: var(--spacing-6); background: hsl(var(--accent)); }
    @media (max-width: 42rem) {
      .nova-file-preview .shell { display: block; }
      .nova-file-preview aside { border-inline-end: 0; border-bottom: var(--border-width) solid hsl(var(--border)); }
      .nova-file-preview nav { display: flex; flex-wrap: wrap; margin-top: var(--spacing-2); }
    }
  `;
  document.head.appendChild(style);

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const currentCopy = () => copy[state.display.language] || copy['zh-CN'];
  const t = (key) => currentCopy()[key] || key;
  const route = () => (decodeURIComponent(location.hash.replace(/^#\/?/, '')) || 'dashboard').replace(/\/+$/, '');
  const applyTheme = () => {
    const mode = state.display.theme;
    const dark = mode === 'dark' || (mode === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  };

  function renderAuth() {
    root.innerHTML = `
      <div class="nova-file-preview auth">
        <form class="auth-card" data-form="auth">
          <div class="brand"><span>${t('brand')}</span><small>${t('version')}</small></div>
          <h1>${t('setup')}</h1>
          <p class="muted">${t('setupHint')}</p>
          <p class="muted">${t('offline')}</p>
          <label>${t('password')}<input name="password" type="password" minlength="8" autocomplete="off" required></label>
          <label>${t('confirm')}<input name="confirm" type="password" minlength="8" autocomplete="off" required></label>
          <p class="error" data-error></p>
          <button class="primary" type="submit">${t('enter')}</button>
        </form>
      </div>`;
    root.querySelector('[data-form="auth"]').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const error = form.querySelector('[data-error]');
      const password = form.elements.namedItem('password').value;
      const confirm = form.elements.namedItem('confirm').value;
      if (password.length < 8) error.textContent = t('weak');
      else if (password !== confirm) error.textContent = t('mismatch');
      else {
        state.authenticated = true;
        location.hash = '#dashboard';
        render();
      }
    });
  }

  function navLink(path, label) {
    return `<a href="#${path}" class="${route() === path ? 'active' : ''}">${esc(label)}</a>`;
  }

  function renderShell() {
    const path = route();
    const activeSection = path.split('/')[0];
    root.innerHTML = `
      <div class="nova-file-preview shell">
        <aside>
          <div class="brand"><span>${t('brand')}</span><small>${t('version')}</small></div>
          <nav>
            ${navLink('dashboard', t('dashboard'))}
            ${navLink('notes/list', t('notes'))}
            ${navLink('chat', t('chat'))}
            ${navLink('settings/profile', t('settings'))}
          </nav>
        </aside>
        <header>
          <span class="muted">${esc(activeSection === 'settings' ? t('settings') : t(activeSection))}</span>
          <span class="spacer"></span>
          <span class="muted">${t('offline')}</span>
        </header>
        <main>${renderPage(path)}</main>
      </div>`;
    bindShell(path);
  }

  function renderPage(path) {
    if (path === 'notes/list' || path === 'notes') return renderNotes();
    if (path === 'chat') return renderChat();
    if (path.startsWith('settings/')) return renderSettings(path.split('/')[1]);
    return renderDashboard();
  }

  function renderDashboard() {
    return `<div class="page">
      <h1>${t('welcome')}</h1>
      <div class="grid">
        <div class="card"><span class="muted">${t('notesCount')}</span><span class="metric">${state.notes.length}</span></div>
        <div class="card"><span class="muted">${t('chatsCount')}</span><span class="metric">${state.conversations.length}</span></div>
      </div>
      <div class="grid">
        <section class="card"><div class="row"><strong>${t('recentNotes')}</strong><a href="#notes/list">${t('notes')}</a></div>
          ${state.notes.length ? state.notes.slice(0, 5).map((note) => `<div>${esc(note.title)}</div>`).join('') : `<div class="empty"><span>${t('noNotes')}</span><a href="#notes/list">${t('createNote')}</a></div>`}
        </section>
        <section class="card"><div class="row"><strong>${t('recentChats')}</strong><a href="#chat">${t('chat')}</a></div>
          ${state.conversations.length ? state.conversations.slice(0, 5).map((item) => `<div>${esc(item.title)}</div>`).join('') : `<div class="empty"><span>${t('noChats')}</span><a href="#chat">${t('createChat')}</a></div>`}
        </section>
      </div>
    </div>`;
  }

  function renderNotes() {
    return `<div class="page">
      <h1>${t('allNotes')}</h1>
      <form class="card form" data-form="note">
        <label>${t('title')}<input name="title" placeholder="${t('noteTitle')}" required></label>
        <label>${t('body')}<textarea name="body" placeholder="${t('noteBody')}"></textarea></label>
        <label>${t('tags')}<input name="tags" placeholder="${t('noteTags')}"></label>
        <div class="actions"><button class="primary" type="submit">${t('save')}</button></div>
      </form>
      <div class="form">
        ${state.notes.length ? state.notes.map((note) => `<article class="note"><div class="row"><strong>${esc(note.title)}</strong><button type="button" data-delete-note="${note.id}">${t('delete')}</button></div><div>${esc(note.body)}</div><small class="muted">${esc(note.tags.join(' · '))}</small></article>`).join('') : `<div class="empty"><strong>${t('noNotes')}</strong><span class="muted">${t('createNote')}</span></div>`}
      </div>
    </div>`;
  }

  function renderChat() {
    const conversation = state.conversations[0];
    return `<div class="page">
      <h1>${t('chat')}</h1>
      <form class="card actions" data-form="chat-create"><input name="title" placeholder="${t('chatTitle')}" required><button class="primary" type="submit">${t('createChat')}</button></form>
      ${conversation ? `<section class="card form"><strong>${esc(conversation.title)}</strong><div class="form">${conversation.messages.length ? conversation.messages.map((message) => `<div class="message ${message.role}">${esc(message.content)}</div>`).join('') : `<div class="empty">${t('noMessages')}</div>`}</div><form class="actions" data-form="message"><input name="content" placeholder="${t('message')}" required><button class="primary" type="submit">${t('send')}</button></form></section>` : `<div class="empty"><strong>${t('noChats')}</strong><span>${t('createChat')}</span></div>`}
    </div>`;
  }

  function renderSettings(section) {
    const tabs = `<div class="tabs">${navLink('settings/profile', t('profile'))}${navLink('settings/display', t('display'))}${navLink('settings/security', t('security'))}${navLink('settings/database', t('database'))}</div>`;
    if (section === 'display') return `<div class="page"><h1>${t('display')}</h1>${tabs}<section class="card form"><strong>${t('displayTitle')}</strong><span class="muted">${t('theme')}</span><div class="actions"><button type="button" data-theme="system" class="${state.display.theme === 'system' ? 'active' : ''}">${t('system')}</button><button type="button" data-theme="light" class="${state.display.theme === 'light' ? 'active' : ''}">${t('light')}</button><button type="button" data-theme="dark" class="${state.display.theme === 'dark' ? 'active' : ''}">${t('dark')}</button></div><span class="muted">${t('language')}</span><div class="actions"><button type="button" data-language="zh-CN" class="${state.display.language === 'zh-CN' ? 'active' : ''}">${t('chinese')}</button><button type="button" data-language="en" class="${state.display.language === 'en' ? 'active' : ''}">${t('english')}</button></div></section></div>`;
    if (section === 'security') return `<div class="page"><h1>${t('security')}</h1>${tabs}<section class="card form"><strong>${t('securityTitle')}</strong><p class="muted">${t('securityBody')}</p></section></div>`;
    if (section === 'database') return `<div class="page"><h1>${t('database')}</h1>${tabs}<section class="card form"><strong>${t('databaseTitle')}</strong><div class="row"><span>${t('driver')}</span><strong>${t('memory')}</strong></div><div class="row"><span>${t('persistence')}</span><strong>${t('none')}</strong></div></section></div>`;
    return `<div class="page"><h1>${t('profile')}</h1>${tabs}<form class="card form" data-form="profile"><strong>${t('profileTitle')}</strong><label>${t('name')}<input name="name" value="${esc(state.profile.name)}"></label><label>${t('email')}<input name="email" type="email" value="${esc(state.profile.email)}"></label><div class="actions"><button class="primary" type="submit">${t('save')}</button></div></form></div>`;
  }

  function bindShell() {
    const noteForm = root.querySelector('[data-form="note"]');
    noteForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      state.notes.unshift({
        id: Date.now(),
        title: form.elements.namedItem('title').value.trim(),
        body: form.elements.namedItem('body').value.trim(),
        tags: form.elements.namedItem('tags').value.split(',').map((tag) => tag.trim()).filter(Boolean),
      });
      render();
    });
    root.querySelectorAll('[data-delete-note]').forEach((button) => button.addEventListener('click', () => {
      state.notes = state.notes.filter((note) => String(note.id) !== button.dataset.deleteNote);
      render();
    }));
    root.querySelector('[data-form="chat-create"]')?.addEventListener('submit', (event) => {
      event.preventDefault();
      state.conversations.unshift({ id: Date.now(), title: event.currentTarget.elements.namedItem('title').value.trim(), messages: [] });
      render();
    });
    root.querySelector('[data-form="message"]')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const content = event.currentTarget.elements.namedItem('content').value.trim();
      if (content && state.conversations[0]) state.conversations[0].messages.push({ role: 'user', content });
      render();
    });
    root.querySelector('[data-form="profile"]')?.addEventListener('submit', (event) => {
      event.preventDefault();
      state.profile = {
        name: event.currentTarget.elements.namedItem('name').value.trim(),
        email: event.currentTarget.elements.namedItem('email').value.trim(),
      };
      render();
    });
    root.querySelectorAll('[data-theme]').forEach((button) => button.addEventListener('click', () => {
      state.display.theme = button.dataset.theme;
      applyTheme();
      render();
    }));
    root.querySelectorAll('[data-language]').forEach((button) => button.addEventListener('click', () => {
      state.display.language = button.dataset.language;
      applyTheme();
      render();
    }));
  }

  function render() {
    applyTheme();
    if (state.authenticated) renderShell();
    else renderAuth();
  }

  window.addEventListener('hashchange', () => {
    if (state.authenticated) renderShell();
  });
  render();
})();
