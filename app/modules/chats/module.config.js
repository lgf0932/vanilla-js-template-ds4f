export default {
  id: 'chats',
  icon: 'messages-square',
  order: 4,
  i18nNamespace: 'chats',
  loadRoot: () => import('./index.js'),
  submodules: [],
};