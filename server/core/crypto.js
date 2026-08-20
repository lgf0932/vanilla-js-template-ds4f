/**
 * server/core/crypto.js
 * 敏感字段信封加密（ARCHITECTURE.md 4.6 节）：
 *  - AES-256-GCM（crypto.subtle），每条记录随机 12 字节 IV
 *  - 密文格式统一为 base64(iv):base64(ciphertext + tag)
 *  - 主密钥来自部署环境变量 ENCRYPTION_KEY（不落库）；读取时按记录动态解密，
 *    不做全表内存明文缓存
 *  - 生产环境缺失 ENCRYPTION_KEY 直接抛错；开发环境使用进程内临时密钥（重启失效）并告警
 */

const SALT = new TextEncoder().encode('freebuff-nova:envelope-key:v1');
const ITERATIONS = 150_000;
const AES = { name: 'AES-GCM', length: 256 };
const enc = new TextEncoder();
const dec = new TextDecoder();

/** 开发环境临时密钥（仅一次进程生命周期） */
let _devEphemeral = null;

/**
 * 解析主密钥。生产必须显式配置 ENCRYPTION_KEY。
 */
export function getEncryptionKey(env = {}) {
  if (env.ENCRYPTION_KEY) return env.ENCRYPTION_KEY;
  if (env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY is required in production (see README/env vars)');
  }
  if (!_devEphemeral) {
    _devEphemeral = `dev-ephemeral-${crypto.randomUUID()}`;
    console.warn('[crypto] ENCRYPTION_KEY 未配置，使用进程内临时密钥（重启后无法解密旧数据，仅限开发）');
  }
  return _devEphemeral;
}

/** 是否存在可用的主密钥（数据库设置页的状态展示用，不抛错） */
export function hasEncryptionKey(env = {}) {
  try {
    getEncryptionKey(env);
    return true;
  } catch {
    return false;
  }
}

/** 按密钥派生 AES-GCM 密钥（进程内缓存） */
const _keyCache = new Map();
async function deriveKey(secret) {
  const cached = _keyCache.get(secret);
  if (cached) return cached;
  const material = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    AES,
    false,
    ['encrypt', 'decrypt'],
  );
  _keyCache.set(secret, key);
  return key;
}

function toBase64(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * 加密明文 → `base64(iv):base64(ciphertext+tag)`
 * @param {string} secret 信封主密钥（来自 getEncryptionKey(env)）
 * @param {string} plaintext
 */
export async function encryptText(secret, plaintext) {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(String(plaintext)));
  return `${toBase64(iv)}:${toBase64(new Uint8Array(ct))}`;
}

/**
 * 解密 `base64(iv):base64(ciphertext+tag)` → 明文。格式错误/密钥不符抛错（调用方处理）。
 */
export async function decryptText(secret, payload) {
  const idx = String(payload).indexOf(':');
  if (idx <= 0) throw new Error('INVALID_CIPHERTEXT');
  const iv = fromBase64(payload.slice(0, idx));
  const ct = fromBase64(payload.slice(idx + 1));
  const key = await deriveKey(secret);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return dec.decode(plain);
}