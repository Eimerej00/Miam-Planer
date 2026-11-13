import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  normalizeEmail,
  isEmailWhitelisted,
  evaluateGoogleUserAccess,
} from './security.ts';

test('normalizeEmail trims whitespace and lowercases email', () => {
  assert.equal(normalizeEmail('  User@Example.COM  '), 'user@example.com');
  assert.equal(normalizeEmail(null), '');
  assert.equal(normalizeEmail(undefined), '');
});

test('isEmailWhitelisted permits only the two authorized emails regardless of case/spacing', async () => {
  assert.equal(await isEmailWhitelisted('jeremie.lecorney@gmail.com'), true);
  assert.equal(await isEmailWhitelisted('  JEREMIE.LECORNEY@GMAIL.COM '), true);
  assert.equal(await isEmailWhitelisted('jenni.mans00@gmail.com'), true);
  assert.equal(await isEmailWhitelisted('Jenni.Mans00@gmail.com'), true);

  assert.equal(await isEmailWhitelisted('autre@gmail.com'), false);
  assert.equal(await isEmailWhitelisted('jeremie.lecorney@googlemail.com'), false);
  assert.equal(await isEmailWhitelisted('jenni.mans0@gmail.com'), false);
  assert.equal(await isEmailWhitelisted(''), false);
  assert.equal(await isEmailWhitelisted(null), false);
});

test('evaluateGoogleUserAccess enforces authentication, verified email, and whitelist', async () => {
  assert.deepEqual(await evaluateGoogleUserAccess(null), {
    allowed: false,
    reason: 'unauthenticated',
  });

  assert.deepEqual(
    await evaluateGoogleUserAccess({
      email: 'jeremie.lecorney@gmail.com',
      emailVerified: false,
    }),
    { allowed: false, reason: 'unverified' }
  );

  assert.deepEqual(
    await evaluateGoogleUserAccess({
      email: 'intrus@gmail.com',
      emailVerified: true,
    }),
    { allowed: false, reason: 'unauthorized' }
  );

  assert.deepEqual(
    await evaluateGoogleUserAccess({
      email: 'jeremie.lecorney@gmail.com',
      emailVerified: true,
    }),
    { allowed: true }
  );

  assert.deepEqual(
    await evaluateGoogleUserAccess({
      email: 'jenni.mans00@gmail.com',
      emailVerified: true,
    }),
    { allowed: true }
  );
});

test('client security source does not expose plaintext allowlisted email addresses', () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), 'src/utils/security.ts'), 'utf8');
  assert.equal(source.toLowerCase().includes('jeremie.lecorney'), false);
  assert.equal(source.toLowerCase().includes('jenni.mans00'), false);
});
