import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, validators, schemas } from './validation.js';

test('validate: 必填 + 邮箱', () => {
  const errors = validate({ email: 'bad' }, { email: [validators.email] });
  assert.equal(errors.email, 'email');
  assert.deepEqual(validate({ email: 'a@b.com' }, { email: [validators.email] }), {});
});

test('validate: required 空串视为缺失', () => {
  assert.equal(validate({ title: '  ' }, { title: schemas.note.title }).title, 'required');
  assert.deepEqual(validate({ title: 'ok' }, { title: schemas.note.title }), {});
});

test('validate: minLength / maxLength / numeric / oneOf', () => {
  assert.equal(validators.minLength(8)('123'), 'minLength');
  assert.equal(validators.maxLength(2)('123'), 'maxLength');
  assert.equal(validators.numeric('abc'), 'numeric');
  assert.equal(validators.oneOf(['a', 'b'])('c'), 'oneOf');
  assert.equal(validators.oneOf(['a', 'b'])(undefined), null);
});

test('validate: 未定义值跳过 optional 规则', () => {
  assert.deepEqual(validate({}, { email: [validators.email], age: [validators.numeric] }), {});
});

test('schemas.message: role 必须合法', () => {
  const errors = validate({ role: 'admin', content: 'hi' }, schemas.message);
  assert.equal(errors.role, 'oneOf');
});