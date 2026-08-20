/**
 * app/lib/validate.js
 * 前端表单校验入口：复用 shared/validation.js（跨端共用同一套规则）。
 */
export { validate, validators, schemas } from '../../shared/validation.js';

/** 把校验错误码映射为 i18n 文案 key（由调用方传入 t 函数） */
export function i18nErrors(errors, t, scope = 'common.validation') {
  const map = {};
  for (const [field, code] of Object.entries(errors)) {
    map[field] = t(`${scope}.${code}`, { field });
  }
  return map;
}