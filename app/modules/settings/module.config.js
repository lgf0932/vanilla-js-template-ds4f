/**
 * settings 模块清单（profile / display / security / database 四个子模块，
 * 对应 ARCHITECTURE.md 4.3、4.5、4.6 节的安全与会话配置能力）。
 */
export default {
  id: 'settings',
  icon: 'settings',
  order: 4,
  i18nNamespace: 'settings',
  loadRoot: () => import('./index.js'),
  submodules: [
    { id: 'profile', icon: 'user', order: 1, loadView: () => import('./submodules/profile/index.js') },
    { id: 'display', icon: 'monitor', order: 2, loadView: () => import('./submodules/display/index.js') },
    { id: 'security', icon: 'shield-check', order: 3, loadView: () => import('./submodules/security/index.js') },
    { id: 'database', icon: 'database', order: 4, loadView: () => import('./submodules/database/index.js') },
  ],
};