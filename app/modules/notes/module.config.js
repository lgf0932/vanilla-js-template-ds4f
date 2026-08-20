/**
 * notes 模块清单（含 notes-list / notes-tags 两个子模块）。
 * 子模块与同级其它子模块之间同样禁止相互 import（AGENTS 第 3 节）。
 */
export default {
  id: 'notes',
  icon: 'note',
  order: 2,
  i18nNamespace: 'notes',
  loadRoot: () => import('./index.js'),
  submodules: [
    { id: 'list', icon: 'list-check', order: 1, loadView: () => import('./submodules/notes-list/index.js') },
    { id: 'tags', icon: 'tag', order: 2, loadView: () => import('./submodules/notes-tags/index.js') },
  ],
};