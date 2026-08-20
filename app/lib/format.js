/**
 * app/lib/format.js
 * 纯展示格式化函数（时间 / 数字 / 文本），不依赖 DOM。
 */

/** 绝对时间：2026-08-19 21:30 */
export function formatDateTime(iso, locale = 'zh-CN') {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** 相对时间：刚刚 / 5 分钟前 / 3 小时前 / 昨天 / 3 天前 / 超过 30 天退回绝对时间 */
export function relativeTime(iso, now = Date.now(), locale = 'zh-CN') {
  if (!iso) return '';
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';
  const diff = time - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  const minutes = Math.round(diff / 60_000);
  const hours = Math.round(diff / 3_600_000);
  const days = Math.round(diff / 86_400_000);

  if (abs < 60_000) return rtf.format(Math.round(diff / 1000), 'second');
  if (abs < 3_600_000) return rtf.format(minutes, 'minute');
  if (abs < 86_400_000) return rtf.format(hours, 'hour');
  if (abs < 30 * 86_400_000) return rtf.format(days, 'day');
  return formatDateTime(iso, locale);
}

/** 千分位数字 */
export function formatNumber(n) {
  if (n === undefined || n === null || Number.isNaN(Number(n))) return '0';
  return new Intl.NumberFormat().format(Number(n));
}

/** 截断文本（按字符，避免截断代理对） */
export function truncate(str, max = 60) {
  if (!str) return '';
  const s = String(str);
  if (Array.from(s).length <= max) return s;
  return Array.from(s).slice(0, max).join('') + '…';
}

/** 剥离 HTML 标签，取纯文本（笔记预览用） */
export function plainText(html) {
  if (!html) return '';
  if (typeof document === 'undefined') {
    return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const div = document.createElement('div');
  div.innerHTML = String(html);
  return (div.textContent || '').replace(/\s+/g, ' ').trim();
}