import test from 'node:test';
import assert from 'node:assert/strict';
import {
  derivePinHash,
  setMasterPin,
  verifyMasterPin,
  isSessionUnlocked,
  lockSession,
} from './security.ts';

function setupMockStorage() {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
  };
  (globalThis as Record<string, unknown>).window = {};
  (globalThis as Record<string, unknown>).localStorage = mockStorage;
  return store;
}

test('derivePinHash uses PBKDF2 v1 prefix and unique salts produce different hashes', async () => {
  const h1 = await derivePinHash('1234', 'salt-a');
  const h2 = await derivePinHash('1234', 'salt-b');
  assert.ok(h1.startsWith('pbkdf2_v1:'));
  assert.notEqual(h1, h2);
});

test('setMasterPin, verifyMasterPin, and lockout behave securely', async () => {
  setupMockStorage();

  assert.equal(await setMasterPin('12'), false); // Too short
  assert.equal(await setMasterPin('abcd'), false); // Non-numeric
  assert.equal(await setMasterPin('4589'), true);
  assert.equal(isSessionUnlocked(), true);

  lockSession();
  assert.equal(isSessionUnlocked(), false);

  // 5 wrong attempts trigger temporary lockout
  for (let i = 0; i < 4; i++) {
    const res = await verifyMasterPin('0000');
    assert.equal(res.ok, false);
    assert.equal(res.lockoutSeconds, undefined);
  }
  const fifth = await verifyMasterPin('0000');
  assert.equal(fifth.ok, false);
  assert.ok((fifth.lockoutSeconds ?? 0) > 0);

  // Even correct PIN is blocked during lockout
  const blocked = await verifyMasterPin('4589');
  assert.equal(blocked.ok, false);
  assert.ok((blocked.lockoutSeconds ?? 0) > 0);
});
