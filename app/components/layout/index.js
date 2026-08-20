/**
 * app/components/layout/index.js
 * 壳层布局组件聚合入口：app-shell / app-sidebar / app-header / app-main / app-auth-gate。
 * 新增业务模块禁止修改这些文件（唯一登记点是 app/modules/registry.js）。
 */

import './app-shell.js';
import './app-sidebar.js';
import './app-header.js';
import './app-main.js';
import './app-auth-gate.js';