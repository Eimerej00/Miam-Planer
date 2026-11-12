import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateOrReservedIp, validateExternalRecipeUrl } from './urlSecurity.ts';

test('isPrivateOrReservedIp blocks loopback, private, metadata, and IPv6 local addresses', () => {
  assert.equal(isPrivateOrReservedIp('127.0.0.1'), true);
  assert.equal(isPrivateOrReservedIp('10.0.0.5'), true);
  assert.equal(isPrivateOrReservedIp('172.16.0.1'), true);
  assert.equal(isPrivateOrReservedIp('192.168.1.1'), true);
  assert.equal(isPrivateOrReservedIp('169.254.169.254'), true);
  assert.equal(isPrivateOrReservedIp('100.64.0.1'), true);
  assert.equal(isPrivateOrReservedIp('::1'), true);
  assert.equal(isPrivateOrReservedIp('fe80::1'), true);
  assert.equal(isPrivateOrReservedIp('::ffff:127.0.0.1'), true);
  assert.equal(isPrivateOrReservedIp('::ffff:7f00:1'), true);

  assert.equal(isPrivateOrReservedIp('93.184.216.34'), false);
  assert.equal(isPrivateOrReservedIp('8.8.8.8'), false);
});

test('validateExternalRecipeUrl blocks SSRF vectors and allows public HTTPS URLs', () => {
  assert.equal(validateExternalRecipeUrl('http://127.0.0.1:3000').ok, false);
  assert.equal(validateExternalRecipeUrl('http://localhost/admin').ok, false);
  assert.equal(validateExternalRecipeUrl('http://169.254.169.254/latest/meta-data').ok, false);
  assert.equal(validateExternalRecipeUrl('http://metadata.google.internal/').ok, false);
  assert.equal(validateExternalRecipeUrl('file:///etc/passwd').ok, false);
  assert.equal(validateExternalRecipeUrl('https://user:pass@example.com/recipe').ok, false);
  assert.equal(validateExternalRecipeUrl('https://example.com:8080/recipe').ok, false);

  const okRes = validateExternalRecipeUrl('https://www.marmiton.org/recettes/recette_test.aspx');
  assert.equal(okRes.ok, true);
});
