/**
 * app/components/ui/icons.js
 * 项目自有的精简 SVG 图标集（24x24 描边风格，去冗余属性）。
 * 禁止引入整份第三方图标库；新增图标需精简 SVG。
 * 颜色一律取 currentColor，跟随 CSS 变量。
 */

/** 每个图标的内部元素（统一外框 viewBox="0 0 24 24" 由 <ui-icon> 提供） */
const ICONS = {
  dashboard:
    '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"></rect>' +
    '<rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"></rect>' +
    '<rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"></rect>' +
    '<rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"></rect>',
  note:
    '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3h8L19 7.5v12A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5v-15Z"></path>' +
    '<path d="M14 3v4.5h4.5"></path><path d="M8 12h8"></path><path d="M8 16h8"></path>',
  chat:
    '<path d="M21 12a8 8 0 0 1-8 8H5l-2 2v-9a8 8 0 0 1 8-8 8 8 0 0 1 8 7Z"></path>' +
    '<path d="M9 11h6"></path><path d="M9 14.5h4"></path>',
  settings:
    '<circle cx="12" cy="12" r="3"></circle>' +
    '<path d="M12 2.8l1.3 2.2 2.5.6 2.2-1.3 1.7 1.7-1.3 2.2.6 2.5 2.2 1.3v2.4l-2.2 1.3-.6 2.5 1.3 2.2-1.7 1.7-2.2-1.3-2.5.6-1.3 2.2H9.6l-1.3-2.2-2.5-.6-2.2 1.3-1.7-1.7 1.3-2.2-.6-2.5L.8 12.2v-2.4L3 8.5l.6-2.5L2.3 3.8l1.7-1.7 2.2 1.3 2.5-.6L10 2.6h2Z" opacity=".35"></path>',
  plus: '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
  edit: '<path d="M16.5 3.5l4 4L8 20l-4.7 1 1-4.7 12.2-12.8Z"></path><path d="M13.5 6.5l4 4"></path>',
  trash: '<path d="M4 6h16"></path><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"></path><path d="M6 6l1 14h10l1-14"></path><path d="M10 10v6"></path><path d="M14 10v6"></path>',
  tag: '<path d="M3 11.5 11.5 3H21v9.5L12.5 21 3 11.5Z"></path><circle cx="16" cy="8" r="1.4"></circle>',
  'chevron-down': '<path d="M6 9l6 6 6-6"></path>',
  'chevron-right': '<path d="M9 6l6 6-6 6"></path>',
  search: '<circle cx="11" cy="11" r="7"></circle><path d="M16.5 16.5 21 21"></path>',
  sun: '<circle cx="12" cy="12" r="4.5"></circle><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5 5l1.6 1.6M17.4 17.4 19 19M19 5l-1.6 1.6M6.6 17.4 5 19"></path>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"></path>',
  monitor: '<rect x="3" y="4" width="18" height="13" rx="1.5"></rect><path d="M8 21h8"></path><path d="M12 17v4"></path>',
  user: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"></path>',
  key: '<circle cx="8" cy="14.5" r="5"></circle><path d="M13 9.5l7.5-7.5"></path><path d="M17.5 2.5 21 6"></path><path d="M14.5 7l3 3"></path>',
  database: '<ellipse cx="12" cy="5.5" rx="8" ry="3"></ellipse><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"></path><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"></path>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="1.5"></rect><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"></path>',
  x: '<path d="M6 6l12 12"></path><path d="M18 6 6 18"></path>',
  check: '<path d="M4.5 12.5l5 5 10-11"></path>',
  inbox: '<path d="M3 13.5 5.5 19h13L21 13.5V6.5A1.5 1.5 0 0 0 19.5 5h-15A1.5 1.5 0 0 0 3 6.5v7Z"></path><path d="M3 13.5h5a1 1 0 0 1 1 .8l.5 1.4a1 1 0 0 0 1 .8h3a1 1 0 0 0 1-.8l.5-1.4a1 1 0 0 1 1-.8h5"></path>',
  sparkles: '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"></path><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z"></path>',
  send: '<path d="M21 3 10 14"></path><path d="M21 3 13.5 21 10 14 3 10.5 21 3Z"></path>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7"></path><path d="M20 3v4h-4"></path>',
  'arrow-left': '<path d="M19 12H5"></path><path d="M11 6l-6 6 6 6"></path>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="1.5"></rect><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"></path>',
  globe: '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3a13 13 0 0 1 0 18 13 13 0 0 1 0-18Z"></path>',
  bell: '<path d="M18 16H6l1.5-1.8V9.5a4.5 4.5 0 0 1 9 0v4.7L18 16Z"></path><path d="M10.5 19a1.8 1.8 0 0 0 3 0"></path>',
  'list-check': '<path d="M9 6h12"></path><path d="M9 12h12"></path><path d="M9 18h12"></path><path d="M3.5 6l1 1 2-2"></path><path d="M3.5 12l1 1 2-2"></path><path d="M3.5 18l1 1 2-2"></path>',
  'shield-check':
    '<path d="M12 3l7.5 3V11a8 8 0 0 1-7.5 10A8 8 0 0 1 4.5 11V6L12 3Z"></path><path d="M9 12l2 2 4-4.5"></path>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="2"></rect><path d="M8 3v4"></path><path d="M16 3v4"></path><path d="M4 11h16"></path>',
};

export const iconNames = Object.keys(ICONS);

/** 由图名取 SVG 内部元素；未知图名返回占位图标 */
export function iconBody(name) {
  return ICONS[name] || ICONS.sparkles;
}