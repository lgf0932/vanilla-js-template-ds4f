/**
 * server/core/router.js
 * 手写同构路由器：`method + path` 精确匹配，支持 `:param` 路径参数。
 * 与前端路由（app/core/router.js，history-based）职责分离：这里是纯 Request→Response。
 */

/**
 * @param {string} method e.g. 'GET'
 * @param {string} pattern e.g. '/api/notes/:id'
 * @param {Function} handler (ctx) => Promise<Response|object>
 * @param {{ public?: boolean, cacheControl?: string|null }} [opts] public=跳过鉴权，cacheControl=响应头
 */
export function createRouter() {
  /** @type {Array<{method:string, segs:string[], handler:Function, isPublic:boolean, cacheControl:string|null}>} */
  const routes = [];

  return {
    add(method, pattern, handler, opts = {}) {
      routes.push({
        method: String(method).toUpperCase(),
        segs: String(pattern).split('/').filter(Boolean),
        handler,
        isPublic: Boolean(opts.public),
        cacheControl: opts.cacheControl == null ? null : String(opts.cacheControl),
      });
    },

    /** 匹配：返回 { handler, params, isPublic, cacheControl } 或 null */
    match(method, pathname) {
      const parts = String(pathname).split('/').filter(Boolean);
      for (const r of routes) {
        if (r.method !== method) continue;
        if (r.segs.length !== parts.length) continue;
        const params = {};
        let ok = true;
        for (let i = 0; i < r.segs.length; i++) {
          const seg = r.segs[i];
          const part = parts[i];
          if (seg.startsWith(':')) {
            params[seg.slice(1)] = decodeURIComponent(part);
          } else if (seg !== part) {
            ok = false;
            break;
          }
        }
        if (ok) return { handler: r.handler, params, isPublic: r.isPublic, cacheControl: r.cacheControl };
      }
      return null;
    },

    get routes() {
      return routes;
    },
  };
}