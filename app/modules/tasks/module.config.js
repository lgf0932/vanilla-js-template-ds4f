export default {
  id: 'tasks',
  icon: 'list-todo',
  order: 2,
  i18nNamespace: 'tasks',
  loadRoot: () => import('./index.js'),
  submodules: [],
};