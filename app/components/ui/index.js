/**
 * app/components/ui/index.js
 * Nova 基础组件库聚合入口（壳层 bootstrap 副作用导入即全部注册）。
 * 复用层级：app/components/ui（全局公共）→ app/lib（纯函数）→ 模块内 components/（模块私有）。
 */

// 副作用导入 = 注册自定义元素
import './ui-icon.js';
import './ui-button.js';
import './ui-card.js';
import './ui-badge.js';
import './ui-input.js';
import './ui-select.js';
import './ui-radio-group.js';
import './ui-tabs.js';
import './ui-dialog.js';
import './ui-confirm.js';
import './ui-toast.js';
import './ui-empty.js';
import './ui-theme-switch.js';

// 常用工具再导出
export { toast } from './ui-toast.js';
export { confirmDialog } from './ui-confirm.js';
export { define, attachTemplate, escapeHtml, emit, debounce } from './base.js';
export { iconNames } from './icons.js';