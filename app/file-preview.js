/*
 * app/file-preview.js
 * 直接双击 index.html 时使用的完整本地预览入口。
 *
 * 浏览器对 file:// 下的跨文件 ESM 有 CORS 限制，因此这里使用一个零依赖
 * 的经典脚本入口；它复刻正式模块的功能面，只把后端 API 换成浏览器 IndexedDB，
 * 并且不创建或发送 X-Auth-Password 鉴权令牌。
 */

(() => {
  const root = document.getElementById('app-root');
  if (!root) return;

  const DURATIONS = [
    ['4h', '4 小时', '4 hours', '4 小時'],
    ['8h', '8 小时', '8 hours', '8 小時'],
    ['12h', '12 小时', '12 hours', '12 小時'],
    ['24h', '24 小时', '24 hours', '24 小時'],
    ['7d', '7 天', '7 days', '7 天'],
    ['14d', '14 天', '14 days', '14 天'],
    ['30d', '30 天', '30 days', '30 天'],
    ['90d', '90 天', '90 days', '90 天'],
    ['session', '直到下次浏览器打开', 'Until browser close', '直到下次瀏覽器開啟'],
  ];
  const PROFILE_FIELDS = ['username', 'name', 'gender', 'age', 'email', 'phone', 'address'];

  const copy = {
    'zh-CN': {
      brand: 'Nova', version: 'v0.1', localMode: '本地预览 · 无鉴权', admin: '管理员',
      dashboard: '仪表盘', notes: '笔记', chat: '对话', settings: '设置', profile: '个人资料', display: '显示', security: '安全', database: '数据库',
      greeting: '欢迎使用 Nova', notesTotal: '笔记总数', chatsTotal: '对话总数', recentNotes: '最近笔记', recentChats: '最近对话',
      noNotes: '还没有笔记', noNotesHint: '创建第一条笔记开始整理内容', noChats: '还没有对话', noChatsHint: '创建一个对话开始记录',
      newNote: '新建笔记', newChat: '新建对话', allNotes: '全部笔记', tags: '标签',
      searchNotes: '搜索标题或正文…', allTags: '全部标签', loadMore: '加载更多',
      title: '标题', body: '正文', noteTitle: '给笔记一个标题', noteBody: '开始书写…', tagName: '标签名称',
      save: '保存', cancel: '取消', confirm: '确认', close: '关闭', create: '新建', edit: '编辑', delete: '删除',
      emptyTags: '还没有标签', emptyTagsHint: '创建标签后即可在笔记中选用', createTag: '新建标签', tagCount: '{count} 篇笔记',
      newNoteTitle: '新建笔记', editNoteTitle: '编辑笔记', noTags: '暂无标签，可在标签页创建',
      newChatTitle: '新建对话', chatTitle: '对话标题', chatPlaceholder: '给这次对话起个标题…',
      emptyChats: '还没有对话', emptyChatsHint: '点击按钮创建第一个对话', emptyThread: '这条对话还是空的', emptyThreadHint: '在下方输入框开始记录',
      composer: '输入消息，Enter 发送，Shift+Enter 换行…', send: '发送', role: '角色', roleUser: '用户', roleAssistant: '助手', rename: '重命名',
      deleteChatConfirm: '删除对话会一并删除其中的所有消息，确定删除吗？', deleteTagConfirm: '删除标签会解除它与所有笔记的关联，确定删除吗？',
      profileTitle: '用户资料', profileDesc: '本地预览将资料保存在当前浏览器的 IndexedDB 中。',
      username: '用户名', name: '姓名', gender: '性别', genderMale: '男', genderFemale: '女', genderOther: '其他', age: '年龄', email: '邮箱', phone: '电话', address: '地址',
      displayTitle: '显示与语言', theme: '主题模式', system: '跟随系统', light: '浅色', dark: '深色', language: '界面语言', simplified: '简体中文', traditional: '繁體中文', english: 'English',
      securityTitle: '修改管理密码', currentPassword: '当前密码', newPassword: '新密码', confirmPassword: '确认新密码', changePassword: '修改密码',
      sessionTitle: '默认会话时长', sessionDesc: '本地模式不做服务端会话校验，但保留与正式设置页一致的选项。',
      databaseTitle: '数据库状态', driver: '当前驱动', migrations: '迁移版本', encryption: '字段加密', tableNotes: '笔记', tableTags: '标签', tableChats: '对话', tableMessages: '消息',
      memory: 'offline-preview', indexedDb: 'IndexedDB', persistent: '当前浏览器 IndexedDB', enabled: '已启用', disabled: '未启用', persistence: '数据范围', memoryOnly: '当前页面内存（浏览器未提供 IndexedDB）',
      saved: '保存成功', deleted: '删除成功', created: '创建成功', updated: '更新成功', required: '标题不能为空', invalidEmail: '邮箱格式不正确',
      error: '操作失败，请重试', confirmDelete: '确认删除', noContent: '暂无内容', localNotice: '本地模式只绕过服务端鉴权，其余模块操作保持可用；数据保存到当前浏览器 IndexedDB。',
    },
    en: {
      brand: 'Nova', version: 'v0.1', localMode: 'Local preview · Auth bypassed', admin: 'Administrator',
      dashboard: 'Dashboard', notes: 'Notes', chat: 'Chat', settings: 'Settings', profile: 'Profile', display: 'Display', security: 'Security', database: 'Database',
      greeting: 'Welcome to Nova', notesTotal: 'Total notes', chatsTotal: 'Conversations', recentNotes: 'Recent notes', recentChats: 'Recent conversations',
      noNotes: 'No notes yet', noNotesHint: 'Create your first note to get organized', noChats: 'No conversations yet', noChatsHint: 'Create a conversation to start recording',
      newNote: 'New note', newChat: 'New conversation', allNotes: 'All notes', tags: 'Tags',
      searchNotes: 'Search title or body…', allTags: 'All tags', loadMore: 'Load more',
      title: 'Title', body: 'Body', noteTitle: 'Give the note a title', noteBody: 'Start writing…', tagName: 'Tag name',
      save: 'Save', cancel: 'Cancel', confirm: 'Confirm', close: 'Close', create: 'Create', edit: 'Edit', delete: 'Delete',
      emptyTags: 'No tags yet', emptyTagsHint: 'Create tags to use them in notes', createTag: 'Create tag', tagCount: '{count} notes',
      newNoteTitle: 'New note', editNoteTitle: 'Edit note', noTags: 'No tags yet — create some in the tags view',
      newChatTitle: 'New conversation', chatTitle: 'Conversation title', chatPlaceholder: 'Name this conversation…',
      emptyChats: 'No conversations yet', emptyChatsHint: 'Create the first conversation above', emptyThread: 'This conversation is empty', emptyThreadHint: 'Start typing in the composer below',
      composer: 'Type a message — Enter to send, Shift+Enter for a new line…', send: 'Send', role: 'Role', roleUser: 'User', roleAssistant: 'Assistant', rename: 'Rename',
      deleteChatConfirm: 'Deleting a conversation removes all its messages. Delete anyway?', deleteTagConfirm: 'Deleting a tag unlinks it from all notes. Delete anyway?',
      profileTitle: 'Profile', profileDesc: 'The local preview stores profile data in this browser IndexedDB.',
      username: 'Username', name: 'Full name', gender: 'Gender', genderMale: 'Male', genderFemale: 'Female', genderOther: 'Other', age: 'Age', email: 'Email', phone: 'Phone', address: 'Address',
      displayTitle: 'Display & language', theme: 'Theme', system: 'System', light: 'Light', dark: 'Dark', language: 'Language', simplified: '简体中文', traditional: '繁體中文', english: 'English',
      securityTitle: 'Change admin password', currentPassword: 'Current password', newPassword: 'New password', confirmPassword: 'Confirm new password', changePassword: 'Change password',
      sessionTitle: 'Default session duration', sessionDesc: 'Local mode skips server session checks but keeps the same settings as the full app.',
      databaseTitle: 'Database status', driver: 'Active driver', migrations: 'Migration version', encryption: 'Field encryption', tableNotes: 'Notes', tableTags: 'Tags', tableChats: 'Conversations', tableMessages: 'Messages',
      memory: 'offline-preview', indexedDb: 'IndexedDB', persistent: 'This browser IndexedDB', enabled: 'Enabled', disabled: 'Disabled', persistence: 'Data scope', memoryOnly: 'Current page memory (IndexedDB unavailable)',
      saved: 'Saved', deleted: 'Deleted', created: 'Created', updated: 'Updated', required: 'Title is required', invalidEmail: 'Invalid email address',
      error: 'Operation failed, please try again', confirmDelete: 'Confirm delete', noContent: 'Nothing here yet', localNotice: 'Local mode only bypasses server auth; all module operations remain available. Data is saved in this browser IndexedDB.',
    },
    'zh-TW': {
      brand: 'Nova', version: 'v0.1', localMode: '本機預覽 · 略過鑑權', admin: '管理員',
      dashboard: '儀錶板', notes: '筆記', chat: '對話', settings: '設定', profile: '個人資料', display: '顯示', security: '安全', database: '資料庫',
      greeting: '歡迎使用 Nova', notesTotal: '筆記總數', chatsTotal: '對話總數', recentNotes: '最近筆記', recentChats: '最近對話',
      noNotes: '還沒有筆記', noNotesHint: '建立第一則筆記開始整理內容', noChats: '還沒有對話', noChatsHint: '建立對話開始記錄',
      newNote: '新增筆記', newChat: '新增對話', allNotes: '全部筆記', tags: '標籤',
      searchNotes: '搜尋標題或內文…', allTags: '全部標籤', loadMore: '載入更多',
      title: '標題', body: '內文', noteTitle: '幫筆記取個標題', noteBody: '開始書寫…', tagName: '標籤名稱',
      save: '儲存', cancel: '取消', confirm: '確認', close: '關閉', create: '新增', edit: '編輯', delete: '刪除',
      emptyTags: '還沒有標籤', emptyTagsHint: '建立標籤後即可在筆記中選用', createTag: '新增標籤', tagCount: '{count} 篇筆記',
      newNoteTitle: '新增筆記', editNoteTitle: '編輯筆記', noTags: '暫無標籤，可至標籤頁建立',
      newChatTitle: '新增對話', chatTitle: '對話標題', chatPlaceholder: '幫這次對話取個標題…',
      emptyChats: '還沒有對話', emptyChatsHint: '點擊按鈕建立第一個對話', emptyThread: '這則對話還是空的', emptyThreadHint: '在下方輸入框開始記錄',
      composer: '輸入訊息，Enter 傳送，Shift+Enter 換行…', send: '傳送', role: '角色', roleUser: '使用者', roleAssistant: '助手', rename: '重新命名',
      deleteChatConfirm: '刪除對話將一併刪除其中的所有訊息，確定刪除嗎？', deleteTagConfirm: '刪除標籤會解除它與所有筆記的關聯，確定刪除嗎？',
      profileTitle: '使用者資料', profileDesc: '本機預覽會將資料保存在目前瀏覽器的 IndexedDB 中。',
      username: '使用者名稱', name: '姓名', gender: '性別', genderMale: '男', genderFemale: '女', genderOther: '其他', age: '年齡', email: '信箱', phone: '電話', address: '地址',
      displayTitle: '顯示與語言', theme: '主題模式', system: '跟隨系統', light: '淺色', dark: '深色', language: '介面語言', simplified: '简体中文', traditional: '繁體中文', english: 'English',
      securityTitle: '修改管理密碼', currentPassword: '目前密碼', newPassword: '新密碼', confirmPassword: '確認新密碼', changePassword: '修改密碼',
      sessionTitle: '預設工作階段時長', sessionDesc: '本機模式不進行伺服器工作階段驗證，但保留與正式設定頁一致的選項。',
      databaseTitle: '資料庫狀態', driver: '目前驅動', migrations: '遷移版本', encryption: '欄位加密', tableNotes: '筆記', tableTags: '標籤', tableChats: '對話', tableMessages: '訊息',
      memory: 'offline-preview', indexedDb: 'IndexedDB', persistent: '目前瀏覽器 IndexedDB', enabled: '已啟用', disabled: '未啟用', persistence: '資料範圍', memoryOnly: '目前頁面記憶體（瀏覽器未提供 IndexedDB）',
      saved: '儲存成功', deleted: '刪除成功', created: '建立成功', updated: '更新成功', required: '標題不能為空', invalidEmail: '信箱格式不正確',
      error: '操作失敗，請重試', confirmDelete: '確認刪除', noContent: '暫無內容', localNotice: '本機模式只略過伺服器鑑權，其餘模組操作維持可用；資料會保存到目前瀏覽器 IndexedDB。',
    },
  };

  const state = {
    language: readStorage('nova:local-language') || detectLanguage(),
    theme: readStorage('nova:local-theme') || 'system',
    notes: [],
    tags: [],
    conversations: [],
    messages: new Map(),
    profile: Object.fromEntries(PROFILE_FIELDS.map((field) => [field, ''])),
    sessionDuration: '8h',
    storage: 'memory',
    activeConversationId: null,
    noteSearch: '',
    noteTag: '',
    noteVisible: 20,
    previewPassword: '',
  };

  const PREVIEW_DB_NAME = 'nova-offline-preview';
  const PREVIEW_DB_VERSION = 2;
  const PREVIEW_STORE_NAME = 'state';
  const PREVIEW_META_STORE_NAME = 'meta';
  const PREVIEW_SNAPSHOT_KEY = 'current';
  const PREVIEW_PROFILE_KEY = 'profile-key';
  let previewDatabasePromise = null;
  let previewPersistenceReady = false;
  let previewSaveQueue = Promise.resolve();

  function openPreviewDatabase() {
    if (!globalThis.indexedDB || typeof globalThis.indexedDB.open !== 'function') return Promise.resolve(null);
    if (previewDatabasePromise) return previewDatabasePromise;
    try {
      previewDatabasePromise = new Promise((resolve, reject) => {
        const request = globalThis.indexedDB.open(PREVIEW_DB_NAME, PREVIEW_DB_VERSION);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(PREVIEW_STORE_NAME)) request.result.createObjectStore(PREVIEW_STORE_NAME);
          if (!request.result.objectStoreNames.contains(PREVIEW_META_STORE_NAME)) request.result.createObjectStore(PREVIEW_META_STORE_NAME);
        };
        request.onsuccess = () => {
          const database = request.result;
          database.onversionchange = () => database.close();
          resolve(database);
        };
        request.onerror = () => reject(request.error || new Error('indexeddb.open.failed'));
        request.onblocked = () => reject(new Error('indexeddb.open.blocked'));
      }).catch(() => {
        previewDatabasePromise = null;
        return null;
      });
    } catch {
      previewDatabasePromise = Promise.resolve(null);
    }
    return previewDatabasePromise;
  }

  function readPreviewSnapshot(database) {
    return new Promise((resolve, reject) => {
      let value;
      const transaction = database.transaction(PREVIEW_STORE_NAME, 'readonly');
      const request = transaction.objectStore(PREVIEW_STORE_NAME).get(PREVIEW_SNAPSHOT_KEY);
      request.onsuccess = () => { value = request.result; };
      transaction.oncomplete = () => resolve(value || null);
      transaction.onerror = () => reject(transaction.error || new Error('indexeddb.read.failed'));
      transaction.onabort = () => reject(transaction.error || new Error('indexeddb.read.aborted'));
    });
  }

  function writePreviewSnapshot(database, snapshot) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(PREVIEW_STORE_NAME, 'readwrite');
      transaction.objectStore(PREVIEW_STORE_NAME).put(snapshot, PREVIEW_SNAPSHOT_KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('indexeddb.write.failed'));
      transaction.onabort = () => reject(transaction.error || new Error('indexeddb.write.aborted'));
    });
  }

  function readPreviewMeta(database, key) {
    return new Promise((resolve, reject) => {
      let value;
      const transaction = database.transaction(PREVIEW_META_STORE_NAME, 'readonly');
      const request = transaction.objectStore(PREVIEW_META_STORE_NAME).get(key);
      request.onsuccess = () => { value = request.result; };
      transaction.oncomplete = () => resolve(value);
      transaction.onerror = () => reject(transaction.error || new Error('indexeddb.meta.read.failed'));
      transaction.onabort = () => reject(transaction.error || new Error('indexeddb.meta.read.aborted'));
    });
  }

  function writePreviewMeta(database, key, value) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(PREVIEW_META_STORE_NAME, 'readwrite');
      transaction.objectStore(PREVIEW_META_STORE_NAME).put(value, key);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('indexeddb.meta.write.failed'));
      transaction.onabort = () => reject(transaction.error || new Error('indexeddb.meta.write.aborted'));
    });
  }

  function hasPreviewCrypto() {
    return Boolean(globalThis.crypto?.subtle && globalThis.crypto?.getRandomValues);
  }

  async function getPreviewProfileKey(database) {
    if (!hasPreviewCrypto()) return null;
    try {
      const existing = await readPreviewMeta(database, PREVIEW_PROFILE_KEY);
      if (existing) return existing;
      const key = await globalThis.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );
      await writePreviewMeta(database, PREVIEW_PROFILE_KEY, key);
      return key;
    } catch {
      return null;
    }
  }

  async function encryptPreviewProfile(database, profile) {
    if (!Object.values(profile).some(Boolean)) return null;
    const key = await getPreviewProfileKey(database);
    if (!key) return null;
    try {
      const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(JSON.stringify(profile));
      const ciphertext = await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
      return { iv: [...iv], ciphertext: [...new Uint8Array(ciphertext)] };
    } catch {
      return null;
    }
  }

  async function decryptPreviewProfile(database, payload) {
    if (!payload || !Array.isArray(payload.iv) || !Array.isArray(payload.ciphertext)) return null;
    const key = await getPreviewProfileKey(database);
    if (!key) return null;
    try {
      const plaintext = await globalThis.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(payload.iv) },
        key,
        new Uint8Array(payload.ciphertext),
      );
      return JSON.parse(new TextDecoder().decode(plaintext));
    } catch {
      return null;
    }
  }

  async function serializePreviewState(database) {
    const profileCiphertext = await encryptPreviewProfile(database, state.profile);
    return {
      notes: state.notes,
      tags: state.tags,
      conversations: state.conversations,
      messages: [...state.messages.entries()],
      ...(profileCiphertext ? { profileCiphertext } : {}),
      display: { theme: state.theme, language: state.language },
      sessionDuration: state.sessionDuration,
      activeConversationId: state.activeConversationId,
    };
  }

  async function applyPreviewSnapshot(snapshot, database) {
    if (Array.isArray(snapshot.notes)) state.notes = snapshot.notes;
    if (Array.isArray(snapshot.tags)) state.tags = snapshot.tags;
    if (Array.isArray(snapshot.conversations)) state.conversations = snapshot.conversations;
    if (Array.isArray(snapshot.messages)) {
      state.messages = new Map(snapshot.messages.map(([id, items]) => [Number(id), Array.isArray(items) ? items : []]));
    }
    const decryptedProfile = await decryptPreviewProfile(database, snapshot.profileCiphertext);
    if (decryptedProfile || (snapshot.profile && typeof snapshot.profile === 'object')) {
      state.profile = { ...state.profile, ...(decryptedProfile || snapshot.profile) };
    }
    if (snapshot.display && typeof snapshot.display === 'object') {
      if (['system', 'light', 'dark'].includes(snapshot.display.theme)) state.theme = snapshot.display.theme;
      if (['zh-CN', 'zh-TW', 'en'].includes(snapshot.display.language)) state.language = snapshot.display.language;
    }
    if (snapshot.sessionDuration) state.sessionDuration = snapshot.sessionDuration;
    if (snapshot.activeConversationId !== undefined) state.activeConversationId = snapshot.activeConversationId;
  }

  async function hydratePreviewState() {
    const database = await openPreviewDatabase();
    if (!database) {
      state.storage = 'memory';
      return;
    }
    try {
      const snapshot = await readPreviewSnapshot(database);
      if (snapshot) await applyPreviewSnapshot(snapshot, database);
      state.storage = 'indexeddb';
    } catch {
      state.storage = 'memory';
    }
  }

  function persistPreviewState() {
    if (!previewPersistenceReady || state.storage !== 'indexeddb') return;
    const task = previewSaveQueue.then(async () => {
      const database = await openPreviewDatabase();
      if (!database) throw new Error('indexeddb.unavailable');
      await writePreviewSnapshot(database, await serializePreviewState(database));
    }).catch(() => {
      state.storage = 'memory';
    });
    previewSaveQueue = task;
  }

  async function startPreview() {
    try {
      await hydratePreviewState();
    } catch {
      state.storage = 'memory';
    } finally {
      previewPersistenceReady = true;
      render();
    }
  }

  // 等待首次 IndexedDB hydration，避免空快照覆盖已有本地数据。
  void startPreview();

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // file:// 存储可能被浏览器禁用，当前页面仍可继续工作。
    }
  }

  function detectLanguage() {
    const language = (navigator.language || 'zh-CN').toLowerCase();
    if (language.includes('tw') || language.includes('hant')) return 'zh-TW';
    if (language.startsWith('zh')) return 'zh-CN';
    return 'en';
  }

  function t(key, params = {}) {
    const value = copy[state.language]?.[key] || copy['zh-CN'][key] || key;
    return String(value).replace(/\{(\w+)\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
    );
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);
  }

  function icon(name) {
    const icons = {
      dashboard: '▦', note: '▤', chat: '◌', settings: '⚙', user: '●', monitor: '▣', shield: '◆', database: '▥',
      tag: '#', plus: '+', edit: '✎', trash: '×', search: '⌕', calendar: '◷', send: '➤', menu: '☰', sun: '☼', moon: '☾',
      chevron: '›', close: '×', check: '✓', sparkles: '✦', key: '◇', inbox: '□', refresh: '↻',
    };
    return `<span class="icon" aria-hidden="true">${icons[name] || icons.sparkles}</span>`;
  }

  function applyTheme() {
    const dark = state.theme === 'dark'
      || (state.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(state.language === 'en' ? 'en-US' : state.language).format(Number(value) || 0);
  }

  function relativeTime(iso) {
    if (!iso) return '';
    const diff = new Date(iso).getTime() - Date.now();
    if (!Number.isFinite(diff)) return '';
    const minutes = Math.round(diff / 60_000);
    const hours = Math.round(diff / 3_600_000);
    const days = Math.round(diff / 86_400_000);
    const locale = state.language === 'en' ? 'en' : state.language;
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (Math.abs(diff) < 3_600_000) return rtf.format(minutes, 'minute');
    if (Math.abs(diff) < 86_400_000) return rtf.format(hours, 'hour');
    if (Math.abs(diff) < 30 * 86_400_000) return rtf.format(days, 'day');
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(iso));
  }

  function currentPath() {
    return decodeURIComponent(location.hash.replace(/^#\/?/, '')).replace(/\/+$/, '') || 'dashboard';
  }

  function nav(path) {
    location.hash = `#${path}`;
  }

  function noteWithTags(note) {
    return { ...note, tags: state.tags.filter((tag) => note.tagIds.includes(tag.id)) };
  }

  function filteredNotes() {
    const search = state.noteSearch.trim().toLowerCase();
    return state.notes
      .filter((note) => !state.noteTag || note.tagIds.includes(Number(state.noteTag)))
      .filter((note) => !search || `${note.title} ${note.body}`.toLowerCase().includes(search))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  function createNote(data) {
    const title = String(data.title || '').trim();
    if (!title) throw new Error('required');
    const now = new Date().toISOString();
    const note = { id: Date.now() + state.notes.length, title, body: String(data.body || ''), tagIds: [...new Set((data.tagIds || []).map(Number))], createdAt: now, updatedAt: now };
    state.notes.unshift(note);
    return note;
  }

  function updateNote(id, data) {
    const note = state.notes.find((item) => item.id === Number(id));
    if (!note) throw new Error('not-found');
    if (!String(data.title || '').trim()) throw new Error('required');
    note.title = String(data.title).trim();
    note.body = String(data.body || '');
    note.tagIds = [...new Set((data.tagIds || []).map(Number))];
    note.updatedAt = new Date().toISOString();
    return note;
  }

  function createTag(name) {
    const clean = String(name || '').trim();
    if (!clean) return null;
    const existing = state.tags.find((tag) => tag.name === clean);
    if (existing) return existing;
    const tag = { id: Date.now() + state.tags.length, name: clean, createdAt: new Date().toISOString() };
    state.tags.push(tag);
    return tag;
  }

  function createConversation(title) {
    const clean = String(title || '').trim();
    if (!clean) return null;
    const now = new Date().toISOString();
    const conversation = { id: Date.now() + state.conversations.length, title: clean, createdAt: now, updatedAt: now };
    state.conversations.unshift(conversation);
    state.messages.set(conversation.id, []);
    state.activeConversationId = conversation.id;
    return conversation;
  }

  function conversationMessages(id) {
    return state.messages.get(Number(id)) || [];
  }

  function notify(message, type = 'success') {
    let stack = document.querySelector('.nova-preview-toasts');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'nova-preview-toasts';
      document.body.appendChild(stack);
    }
    const item = document.createElement('div');
    item.className = `preview-toast ${type}`;
    item.setAttribute('role', type === 'error' ? 'alert' : 'status');
    item.innerHTML = `${icon(type === 'error' ? 'close' : 'check')}<span>${esc(message)}</span><button type="button" data-toast-close aria-label="${esc(t('close'))}">${icon('close')}</button>`;
    stack.appendChild(item);
    const remove = () => item.remove();
    item.querySelector('[data-toast-close]').addEventListener('click', remove);
    setTimeout(remove, 3200);
  }

  function showDialog({ title, body, onReady, onClose }) {
    const overlay = document.createElement('div');
    overlay.className = 'preview-overlay';
    overlay.innerHTML = `
      <section class="preview-dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <header class="dialog-head"><h2>${esc(title)}</h2><button type="button" data-dialog-close aria-label="${esc(t('close'))}">${icon('close')}</button></header>
        <div class="dialog-body">${body}</div>
      </section>`;
    document.body.appendChild(overlay);
    const close = () => {
      if (!overlay.isConnected) return;
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      onClose?.();
    };
    const onKey = (event) => {
      if (event.key === 'Escape') close();
    };
    overlay.querySelector('[data-dialog-close]').addEventListener('click', close);
    overlay.addEventListener('mousedown', (event) => {
      if (event.target === overlay) close();
    });
    document.addEventListener('keydown', onKey);
    onReady?.(overlay, close);
    overlay.querySelector('input, textarea, button')?.focus();
    return { overlay, close };
  }

  function confirmAction(message) {
    return new Promise((resolve) => {
      let finished = false;
      const dialog = showDialog({
        title: t('confirmDelete'),
        body: `<p class="dialog-message">${esc(message)}</p><div class="dialog-actions"><button type="button" class="button secondary" data-cancel>${esc(t('cancel'))}</button><button type="button" class="button destructive" data-confirm>${esc(t('delete'))}</button></div>`,
        onClose() {
          if (!finished) {
            finished = true;
            resolve(false);
          }
        },
        onReady(overlay, close) {
          const finish = (result) => {
            if (finished) return;
            finished = true;
            close();
            resolve(result);
          };
          overlay.querySelector('[data-cancel]').addEventListener('click', () => finish(false));
          overlay.querySelector('[data-confirm]').addEventListener('click', () => finish(true));
        },
      });
      void dialog;
    });
  }

  function picker(name, value, label, options) {
    const selected = options.find((option) => String(option.value) === String(value));
    return `<div class="picker" data-picker="${esc(name)}"><button type="button" class="picker-trigger" data-picker-trigger aria-expanded="false"><span>${esc(selected?.label || label)}</span>${icon('chevron')}</button><div class="picker-menu">${options.map((option) => `<button type="button" class="picker-option ${String(option.value) === String(value) ? 'active' : ''}" data-picker-value="${esc(option.value)}">${esc(option.label)}</button>`).join('')}</div></div>`;
  }

  function bindPickers(scope = root) {
    scope.querySelectorAll('[data-picker]').forEach((pickerEl) => {
      const trigger = pickerEl.querySelector('[data-picker-trigger]');
      trigger?.addEventListener('click', () => {
        const open = pickerEl.classList.toggle('open');
        trigger.setAttribute('aria-expanded', String(open));
      });
      pickerEl.querySelectorAll('[data-picker-value]').forEach((option) => option.addEventListener('click', () => {
        pickerEl.dataset.value = option.dataset.pickerValue;
        pickerEl.dispatchEvent(new CustomEvent('preview:pick', { detail: { value: option.dataset.pickerValue }, bubbles: true }));
        pickerEl.classList.remove('open');
      }));
    });
  }

  function navItems() {
    return [
      { path: 'dashboard', label: t('dashboard'), icon: 'dashboard' },
      { path: 'notes/list', label: t('allNotes'), icon: 'note', parent: 'notes' },
      { path: 'notes/tags', label: t('tags'), icon: 'tag', parent: 'notes' },
      { path: 'chat', label: t('chat'), icon: 'chat' },
      { path: 'settings/profile', label: t('profile'), icon: 'user', parent: 'settings' },
      { path: 'settings/display', label: t('display'), icon: 'monitor', parent: 'settings' },
      { path: 'settings/security', label: t('security'), icon: 'shield', parent: 'settings' },
      { path: 'settings/database', label: t('database'), icon: 'database', parent: 'settings' },
    ];
  }

  function renderNavItem(item, path) {
    const active = path === item.path;
    return `<a class="nav-item ${active ? 'active' : ''}" href="#${item.path}" data-nav="${item.path}">${icon(item.icon)}<span>${esc(item.label)}</span></a>`;
  }

  function renderSidebar(path) {
    const noteOpen = path.startsWith('notes/');
    const settingsOpen = path.startsWith('settings/');
    const notes = navItems().filter((item) => item.parent === 'notes');
    const settings = navItems().filter((item) => item.parent === 'settings');
    return `<aside class="preview-sidebar" data-sidebar>
      <div class="preview-brand">${icon('sparkles')}<strong>${t('brand')}</strong><small>${t('version')}</small></div>
      <nav class="preview-nav" aria-label="${esc(t('brand'))}">
        ${renderNavItem(navItems()[0], path)}
        <div class="nav-group ${noteOpen ? 'open' : ''}"><div class="nav-group-title">${icon('note')}<span>${esc(t('notes'))}</span></div>${notes.map((item) => renderNavItem(item, path)).join('')}</div>
        ${renderNavItem(navItems()[3], path)}
        <div class="nav-group ${settingsOpen ? 'open' : ''}"><div class="nav-group-title">${icon('settings')}<span>${esc(t('settings'))}</span></div>${settings.map((item) => renderNavItem(item, path)).join('')}</div>
      </nav>
    </aside>`;
  }

  function pageTitle(path) {
    const item = navItems().find((entry) => entry.path === path);
    return item?.label || t('dashboard');
  }

  function renderHeader(path) {
    return `<header class="preview-header"><button type="button" class="menu-button" data-menu-toggle aria-label="${esc(t('settings'))}">${icon('menu')}</button><nav class="breadcrumbs" aria-label="breadcrumb"><span>${esc(pageTitle(path))}</span></nav><span class="header-spacer"></span><span class="local-mode">${icon('shield')} ${esc(t('localMode'))}</span><div class="theme-actions" role="group" aria-label="${esc(t('theme'))}"><button type="button" data-theme="system" class="${state.theme === 'system' ? 'active' : ''}" title="${esc(t('system'))}">${icon('monitor')}</button><button type="button" data-theme="light" class="${state.theme === 'light' ? 'active' : ''}" title="${esc(t('light'))}">${icon('sun')}</button><button type="button" data-theme="dark" class="${state.theme === 'dark' ? 'active' : ''}" title="${esc(t('dark'))}">${icon('moon')}</button></div><div class="user-chip">${icon('user')}<span>${esc(t('admin'))}</span></div></header>`;
  }

  function renderDashboard() {
    const notes = [...state.notes].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);
    const chats = [...state.conversations].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);
    return `<section class="page"><div class="page-heading"><div><h1>${esc(t('greeting'))}</h1><p class="muted">${esc(t('localNotice'))}</p></div></div><div class="stat-grid"><a class="stat-card" href="#notes/list">${icon('note')}<span><strong>${formatNumber(state.notes.length)}</strong><small>${esc(t('notesTotal'))}</small></span></a><a class="stat-card" href="#chat">${icon('chat')}<span><strong>${formatNumber(state.conversations.length)}</strong><small>${esc(t('chatsTotal'))}</small></span></a></div><div class="content-grid"><section class="card"><div class="card-head"><h2>${esc(t('recentNotes'))}</h2><a href="#notes/list">${esc(t('allNotes'))}</a></div>${notes.length ? `<div class="compact-list">${notes.map((note) => `<a href="#notes/list" class="compact-row"><span>${icon('note')}</span><span><strong>${esc(note.title)}</strong><small>${esc(relativeTime(note.updatedAt))}</small></span></a>`).join('')}</div>` : emptyState('inbox', t('noNotes'), t('noNotesHint'), t('newNote'), 'new-note')}</section><section class="card"><div class="card-head"><h2>${esc(t('recentChats'))}</h2><a href="#chat">${esc(t('chat'))}</a></div>${chats.length ? `<div class="compact-list">${chats.map((chat) => `<a href="#chat" class="compact-row"><span>${icon('chat')}</span><span><strong>${esc(chat.title)}</strong><small>${esc(relativeTime(chat.updatedAt))}</small></span></a>`).join('')}</div>` : emptyState('chat', t('noChats'), t('noChatsHint'), t('newChat'), 'new-chat')}</section></div></section>`;
  }

  function emptyState(symbol, title, description, action, actionName) {
    return `<div class="empty-state">${icon(symbol)}<strong>${esc(title)}</strong><span>${esc(description)}</span><button type="button" class="button secondary" data-action="${actionName}">${esc(action)}</button></div>`;
  }

  function renderNotesList() {
    const all = filteredNotes();
    const visible = all.slice(0, state.noteVisible);
    const tagOptions = [{ value: '', label: t('allTags') }, ...state.tags.map((tag) => ({ value: tag.id, label: tag.name }))];
    return `<section class="page"><div class="page-heading wrap"><div><h1>${esc(t('allNotes'))}</h1><p class="muted">${formatNumber(all.length)} / ${formatNumber(state.notes.length)}</p></div><button type="button" class="button primary" data-action="new-note">${icon('plus')}${esc(t('newNote'))}</button></div><div class="toolbar"><label class="search-field">${icon('search')}<input type="search" data-note-search value="${esc(state.noteSearch)}" placeholder="${esc(t('searchNotes'))}"></label>${picker('note-tag', state.noteTag, t('allTags'), tagOptions)}</div><div class="note-list">${visible.length ? visible.map(renderNoteCard).join('') : emptyState('inbox', t('noNotes'), t('noNotesHint'), t('newNote'), 'new-note')}</div>${visible.length < all.length ? `<div class="center"><button type="button" class="button outline" data-action="load-more">${esc(t('loadMore'))}</button></div>` : ''}</section>`;
  }

  function renderNoteCard(note) {
    const value = noteWithTags(note);
    return `<article class="note-card"><div class="row-between"><h2>${esc(value.title)}</h2><div class="inline-actions"><button type="button" class="icon-button" data-edit-note="${value.id}" title="${esc(t('edit'))}">${icon('edit')}</button><button type="button" class="icon-button danger" data-delete-note="${value.id}" title="${esc(t('delete'))}">${icon('trash')}</button></div></div>${value.body ? `<p class="note-body">${esc(value.body)}</p>` : `<p class="muted">${esc(t('noContent'))}</p>`}<div class="meta"><span>${icon('calendar')}${esc(relativeTime(value.updatedAt))}</span>${value.tags.map((tag) => `<span class="badge">${esc(tag.name)}</span>`).join('')}</div></article>`;
  }

  function renderTags() {
    const rows = state.tags.map((tag) => `<div class="tag-row"><span>${icon('tag')}<strong>${esc(tag.name)}</strong></span><span class="badge">${esc(t('tagCount', { count: state.notes.filter((note) => note.tagIds.includes(tag.id)).length }))}</span><button type="button" class="icon-button danger" data-delete-tag="${tag.id}" title="${esc(t('delete'))}">${icon('trash')}</button></div>`).join('');
    return `<section class="page"><div class="page-heading"><div><h1>${esc(t('tags'))}</h1><p class="muted">${esc(t('emptyTagsHint'))}</p></div></div><form class="create-row" data-tag-form><input name="name" placeholder="${esc(t('tagName'))}" required><button type="submit" class="button secondary">${icon('plus')}${esc(t('createTag'))}</button></form><div class="tag-list">${rows || emptyState('tag', t('emptyTags'), t('emptyTagsHint'), t('createTag'), 'focus-tag')}</div></section>`;
  }

  function renderChat() {
    const active = state.conversations.find((item) => item.id === state.activeConversationId);
    const messages = active ? conversationMessages(active.id) : [];
    const conversations = state.conversations.map((conversation) => {
      const items = conversationMessages(conversation.id);
      return `<div class="conversation-row ${conversation.id === state.activeConversationId ? 'active' : ''}" data-open-conversation="${conversation.id}"><button type="button" class="conversation-main"><strong>${esc(conversation.title)}</strong><small>${esc(items.at(-1)?.content || t('noContent'))}</small></button><span class="conversation-side"><span class="badge">${items.length}</span><button type="button" class="icon-button" data-rename-conversation="${conversation.id}" title="${esc(t('rename'))}">${icon('edit')}</button><button type="button" class="icon-button danger" data-delete-conversation="${conversation.id}" title="${esc(t('delete'))}">${icon('trash')}</button></span></div>`;
    }).join('');
    const roleOptions = [['user', t('roleUser')], ['assistant', t('roleAssistant')]].map(([value, label]) => ({ value, label }));
    return `<section class="page"><div class="page-heading wrap"><div><h1>${esc(t('chat'))}</h1><p class="muted">${formatNumber(state.conversations.length)}</p></div><button type="button" class="button primary" data-action="new-chat">${icon('plus')}${esc(t('newChat'))}</button></div><div class="chat-layout"><section class="conversation-panel"><div class="panel-title"><strong>${esc(t('chat'))}</strong><span class="badge">${formatNumber(state.conversations.length)}</span></div><div class="conversation-list">${conversations || emptyState('chat', t('emptyChats'), t('emptyChatsHint'), t('newChat'), 'new-chat')}</div></section><section class="thread-panel">${active ? `<div class="thread-head"><strong>${esc(active.title)}</strong><span class="muted">${esc(relativeTime(active.updatedAt))}</span></div><div class="thread">${messages.length ? messages.map((message) => `<article class="message ${message.role}"><small>${icon(message.role === 'assistant' ? 'sparkles' : 'user')}${esc(message.role === 'assistant' ? t('roleAssistant') : t('roleUser'))}</small><p>${esc(message.content)}</p><time>${esc(relativeTime(message.createdAt))}</time></article>`).join('') : emptyState('inbox', t('emptyThread'), t('emptyThreadHint'), t('newChat'), 'focus-composer')}</div><form class="composer" data-message-form><textarea name="content" rows="2" placeholder="${esc(t('composer'))}" required></textarea>${picker('message-role', 'user', t('role'), roleOptions)}<button type="submit" class="button primary">${icon('send')}${esc(t('send'))}</button></form>` : emptyState('send', t('emptyThread'), t('emptyThreadHint'), t('newChat'), 'new-chat')}</section></div></section>`;
  }

  function settingsTabs(path) {
    return `<nav class="settings-tabs">${[['profile', t('profile')], ['display', t('display')], ['security', t('security')], ['database', t('database')]].map(([id, label]) => `<a href="#settings/${id}" class="${path === `settings/${id}` ? 'active' : ''}">${esc(label)}</a>`).join('')}</nav>`;
  }

  function renderProfile() {
    const fields = [['username', t('username')], ['name', t('name')], ['age', t('age')], ['email', t('email')], ['phone', t('phone')], ['address', t('address')]];
    const genderOptions = [['', '—'], ['male', t('genderMale')], ['female', t('genderFemale')], ['other', t('genderOther')]].map(([value, label]) => ({ value, label }));
    return `<section class="settings-page page"><h1>${esc(t('profile'))}</h1>${settingsTabs('settings/profile')}<form class="card settings-form" data-profile-form><div class="card-head"><div><h2>${esc(t('profileTitle'))}</h2><p class="muted">${esc(t('profileDesc'))}</p></div></div><div class="form-grid">${fields.map(([id, label]) => `<label>${esc(label)}<input name="${id}" value="${esc(state.profile[id])}" ${id === 'age' ? 'inputmode="numeric"' : ''}></label>`).join('')}<label>${esc(t('gender'))}${picker('profile-gender', state.profile.gender, t('gender'), genderOptions)}</label></div><div class="form-footer"><button type="submit" class="button primary">${esc(t('save'))}</button></div></form></section>`;
  }

  function renderDisplay() {
    const themes = [['system', t('system'), 'monitor'], ['light', t('light'), 'sun'], ['dark', t('dark'), 'moon']];
    const languages = [['zh-CN', t('simplified')], ['zh-TW', t('traditional')], ['en', t('english')]];
    return `<section class="settings-page page"><h1>${esc(t('display'))}</h1>${settingsTabs('settings/display')}<section class="card form-stack"><div><h2>${esc(t('displayTitle'))}</h2><p class="muted">${esc(t('theme'))}</p></div><div class="choice-grid">${themes.map(([value, label, symbol]) => `<button type="button" class="choice ${state.theme === value ? 'active' : ''}" data-theme="${value}">${icon(symbol)}<span>${esc(label)}</span></button>`).join('')}</div><div><p class="muted">${esc(t('language'))}</p><div class="choice-grid language-grid">${languages.map(([value, label]) => `<button type="button" class="choice ${state.language === value ? 'active' : ''}" data-language="${value}">${esc(label)}</button>`).join('')}</div></div></section></section>`;
  }

  function renderSecurity() {
    const durations = DURATIONS.map(([value, zh, en, tw]) => ({ value, label: state.language === 'en' ? en : state.language === 'zh-TW' ? tw : zh }));
    return `<section class="settings-page page"><h1>${esc(t('security'))}</h1>${settingsTabs('settings/security')}<form class="card settings-form" data-password-form><div class="card-head"><div><h2>${esc(t('securityTitle'))}</h2></div></div><div class="form-grid"><label>${esc(t('currentPassword'))}<input name="current" type="password" required></label><label>${esc(t('newPassword'))}<input name="next" type="password" minlength="8" required></label><label>${esc(t('confirmPassword'))}<input name="confirm" type="password" minlength="8" required></label></div><div class="form-footer"><button type="submit" class="button secondary">${esc(t('changePassword'))}</button></div></form><section class="card form-stack"><div><h2>${esc(t('sessionTitle'))}</h2><p class="muted">${esc(t('sessionDesc'))}</p></div><div class="duration-grid">${durations.map((duration) => `<button type="button" class="duration-button ${state.sessionDuration === duration.value ? 'active' : ''}" data-duration="${duration.value}">${esc(duration.label)}</button>`).join('')}</div></section></section>`;
  }

  function renderDatabase() {
    const storageLabel = state.storage === 'indexeddb' ? t('indexedDb') : t('memory');
    const persistenceLabel = state.storage === 'indexeddb' ? t('persistent') : t('memoryOnly');
    const values = [
      ['database', t('driver'), storageLabel], ['shield', t('migrations'), '0'], ['key', t('encryption'), t('disabled')],
      ['note', t('tableNotes'), state.notes.length], ['tag', t('tableTags'), state.tags.length], ['chat', t('tableChats'), state.conversations.length], ['send', t('tableMessages'), [...state.messages.values()].reduce((sum, items) => sum + items.length, 0)],
    ];
    return `<section class="settings-page page"><h1>${esc(t('database'))}</h1>${settingsTabs('settings/database')}<section class="stat-grid database-grid">${values.map(([symbol, label, value]) => `<div class="stat-card database-stat">${icon(symbol)}<span><strong>${esc(typeof value === 'number' ? formatNumber(value) : value)}</strong><small>${esc(label)}</small></span></div>`).join('')}</section><section class="card info-row"><span>${esc(t('persistence'))}</span><strong>${esc(persistenceLabel)}</strong></section></section>`;
  }

  function renderSettings(path) {
    if (path === 'settings/display') return renderDisplay();
    if (path === 'settings/security') return renderSecurity();
    if (path === 'settings/database') return renderDatabase();
    return renderProfile();
  }

  function renderPage(path) {
    if (path === 'notes/list' || path === 'notes') return renderNotesList();
    if (path === 'notes/tags') return renderTags();
    if (path === 'chat') return renderChat();
    if (path.startsWith('settings/')) return renderSettings(path);
    return renderDashboard();
  }

  function render() {
    if (!previewPersistenceReady) return;
    // Persist after each local state change once IndexedDB hydration is ready.
    persistPreviewState();
    applyTheme();
    const path = currentPath();
    if (path === 'notes') return nav('notes/list');
    if (path === 'settings') return nav('settings/profile');
    root.innerHTML = `<div class="nova-file-preview"><div class="preview-shell">${renderSidebar(path)}<div class="preview-workspace">${renderHeader(path)}<main class="preview-main">${renderPage(path)}</main></div></div></div>`;
    bindShell(path);
    bindPage(path);
  }

  function bindShell() {
    root.querySelector('[data-menu-toggle]')?.addEventListener('click', () => root.querySelector('[data-sidebar]')?.classList.toggle('drawer-open'));
    root.querySelectorAll('[data-theme]').forEach((button) => button.addEventListener('click', () => {
      state.theme = button.dataset.theme;
      writeStorage('nova:local-theme', state.theme);
      applyTheme();
      render();
    }));
    root.querySelectorAll('[data-language]').forEach((button) => button.addEventListener('click', () => {
      state.language = button.dataset.language;
      writeStorage('nova:local-language', state.language);
      render();
    }));
    bindPickers(root);
  }

  function bindPage(path) {
    if (path === 'dashboard') {
      root.querySelector('[data-action="new-note"]')?.addEventListener('click', () => openNoteEditor());
      root.querySelector('[data-action="new-chat"]')?.addEventListener('click', () => openConversationDialog());
      return;
    }
    if (path === 'notes/list' || path === 'notes') bindNotesList();
    else if (path === 'notes/tags') bindTags();
    else if (path === 'chat') bindChat();
    else if (path === 'settings/profile') bindProfile();
    else if (path === 'settings/display') bindDisplay();
    else if (path === 'settings/security') bindSecurity();
  }

  function bindNotesList() {
    root.querySelector('[data-note-search]')?.addEventListener('input', (event) => {
      state.noteSearch = event.target.value;
      state.noteVisible = 20;
      render();
    });
    const tagPicker = root.querySelector('[data-picker="note-tag"]');
    tagPicker?.addEventListener('preview:pick', (event) => {
      state.noteTag = event.detail.value;
      state.noteVisible = 20;
      render();
    });
    root.querySelector('[data-action="new-note"]')?.addEventListener('click', () => openNoteEditor());
    root.querySelector('[data-action="load-more"]')?.addEventListener('click', () => {
      state.noteVisible += 20;
      render();
    });
    root.querySelectorAll('[data-edit-note]').forEach((button) => button.addEventListener('click', () => {
      const note = state.notes.find((item) => item.id === Number(button.dataset.editNote));
      if (note) openNoteEditor(noteWithTags(note));
    }));
    root.querySelectorAll('[data-delete-note]').forEach((button) => button.addEventListener('click', async () => {
      if (!await confirmAction(t('confirmDelete'))) return;
      state.notes = state.notes.filter((note) => note.id !== Number(button.dataset.deleteNote));
      for (const tag of state.tags) tag.count = state.notes.filter((note) => note.tagIds.includes(tag.id)).length;
      notify(t('deleted'));
      render();
    }));
    root.querySelector('[data-action="new-note"]')?.focus?.();
  }

  function bindTags() {
    const form = root.querySelector('[data-tag-form]');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const tag = createTag(new FormData(form).get('name'));
      if (!tag) return;
      notify(t('created'));
      render();
    });
    root.querySelector('[data-action="focus-tag"]')?.addEventListener('click', () => root.querySelector('[data-tag-form] input')?.focus());
    root.querySelectorAll('[data-delete-tag]').forEach((button) => button.addEventListener('click', async () => {
      if (!await confirmAction(t('deleteTagConfirm'))) return;
      const id = Number(button.dataset.deleteTag);
      state.tags = state.tags.filter((tag) => tag.id !== id);
      state.notes.forEach((note) => { note.tagIds = note.tagIds.filter((tagId) => tagId !== id); });
      notify(t('deleted'));
      render();
    }));
  }

  function bindChat() {
    root.querySelectorAll('[data-open-conversation]').forEach((row) => row.addEventListener('click', (event) => {
      if (event.target.closest('[data-delete-conversation], [data-rename-conversation]')) return;
      state.activeConversationId = Number(row.dataset.openConversation);
      render();
    }));
    root.querySelector('[data-action="new-chat"]')?.addEventListener('click', () => openConversationDialog());
    root.querySelector('[data-action="focus-composer"]')?.addEventListener('click', () => root.querySelector('[data-message-form] textarea')?.focus());
    root.querySelectorAll('[data-delete-conversation]').forEach((button) => button.addEventListener('click', async (event) => {
      event.stopPropagation();
      if (!await confirmAction(t('deleteChatConfirm'))) return;
      const id = Number(button.dataset.deleteConversation);
      state.conversations = state.conversations.filter((conversation) => conversation.id !== id);
      state.messages.delete(id);
      if (state.activeConversationId === id) state.activeConversationId = null;
      notify(t('deleted'));
      render();
    }));
    root.querySelectorAll('[data-rename-conversation]').forEach((button) => button.addEventListener('click', (event) => {
      event.stopPropagation();
      const conversation = state.conversations.find((item) => item.id === Number(button.dataset.renameConversation));
      if (conversation) openRenameDialog(conversation);
    }));
    const rolePicker = root.querySelector('[data-picker="message-role"]');
    rolePicker?.addEventListener('preview:pick', (event) => { rolePicker.dataset.value = event.detail.value; });
    root.querySelector('[data-message-form]')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const content = String(new FormData(form).get('content') || '').trim();
      const conversation = state.conversations.find((item) => item.id === state.activeConversationId);
      if (!conversation || !content) return;
      const message = { id: Date.now(), conversationId: conversation.id, role: rolePicker?.dataset.value || 'user', content, createdAt: new Date().toISOString() };
      conversation.updatedAt = message.createdAt;
      conversationMessages(conversation.id).push(message);
      form.reset();
      notify(t('saved'));
      render();
    });
  }

  function bindProfile() {
    root.querySelector('[data-profile-form]')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      const pickerEl = root.querySelector('[data-picker="profile-gender"]');
      data.gender = pickerEl?.dataset.value || state.profile.gender;
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        notify(t('invalidEmail'), 'error');
        return;
      }
      state.profile = { ...state.profile, ...data };
      notify(t('saved'));
      render();
    });
    const pickerEl = root.querySelector('[data-picker="profile-gender"]');
    pickerEl?.addEventListener('preview:pick', (event) => { pickerEl.dataset.value = event.detail.value; });
  }

  function bindDisplay() {
    root.querySelectorAll('[data-theme]').forEach((button) => button.addEventListener('click', () => {
      state.theme = button.dataset.theme;
      writeStorage('nova:local-theme', state.theme);
      applyTheme();
      notify(t('saved'));
      render();
    }));
    root.querySelectorAll('[data-language]').forEach((button) => button.addEventListener('click', () => {
      state.language = button.dataset.language;
      writeStorage('nova:local-language', state.language);
      render();
    }));
  }

  function bindSecurity() {
    root.querySelector('[data-password-form]')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      if (!data.current || data.next.length < 8 || data.next !== data.confirm) {
        notify(t('error'), 'error');
        return;
      }
      state.previewPassword = data.next;
      event.currentTarget.reset();
      notify(t('saved'));
    });
    root.querySelectorAll('[data-duration]').forEach((button) => button.addEventListener('click', () => {
      state.sessionDuration = button.dataset.duration;
      notify(t('saved'));
      render();
    }));
  }

  function openNoteEditor(note = null) {
    const selected = new Set(note?.tags?.map((tag) => String(tag.id)) || []);
    const tagButtons = state.tags.length
      ? state.tags.map((tag) => `<button type="button" class="tag-chip ${selected.has(String(tag.id)) ? 'active' : ''}" data-note-tag="${tag.id}">${esc(tag.name)}</button>`).join('')
      : `<span class="muted">${esc(t('noTags'))}</span>`;
    showDialog({
      title: note ? t('editNoteTitle') : t('newNoteTitle'),
      body: `<form class="dialog-form" data-note-dialog-form><label>${esc(t('title'))}<input name="title" value="${esc(note?.title || '')}" placeholder="${esc(t('noteTitle'))}" required></label><label>${esc(t('body'))}<textarea name="body" rows="8" placeholder="${esc(t('noteBody'))}">${esc(note?.body || '')}</textarea></label><div><span class="field-label">${esc(t('tags'))}</span><div class="tag-chips">${tagButtons}</div></div><p class="form-error" data-dialog-error></p><div class="dialog-actions"><button type="button" class="button secondary" data-dialog-cancel>${esc(t('cancel'))}</button><button type="submit" class="button primary">${esc(t('save'))}</button></div></form>`,
      onReady(overlay, close) {
        overlay.querySelectorAll('[data-note-tag]').forEach((button) => button.addEventListener('click', () => button.classList.toggle('active')));
        overlay.querySelector('[data-dialog-cancel]').addEventListener('click', close);
        overlay.querySelector('[data-note-dialog-form]').addEventListener('submit', (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = Object.fromEntries(new FormData(form).entries());
          data.tagIds = [...overlay.querySelectorAll('[data-note-tag].active')].map((button) => Number(button.dataset.noteTag));
          try {
            if (note) updateNote(note.id, data);
            else createNote(data);
            close();
            notify(t('saved'));
            render();
          } catch {
            overlay.querySelector('[data-dialog-error]').textContent = t('required');
          }
        });
      },
    });
  }

  function openConversationDialog() {
    showDialog({
      title: t('newChatTitle'),
      body: `<form class="dialog-form" data-conversation-form><label>${esc(t('chatTitle'))}<input name="title" placeholder="${esc(t('chatPlaceholder'))}" required></label><div class="dialog-actions"><button type="button" class="button secondary" data-dialog-cancel>${esc(t('cancel'))}</button><button type="submit" class="button primary">${esc(t('create'))}</button></div></form>`,
      onReady(overlay, close) {
        overlay.querySelector('[data-dialog-cancel]').addEventListener('click', close);
        overlay.querySelector('[data-conversation-form]').addEventListener('submit', (event) => {
          event.preventDefault();
          const title = new FormData(event.currentTarget).get('title');
          if (!createConversation(title)) return;
          close();
          notify(t('created'));
          nav('chat');
        });
      },
    });
  }

  function openRenameDialog(conversation) {
    showDialog({
      title: t('rename'),
      body: `<form class="dialog-form" data-rename-form><label>${esc(t('chatTitle'))}<input name="title" value="${esc(conversation.title)}" required></label><div class="dialog-actions"><button type="button" class="button secondary" data-dialog-cancel>${esc(t('cancel'))}</button><button type="submit" class="button primary">${esc(t('save'))}</button></div></form>`,
      onReady(overlay, close) {
        overlay.querySelector('[data-dialog-cancel]').addEventListener('click', close);
        overlay.querySelector('[data-rename-form]').addEventListener('submit', (event) => {
          event.preventDefault();
          const title = String(new FormData(event.currentTarget).get('title') || '').trim();
          if (!title) return;
          conversation.title = title;
          conversation.updatedAt = new Date().toISOString();
          close();
          notify(t('updated'));
          render();
        });
      },
    });
  }

  const style = document.createElement('style');
  style.textContent = `
    .nova-file-preview { min-height: 100dvh; color: hsl(var(--foreground)); background: hsl(var(--background)); }
    .nova-file-preview button, .nova-file-preview input, .nova-file-preview textarea { box-sizing: border-box; font: inherit; }
    .preview-shell { min-height: 100dvh; display: grid; grid-template-columns: var(--sidebar-width) 1fr; }
    .preview-sidebar { border-inline-end: var(--border-width) solid hsl(var(--border)); background: hsl(var(--background)); }
    .preview-brand { min-height: var(--header-height); display: flex; align-items: center; gap: var(--spacing-2); padding-inline: var(--spacing-4); border-bottom: var(--border-width) solid hsl(var(--border)); }
    .preview-brand strong { font-size: var(--text-base); }
    .preview-brand small { color: hsl(var(--muted-foreground)); font-size: var(--text-xs); }
    .preview-nav { display: grid; gap: var(--spacing-1); padding: var(--spacing-2); }
    .nav-item, .nav-group-title { display: flex; align-items: center; gap: var(--spacing-2); padding: var(--spacing-2) var(--spacing-3); border-radius: var(--radius); color: hsl(var(--muted-foreground)); font-size: var(--text-sm); text-decoration: none; }
    .nav-item:hover, .nav-item.active { color: hsl(var(--foreground)); background: hsl(var(--accent)); }
    .nav-group { display: grid; gap: var(--spacing-1); }
    .nav-group-title { color: hsl(var(--foreground)); font-weight: 600; }
    .nav-group .nav-item { margin-inline-start: var(--spacing-4); font-size: var(--text-xs); }
    .icon { display: inline-flex; align-items: center; justify-content: center; flex: none; min-width: var(--spacing-4); line-height: 1; }
    .preview-workspace { min-width: 0; }
    .preview-header { min-height: var(--header-height); display: flex; align-items: center; gap: var(--spacing-3); padding-inline: var(--spacing-4); border-bottom: var(--border-width) solid hsl(var(--border)); background: hsl(var(--background)); }
    .menu-button { display: none; }
    .breadcrumbs { color: hsl(var(--foreground)); font-size: var(--text-sm); font-weight: 500; }
    .header-spacer { flex: 1; }
    .local-mode { display: inline-flex; align-items: center; gap: var(--spacing-1); color: hsl(var(--muted-foreground)); font-size: var(--text-xs); }
    .theme-actions { display: inline-flex; gap: var(--spacing-1); padding: var(--spacing-1); border: var(--border-width) solid hsl(var(--border)); border-radius: var(--radius-full); background: hsl(var(--muted)); }
    .theme-actions button, .icon-button { display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: var(--radius); color: hsl(var(--muted-foreground)); background: transparent; cursor: pointer; }
    .theme-actions button { padding: var(--spacing-1) var(--spacing-2); }
    .theme-actions button:hover, .theme-actions button.active, .icon-button:hover { color: hsl(var(--foreground)); background: hsl(var(--accent)); }
    .user-chip { display: inline-flex; align-items: center; gap: var(--spacing-1); font-size: var(--text-xs); white-space: nowrap; }
    .preview-main { padding: var(--content-padding); }
    .page { max-width: var(--content-max-width); margin-inline: auto; display: grid; gap: var(--spacing-4); }
    .page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--spacing-3); }
    .page-heading.wrap { flex-wrap: wrap; align-items: center; }
    h1 { margin: 0; font-size: var(--text-xl); }
    h2 { margin: 0; font-size: var(--text-base); }
    .muted { color: hsl(var(--muted-foreground)); font-size: var(--text-sm); }
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(var(--dialog-width-sm), 1fr)); gap: var(--spacing-3); }
    .stat-card { display: flex; align-items: center; gap: var(--spacing-3); padding: var(--spacing-3); border: var(--border-width) solid hsl(var(--border)); border-radius: var(--radius-lg); background: hsl(var(--card)); color: hsl(var(--foreground)); text-decoration: none; }
    .stat-card:hover { border-color: hsl(var(--ring)); }
    .stat-card > .icon { color: hsl(var(--primary)); font-size: var(--text-2xl); }
    .stat-card span { display: grid; gap: var(--spacing-1); }
    .stat-card strong { font-size: var(--text-2xl); }
    .stat-card small, .compact-row small, .conversation-main small { color: hsl(var(--muted-foreground)); font-size: var(--text-xs); }
    .content-grid, .chat-layout { display: grid; grid-template-columns: repeat(auto-fit, minmax(var(--dialog-width-md), 1fr)); gap: var(--spacing-3); }
    .card, .conversation-panel, .thread-panel { display: grid; gap: var(--spacing-3); padding: var(--spacing-3); border: var(--border-width) solid hsl(var(--border)); border-radius: var(--radius-lg); background: hsl(var(--card)); }
    .card-head, .row-between, .panel-title, .thread-head, .info-row { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-2); }
    .card-head a { color: hsl(var(--muted-foreground)); font-size: var(--text-xs); }
    .compact-list, .note-list, .tag-list, .conversation-list, .thread { display: grid; gap: var(--spacing-2); }
    .compact-row { display: flex; align-items: center; gap: var(--spacing-2); padding: var(--spacing-2); border-radius: var(--radius); color: hsl(var(--foreground)); text-decoration: none; }
    .compact-row:hover { background: hsl(var(--accent)); }
    .compact-row > span:last-child { display: grid; gap: var(--spacing-1); min-width: 0; }
    .compact-row strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .empty-state { display: grid; justify-items: center; gap: var(--spacing-2); padding: var(--spacing-6) var(--spacing-4); border: var(--border-width) dashed hsl(var(--border)); border-radius: var(--radius-lg); text-align: center; }
    .empty-state > .icon { color: hsl(var(--muted-foreground)); font-size: var(--text-2xl); }
    .empty-state > span { color: hsl(var(--muted-foreground)); font-size: var(--text-sm); }
    .button { display: inline-flex; align-items: center; justify-content: center; gap: var(--spacing-2); padding: var(--spacing-2) var(--spacing-3); border: var(--border-width) solid transparent; border-radius: var(--radius); cursor: pointer; font-size: var(--text-sm); }
    .button.primary { color: hsl(var(--primary-foreground)); background: hsl(var(--primary)); }
    .button.secondary { color: hsl(var(--secondary-foreground)); background: hsl(var(--secondary)); }
    .button.outline { color: hsl(var(--foreground)); border-color: hsl(var(--border)); background: transparent; }
    .button.destructive { color: hsl(var(--destructive-foreground)); background: hsl(var(--destructive)); }
    .button:hover { opacity: .88; }
    .toolbar, .create-row, .inline-actions, .form-footer, .dialog-actions, .meta { display: flex; align-items: center; gap: var(--spacing-2); flex-wrap: wrap; }
    .toolbar { justify-content: space-between; }
    .search-field { display: flex; align-items: center; gap: var(--spacing-2); width: min(100%, var(--dialog-width-md)); padding: var(--spacing-2) var(--spacing-3); border: var(--border-width) solid hsl(var(--input)); border-radius: var(--radius); background: hsl(var(--background)); }
    .search-field input { width: 100%; border: 0; outline: 0; color: hsl(var(--foreground)); background: transparent; }
    input, textarea { width: 100%; border: var(--border-width) solid hsl(var(--input)); border-radius: var(--radius); padding: var(--spacing-2) var(--spacing-3); color: hsl(var(--foreground)); background: hsl(var(--background)); }
    textarea { resize: vertical; }
    label { display: grid; gap: var(--spacing-1); color: hsl(var(--foreground)); font-size: var(--text-sm); }
    .note-card, .tag-row { display: grid; gap: var(--spacing-2); padding: var(--spacing-3); border: var(--border-width) solid hsl(var(--border)); border-radius: var(--radius-lg); background: hsl(var(--card)); }
    .note-card h2 { overflow: hidden; text-overflow: ellipsis; }
    .note-body { margin: 0; color: hsl(var(--muted-foreground)); font-size: var(--text-sm); white-space: pre-wrap; overflow-wrap: anywhere; }
    .meta { color: hsl(var(--muted-foreground)); font-size: var(--text-xs); }
    .meta > span { display: inline-flex; align-items: center; gap: var(--spacing-1); }
    .badge { display: inline-flex; align-items: center; padding: var(--spacing-1) var(--spacing-2); border-radius: var(--radius-full); color: hsl(var(--secondary-foreground)); background: hsl(var(--secondary)); font-size: var(--text-xs); }
    .tag-row { display: flex; align-items: center; }
    .tag-row > span:first-child { display: inline-flex; align-items: center; gap: var(--spacing-2); min-width: 0; }
    .tag-row > .badge { margin-inline-start: auto; }
    .icon-button { padding: var(--spacing-2); }
    .icon-button.danger:hover { color: hsl(var(--destructive)); background: hsl(var(--destructive) / .1); }
    .center { display: flex; justify-content: center; }
    .picker { position: relative; min-width: var(--dialog-width-sm); }
    .picker-trigger { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-2); padding: var(--spacing-2) var(--spacing-3); border: var(--border-width) solid hsl(var(--input)); border-radius: var(--radius); color: hsl(var(--foreground)); background: hsl(var(--background)); cursor: pointer; }
    .picker-menu { display: none; position: absolute; inset-inline: 0; top: calc(100% + var(--spacing-1)); z-index: 20; gap: var(--spacing-1); padding: var(--spacing-1); border: var(--border-width) solid hsl(var(--border)); border-radius: var(--radius); background: hsl(var(--card)); box-shadow: var(--shadow-md); }
    .picker.open .picker-menu { display: grid; }
    .picker-option { border: 0; padding: var(--spacing-2); border-radius: var(--radius-sm); text-align: start; color: hsl(var(--foreground)); background: transparent; cursor: pointer; }
    .picker-option:hover, .picker-option.active { background: hsl(var(--accent)); }
    .chat-layout { grid-template-columns: minmax(var(--dialog-width-sm), var(--dialog-width-md)) 1fr; align-items: start; }
    .conversation-row { display: flex; align-items: center; gap: var(--spacing-2); padding: var(--spacing-2); border: var(--border-width) solid transparent; border-radius: var(--radius); }
    .conversation-row:hover, .conversation-row.active { border-color: hsl(var(--border)); background: hsl(var(--accent)); }
    .conversation-main { display: grid; gap: var(--spacing-1); min-width: 0; flex: 1; text-align: start; border: 0; color: hsl(var(--foreground)); background: transparent; cursor: pointer; }
    .conversation-main strong, .conversation-main small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .conversation-side { display: inline-flex; align-items: center; gap: var(--spacing-1); }
    .thread-panel { min-width: 0; }
    .thread { min-height: var(--dialog-width-sm); align-content: start; }
    .message { display: grid; gap: var(--spacing-1); max-width: 85%; padding: var(--spacing-2) var(--spacing-3); border-radius: var(--radius); background: hsl(var(--muted)); }
    .message.user { justify-self: end; background: hsl(var(--accent)); }
    .message small, .message time { color: hsl(var(--muted-foreground)); font-size: var(--text-xs); }
    .message p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
    .composer { display: grid; grid-template-columns: 1fr var(--dialog-width-sm) auto; gap: var(--spacing-2); align-items: end; }
    .settings-page { gap: var(--spacing-3); }
    .settings-tabs { display: flex; gap: var(--spacing-1); flex-wrap: wrap; border-bottom: var(--border-width) solid hsl(var(--border)); }
    .settings-tabs a { padding: var(--spacing-2) var(--spacing-3); color: hsl(var(--muted-foreground)); font-size: var(--text-sm); border-bottom: var(--border-width) solid transparent; }
    .settings-tabs a:hover, .settings-tabs a.active { color: hsl(var(--foreground)); border-color: hsl(var(--primary)); }
    .settings-form, .form-stack { display: grid; gap: var(--spacing-3); }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(var(--dialog-width-sm), 1fr)); gap: var(--spacing-3); }
    .form-grid > label:last-child { grid-column: 1 / -1; }
    .form-footer { justify-content: flex-end; }
    .field-label { display: block; margin-bottom: var(--spacing-1); color: hsl(var(--foreground)); font-size: var(--text-sm); }
    .choice-grid, .duration-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(var(--dialog-width-sm), 1fr)); gap: var(--spacing-2); }
    .choice, .duration-button { display: flex; align-items: center; gap: var(--spacing-2); padding: var(--spacing-3); border: var(--border-width) solid hsl(var(--border)); border-radius: var(--radius); color: hsl(var(--foreground)); background: transparent; cursor: pointer; }
    .choice:hover, .choice.active, .duration-button:hover, .duration-button.active { border-color: hsl(var(--primary)); background: hsl(var(--accent)); }
    .language-grid { grid-template-columns: repeat(auto-fit, minmax(var(--dialog-width-sm), 1fr)); }
    .database-grid { grid-template-columns: repeat(auto-fit, minmax(var(--dialog-width-sm), 1fr)); }
    .database-stat { min-height: var(--dialog-width-sm); }
    .info-row { padding: var(--spacing-3); border: var(--border-width) solid hsl(var(--border)); border-radius: var(--radius-lg); background: hsl(var(--card)); }
    .preview-overlay { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: var(--spacing-4); background: hsl(var(--backdrop) / .5); }
    .preview-dialog { width: min(100%, var(--dialog-width-md)); display: grid; gap: var(--spacing-3); max-height: calc(100dvh - var(--spacing-8)); padding: var(--spacing-4); border: var(--border-width) solid hsl(var(--border)); border-radius: var(--radius-lg); background: hsl(var(--card)); box-shadow: var(--shadow-lg); }
    .dialog-head { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-2); }
    .dialog-head h2 { font-size: var(--text-lg); }
    .dialog-head button { display: inline-flex; border: 0; padding: var(--spacing-2); border-radius: var(--radius); color: hsl(var(--muted-foreground)); background: transparent; cursor: pointer; }
    .dialog-head button:hover { color: hsl(var(--foreground)); background: hsl(var(--accent)); }
    .dialog-body, .dialog-form { display: grid; gap: var(--spacing-3); }
    .dialog-message { margin: 0; color: hsl(var(--muted-foreground)); font-size: var(--text-sm); }
    .dialog-actions { justify-content: flex-end; }
    .form-error { min-height: var(--spacing-4); margin: 0; color: hsl(var(--destructive)); font-size: var(--text-xs); }
    .tag-chips { display: flex; gap: var(--spacing-2); flex-wrap: wrap; }
    .tag-chip { padding: var(--spacing-1) var(--spacing-2); border: var(--border-width) solid hsl(var(--border)); border-radius: var(--radius-full); color: hsl(var(--muted-foreground)); background: transparent; cursor: pointer; font-size: var(--text-xs); }
    .tag-chip:hover, .tag-chip.active { color: hsl(var(--primary-foreground)); border-color: hsl(var(--primary)); background: hsl(var(--primary)); }
    .nova-preview-toasts { position: fixed; inset-block-start: var(--spacing-4); inset-inline-end: var(--spacing-4); z-index: 70; display: grid; gap: var(--spacing-2); }
    .preview-toast { display: flex; align-items: center; gap: var(--spacing-2); max-width: var(--dialog-width-md); padding: var(--spacing-2) var(--spacing-3); border: var(--border-width) solid hsl(var(--border)); border-radius: var(--radius); color: hsl(var(--foreground)); background: hsl(var(--card)); box-shadow: var(--shadow-md); font-size: var(--text-sm); }
    .preview-toast.error > .icon { color: hsl(var(--destructive)); }
    .preview-toast > button { display: inline-flex; margin-inline-start: auto; border: 0; padding: var(--spacing-1); border-radius: var(--radius-sm); color: hsl(var(--muted-foreground)); background: transparent; cursor: pointer; }
    .preview-toast > button:hover { background: hsl(var(--accent)); }
    @media (max-width: 39.99rem) {
      .preview-shell { display: block; }
      .preview-sidebar { position: fixed; inset-block: 0; inset-inline-start: 0; z-index: 30; width: min(var(--sidebar-width), 85vw); transform: translateX(-100%); transition: transform var(--duration-normal) var(--ease-out); }
      .preview-sidebar.drawer-open { transform: translateX(0); }
      .menu-button { display: inline-flex; align-items: center; justify-content: center; border: 0; padding: var(--spacing-2); border-radius: var(--radius); color: hsl(var(--foreground)); background: transparent; cursor: pointer; }
      .menu-button:hover { background: hsl(var(--accent)); }
      .local-mode { display: none; }
      .user-chip > span:not(.icon) { display: none; }
      .content-grid, .chat-layout { grid-template-columns: 1fr; }
      .composer { grid-template-columns: 1fr; }
      .picker { min-width: var(--dialog-width-sm); }
    }
  `;
  document.head.appendChild(style);

  window.addEventListener('hashchange', render);
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (state.theme === 'system') applyTheme();
  });

  render();
})();
