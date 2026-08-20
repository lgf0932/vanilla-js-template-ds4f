/**
 * app/modules/registry.js
 * 模块注册表 —— 新增业务模块唯一允许改动的登记点（AGENTS.md 红线 #6）。
 * 每新增一个模块：此处补一行 `id: () => import(...)`，壳层代码零改动。
 *
 * 模块清单契约（ModuleManifest，见 ARCHITECTURE.md 3.2 节）：
 *   { id, icon, order, i18nNamespace, loadRoot, submodules?: [{ id, icon, order, loadView }] }
 */

/** 懒加载各模块的 module.config.js（决定侧边栏与路由表） */
export const moduleLoaders = {
  dashboard: () => import('./dashboard/module.config.js'),
  tasks: () => import('./tasks/module.config.js'),
  notes: () => import('./notes/module.config.js'),
  apps: () => import('./apps/module.config.js'),
  chat: () => import('./chat/module.config.js'),
  chats: () => import('./chats/module.config.js'),
  docs: () => import('./docs/module.config.js'),
  settings: () => import('./settings/module.config.js'),
};

/**
 * 并行加载全部模块配置并做一致性校验。
 * @returns {Promise<Array<object>>} ModuleManifest 数组
 */
export async function loadModuleConfigs() {
  const entries = Object.entries(moduleLoaders);
  const configs = await Promise.all(entries.map(([, load]) => load().then((m) => m.default)));
  for (const [i, [id]] of entries.entries()) {
    const cfg = configs[i];
    if (!cfg || cfg.id !== id || typeof cfg.loadRoot !== 'function') {
      throw new Error(`[registry] 模块 "${id}" 的 module.config.js 不符合 ModuleManifest 契约`);
    }
  }
  return configs;
}