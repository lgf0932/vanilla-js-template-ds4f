/**
 * app/core/bootstrap.js
 * 应用引导（ARCHITECTURE.md 3.2 节）：
 *  1. 加载壳层文案（common/sidebar/auth）
 *  2. 应用初始主题（<html data-theme>）
 *  3. 读取模块注册表 → 渲染侧边栏菜单树 + 登记路由表
 *  4. 鉴权守卫：未鉴权展示 auth-gate（密码页），已鉴权挂载 app-shell
 *  5. 处理同源 <a> 点击（SPA 导航）与路由变更广播
 */

import { router } from './router.js';
import { i18n, t } from './i18n.js';
import { theme } from './theme.js';
import { auth } from './auth.js';
import { isFileRuntime } from './runtime.js';
import { loadModuleConfigs } from '../modules/registry.js';

// 副作用导入：注册全部公共组件与壳层组件
import '../components/ui/index.js';
import '../components/layout/index.js';

const root = document.getElementById('app-root');

let shell = null;
let manifests = [];
let menu = [];
let routesRegistered = false;

/**
 * 壳层菜单文案必须来自已在 bootstrap 阶段加载的 sidebar 命名空间。
 * i18n.t() 缺 key 时会返回 key 本身，因此不能使用 `t(key) || fallback`。
 */
function menuText(key, fallback) {
  const value = t(key);
  return value === key ? fallback : value;
}

/** 由注册表派生侧边栏数据结构 */
function buildMenu(list) {
  return list
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((m) => ({
      id: m.id,
      icon: m.icon,
      href: `/${m.id}`,
      label: menuText(`sidebar.${m.id}`, m.id),
      submodules: (m.submodules || [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          id: s.id,
          icon: s.icon,
          href: `/${m.id}/${s.id}`,
          label: menuText(`sidebar.submodules.${m.id}.${s.id}`, s.id),
        })),
    }));
}

/** 为模块/子模块建立路由条目（懒加载 JS + 语言包，再挂载视图） */
function makeEntry(manifest, sub, path) {
  return {
    path,
    async mount(viewport) {
      const mod = sub ? await sub.loadView() : await manifest.loadRoot();
      if (mod && typeof mod.loadLocale === 'function') {
        i18n.merge(await mod.loadLocale(i18n.lang));
      }

      const moduleLabel = menuText(`sidebar.${manifest.id}`, manifest.id);
      const subLabel = sub ? menuText(`sidebar.submodules.${manifest.id}.${sub.id}`, sub.id) : '';
      const crumbs = sub
        ? [
            { label: moduleLabel, href: `/${manifest.id}` },
            { label: subLabel },
          ]
        : [{ label: moduleLabel }];
      shell?.setBreadcrumb(crumbs);

      viewport.replaceChildren();
      await mod.mount(viewport, { path, manifest, sub, params: {} });
      viewport.classList.add('nova-fade-in');
    },
  };
}

function registerRoutes() {
  if (routesRegistered) return;
  for (const m of manifests) {
    const rootPath = `/${m.id}`;
    router.add(rootPath, makeEntry(m, null, rootPath));
    for (const s of m.submodules || []) {
      const subPath = `${rootPath}/${s.id}`;
      router.add(subPath, makeEntry(m, s, subPath));
    }
  }
  router.onUnmatched = (path) => {
    // 未匹配（含 /）→ 落到第一个模块
    const fallback = menu.length ? menu[0].href : '/';
    if (path !== fallback) router.navigate(fallback, { replace: true });
  };
  routesRegistered = true;
}

/** 挂载应用壳层（鉴权通过后） */
function mountApp() {
  const el = document.createElement('app-shell');
  shell = el;
  root.replaceChildren(el);
  el.setMenu(menu);
  router.render();
}

/** 展示统一密码页；expired=true 时文案提示会话过期 */
function showGate(expired = false) {
  root.replaceChildren();
  const gate = document.createElement('app-auth-gate');
  gate.setAttribute('expired', expired ? 'true' : 'false');
  root.appendChild(gate);
  gate.addEventListener('auth:success', () => mountApp());
}

// ---------- 全局事件 ----------

// 同源 <a> 点击 → SPA 导航（Shadow DOM 内的事件也会冒泡重定向到 document）
document.addEventListener('click', (e) => {
  const a = e.target?.closest?.('a[href]');
  if (!a || e.defaultPrevented || e.button !== 0 || a.target === '_blank') return;
  const href = a.getAttribute('href');
  if (!href || !href.startsWith('/') || href.startsWith('//')) return;
  if (isFileRuntime) {
    e.preventDefault();
    router.navigate(href);
    return;
  }
  const url = new URL(href, window.location.origin);
  if (url.origin !== window.location.origin) return;
  e.preventDefault();
  router.navigate(url.pathname + url.search);
});

// 路由变化 → 侧边栏高亮
window.addEventListener('route:change', (e) => {
  shell?.setActive(e.detail.path);
});

// 会话失效（fetcher 401 广播）→ 切回密码页
window.addEventListener('auth:expired', () => showGate(true));

// 语言切换 → 重建菜单文案并重渲染当前路由
i18n.onChange(() => {
  if (!shell) return;
  menu = buildMenu(manifests);
  shell.setMenu(menu);
  router.render();
});

// ---------- 启动 ----------

async function bootstrap() {
  await i18n.loadShell();
  theme.apply();

  manifests = await loadModuleConfigs();
  menu = buildMenu(manifests);
  registerRoutes();

  if (auth.isAuthenticated()) mountApp();
  else showGate(false);
}

bootstrap();