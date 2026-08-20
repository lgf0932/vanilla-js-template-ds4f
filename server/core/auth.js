/**
 * server/core/auth.js
 * 单密码全局鉴权（ARCHITECTURE.md 4.3 节，无状态派生令牌，无需服务端 session）：
 *  - 密码存储：PBKDF2（crypto.subtle，随机盐 + 高迭代次数）→ 明文不落库
 *  - 令牌签发：HMAC(password_hash_secret, expiresAt + nonce)，携带过期时间戳
 *  - 校验：验签 + 判过期，天然适配 Cloudflare/Vercel 边缘无状态运行
 */

const PBKDF2_ITERATIONS = 150_000;
const enc = new TextEncoder();

function toB64(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function fromB64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function toB64Url(bytes) {
  return toB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64Url(b64u) {
  const s = b64u.replace(/-/g, '+').replace(/_/g, '/');
  return fromB64(s.padEnd(s.length + ((4 - (s.length % 4)) % 4), '='));
}

async function pbkdf2(password, salt, iterations) {
  const material = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, 256);
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * 对密码生成 PBKDF2 哈希：格式 `pbkdf2$<iter>$<saltB64>$<hashB64>`
 */
export async function hashPassword(password, { iterations = PBKDF2_ITERATIONS } = {}) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await pbkdf2(password, salt, iterations);
  return `pbkdf2$${iterations}$${toB64(salt)}$${toB64(new Uint8Array(bits))}`;
}

/** 校验密码与存储哈希是否匹配（恒定时间比较） */
export async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const [algo, iterStr, saltB64, hashB64] = stored.split('$');
  if (algo !== 'pbkdf2' || !iterStr || !saltB64 || !hashB64) return false;
  const iterations = Number(iterStr);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;
  const salt = fromB64(saltB64);
  const expected = fromB64(hashB64);
  const bits = new Uint8Array(await pbkdf2(password, salt, iterations));
  return constantTimeEqual(bits, expected);
}

/**
 * 签发派生令牌：`<expiresAtMs>:<nonceB64u>:<hmacB64u>`（HMAC 密钥 = 密码哈希字符串）。
 * 过期时间用纯数字毫秒时间戳（ISO 字符串含 ':' 会破坏三段式切分，刻意不用）。
 */
export async function signToken(secret, expiresAt, now = Date.now()) {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const expires = expiresAt instanceof Date ? expiresAt.getTime() : typeof expiresAt === 'number' ? expiresAt : Date.parse(expiresAt) || now + 8 * 3600000;
  const payload = `${expires}:${toB64Url(nonce)}`;

  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
  return `${payload}:${toB64Url(sig)}`;
}

/**
 * 校验令牌：验签（密钥 = 密码哈希） + 判过期。
 * @returns {Promise<{ ok:true, expiresAt:number } | { ok:false, reason:string }>}
 */
export async function verifyToken(token, secret, now = Date.now()) {
  if (!token || !secret) return { ok: false, reason: 'missing' };
  // 三段式切分安全：exp 为纯数字毫秒、nonce/sig 为 base64url，均不含 ':'
  const parts = String(token).split(':');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const [expStr, nonce, sigB64] = parts;
  if (!expStr || !nonce || !sigB64) return { ok: false, reason: 'malformed' };
  const expiresAt = Number(expStr);
  if (!Number.isFinite(expiresAt)) return { ok: false, reason: 'bad_expiry' };
  if (expiresAt <= now) return { ok: false, reason: 'expired' };

  const payload = `${expiresAt}:${nonce}`;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
  const given = fromB64Url(sigB64);
  if (!constantTimeEqual(expected, given)) return { ok: false, reason: 'bad_signature' };
  return { ok: true, expiresAt };
}