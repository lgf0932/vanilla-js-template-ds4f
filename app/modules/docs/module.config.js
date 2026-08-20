/** docs 模块清单：四个相互独立的文档子模块。 */
export default {
  id: 'docs',
  icon: 'book-open',
  order: 5,
  i18nNamespace: 'docs',
  loadRoot: () => import('./index.js'),
  submodules: [
    { id: 'introduction', icon: 'book-open', order: 1, loadView: () => import('./submodules/introduction/index.js') },
    { id: 'get-started', icon: 'rocket', order: 2, loadView: () => import('./submodules/get-started/index.js') },
    { id: 'tutorials', icon: 'graduation-cap', order: 3, loadView: () => import('./submodules/tutorials/index.js') },
    { id: 'changelog', icon: 'scroll-text', order: 4, loadView: () => import('./submodules/changelog/index.js') },
  ],
};