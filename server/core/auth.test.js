import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, signToken, verifyToken } from './auth.js';

test('hashPassword/verifyPassword: 正确密码通过、错误密码拒绝', async () => {
  const hash = await hashPassword('correct horse battery');
  assert.match(hash, /^pbkdf2\$\d+\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  assert.equal(await verifyPassword('correct horse battery', hash), true);
  assert.equal(await verifyPassword('wrong', hash), false);
});

test('同密码两次哈希不同（随机盐）', async () => {
  const a = await hashPassword('same');
  const b = await hashPassword('same');
  assert.notEqual(a, b);
  assert.equal(await verifyPassword('same', a), true);
  assert.equal(await verifyPassword('same', b), true);
});

test('verifyPassword: 破坏的哈希直接拒绝', async () => {
  assert.equal(await verifyPassword('x', null), false);
  assert.equal(await verifyPassword('x', 'not-a-hash'), false);
});

test('signToken/verifyToken: 有效期内通过，携带过期时间', async () => {
  const secret = 'password-hash-secret';
  const expires = Date.now() + 3600_000;
  const token = await signToken(secret, expires);
  const result = await verifyToken(token, secret);
  assert.equal(result.ok, true);
  assert.equal(result.expiresAt, expires);
});

test('verifyToken: 过期令牌拒绝（无需服务端 session）', async () => {
  const token = await signToken('secret', Date.now() - 1000);
  const result = await verifyToken(token, 'secret');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'expired');
});

test('verifyToken: 篡改签名 / 密钥不符拒绝', async () => {
  const token = await signToken('secret-a', Date.now() + 3600_000);
  assert.equal((await verifyToken(token, 'secret-b')).ok, false);
  const parts = token.split(':');
  const tampered = [parts[0], parts[1], parts[2].slice(0, -2) + 'aa'].join(':');
  assert.equal((await verifyToken(tampered, 'secret-a')).ok, false);
});

test('verifyToken: 畸形令牌拒绝', async () => {
  assert.equal((await verifyToken('garbage', 'secret')).ok, false);
  assert.equal((await verifyToken(null, 'secret')).ok, false);
});