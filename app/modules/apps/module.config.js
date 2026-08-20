export default {
  id: 'apps',
  icon: 'package',
  order: 3,
  i18nNamespace: 'apps',
  loadRoot: () => import('./index.js'),
  submodules: [],
};