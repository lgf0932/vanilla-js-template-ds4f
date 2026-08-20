/**
 * settings 模块清单：资料、账户、外观、通知、显示、大模型、安全与数据库子模块。
 * 对应 ARCHITECTURE.md 4.3、4.5、4.6 节的安全与会话配置能力。
 */
export default {
  id: 'settings',
  icon: 'settings',
  order: 4,
  i18nNamespace: 'settings',
  loadRoot: () => import('./index.js'),
  submodules: [
    { id: 'profile', icon: 'user', order: 1, loadView: () => import('./submodules/profile/index.js') },
    { id: 'account', icon: 'user', order: 2, loadView: () => import('./submodules/preferences/index.js') },
    { id: 'appearance', icon: 'monitor', order: 3, loadView: () => import('./submodules/preferences/index.js') },
    { id: 'notifications', icon: 'bell', order: 4, loadView: () => import('./submodules/preferences/index.js') },
    { id: 'display', icon: 'dashboard', order: 5, loadView: () => import('./submodules/preferences/index.js') },
    { id: 'llm', icon: 'sparkles', order: 6, loadView: () => import('./submodules/preferences/index.js') },
    { id: 'security', icon: 'shield-check', order: 7, loadView: () => import('./submodules/security/index.js') },
    { id: 'database', icon: 'database', order: 8, loadView: () => import('./submodules/database/index.js') },
  ],
};