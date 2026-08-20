/**
 * chat 模块清单：对话列表 + 消息线程（后端表 chat_conversations / chat_messages）。
 */
export default {
  id: 'chat',
  icon: 'chat',
  order: 3,
  i18nNamespace: 'chat',
  loadRoot: () => import('./index.js'),
  submodules: [],
};