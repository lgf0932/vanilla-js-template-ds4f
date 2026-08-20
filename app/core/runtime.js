/**
 * app/core/runtime.js
 * 浏览器运行时差异收敛：HTTP 部署使用根路径资源，直接打开 index.html 时使用 file:// 资源。
 */

export const isFileRuntime = typeof window !== 'undefined' && window.location?.protocol === 'file:';

export function isFileProtocol(protocol) {
  return protocol === 'file:';
}

function documentBase() {
  return typeof document !== 'undefined' && document.baseURI
    ? document.baseURI
    : import.meta.url;
}

/** 将根路径或模块相对路径解析为当前运行时可访问的 URL。 */
export function resolveAsset(path, baseUrl = documentBase(), fileRuntime = isFileRuntime) {
  const value = String(path);
  const base = new URL(baseUrl, documentBase());
  if (value.startsWith('/')) {
    return fileRuntime ? new URL(value.slice(1), base).href : value;
  }
  return new URL(value, base).href;
}

/**
 * 加载 JSON 语言包：HTTP 使用 fetch，file:// 使用原生 JSON module，避免 file:// fetch 被浏览器拦截。
 */
export async function loadJson(path, baseUrl = documentBase()) {
  if (isFileRuntime) {
    const module = await import(resolveAsset(path, baseUrl), { with: { type: 'json' } });
    return module.default;
  }

  const response = await fetch(resolveAsset(path, baseUrl), {
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) return null;
  return response.json();
}
