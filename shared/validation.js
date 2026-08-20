/**
 * shared/validation.js
 * 前后端共用的纯校验规则（前端 input 校验与后端路由参数校验复用同一套逻辑）。
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validators = {
  required(value) {
    return value !== undefined && value !== null && String(value).trim() !== ''
      ? null
      : 'required';
  },
  minLength(min) {
    return (value) =>
      value !== undefined && value !== null && String(value).length >= min
        ? null
        : 'minLength';
  },
  maxLength(max) {
    return (value) =>
      value === undefined || value === null || String(value).length <= max
        ? null
        : 'maxLength';
  },
  email(value) {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    return EMAIL_RE.test(String(value).trim()) ? null : 'email';
  },
  numeric(value) {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    return Number.isFinite(Number(value)) ? null : 'numeric';
  },
  oneOf(choices) {
    return (value) =>
      value === undefined || value === null || choices.includes(value) ? null : 'oneOf';
  },
};

/**
 * 按 schema 校验对象。
 * @param {object} data 待校验对象
 * @param {Record<string, Array<(v:any)=>string|null>>} schema 字段 -> 校验器数组
 * @returns {Record<string,string>} 字段 -> 错误码；为空对象表示通过
 */
export function validate(data, schema = {}) {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    for (const rule of rules) {
      const err = rule(data[field]);
      if (err) {
        errors[field] = err;
        break;
      }
    }
  }
  return errors;
}

/** 常见业务校验 schema（供前后端复用） */
export const schemas = {
  note: {
    title: [validators.required, validators.maxLength(120)],
    body: [validators.maxLength(100_000)],
  },
  tag: {
    name: [validators.required, validators.minLength(1), validators.maxLength(32)],
  },
  profile: {
    username: [validators.maxLength(32)],
    name: [validators.maxLength(64)],
    email: [validators.email, validators.maxLength(128)],
    phone: [validators.maxLength(32)],
    age: [validators.numeric],
    gender: [validators.oneOf(['', 'male', 'female', 'other'])],
    address: [validators.maxLength(256)],
  },
  password: {
    password: [validators.required, validators.minLength(8)],
  },
  message: {
    content: [validators.required, validators.maxLength(20_000)],
    role: [validators.oneOf(['user', 'assistant', 'system'])],
  },
};