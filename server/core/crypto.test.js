import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encryptText, decryptText, getEncryptionKey, hasEncryptionKey } from './crypto.js';

const SECRET = 'test-envelope-key-0123456789abcdef';

test('encryptText/decryptText: 往返一致', async () => {
  const cipher = await encryptText(SECRET, '{"name":"王小明"}');
  assert.equal(await decryptText(SECRET, cipher), '{"name":"王小明"}');
});

test('密文格式必须为 iv:ciphertext（base64）', async () => {
  const cipher = await encryptText(SECRET, 'hello');
  const [iv, ct] = cipher.split(':');
  assert.ok(iv && ct, '缺少 iv 或密文段');
  assert.ok(/^[A-Za-z0-9+/=]+$/.test(iv));
});

test('同明文两次加密产生不同密文（随机 IV）', async () => {
  const a = await encryptText(SECRET, 'same');
  const b = await encryptText(SECRET, 'same');
  assert.notEqual(a, b);
});

test('密文被篡改 → 解密抛错（GCM 认证）', async () => {
  const cipher = await encryptText(SECRET, 'important');
  const [iv, ct] = cipher.split(':');
  const tampered = `${iv}:${ct.slice(0, -2)}xx`;
  await assert.rejects(() => decryptText(SECRET, tampered));
});

test('密钥不符 → 解密失败', async () => {
  const cipher = await encryptText(SECRET, 'x');
  await assert.rejects(() => decryptText('another-secret', cipher));
});

test('生产环境缺少 ENCRYPTION_KEY → 抛错；开发环境生成临时密钥', () => {
  assert.throws(() => getEncryptionKey({ NODE_ENV: 'production' }), /ENCRYPTION_KEY/);
  assert.equal(hasEncryptionKey({ NODE_ENV: 'production' }), false);
  assert.ok(getEncryptionKey({ NODE_ENV: 'development' }));
  assert.equal(hasEncryptionKey({ NODE_ENV: 'development' }), true);
});