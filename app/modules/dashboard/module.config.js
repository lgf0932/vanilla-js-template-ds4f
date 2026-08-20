/**
 * dashboard 模块清单（ModuleManifest，ARCHITECTURE.md 3.2 节）。
 * 懒加载：路由进入时才 import 视图代码与语言包。
 */
export default {
  id: 'dashboard',
  icon: 'dashboard',
  order: 1,
  i18nNamespace: 'dashboard',
  loadRoot: () => import('./index.js'),
  submodules: [],
};