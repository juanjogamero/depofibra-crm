import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scryptCallback);
const KDF = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const FORMAT = /^scrypt\$131072\$8\$1\$([0-9a-f]{32})\$([0-9a-f]{128})$/;
export const SESSION_COOKIE = 'crm_session';
export const SESSION_SECONDS = 8 * 60 * 60;

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 14 || password.length > 1024) {
    throw new Error('La contraseña debe tener entre 14 y 1024 caracteres');
  }
  const salt = randomBytes(16);
  const digest = await derive(password, salt, 64, KDF);
  return `scrypt$131072$8$1$${salt.toString('hex')}$${digest.toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || password.length > 1024) return false;
  const match = typeof storedHash === 'string' ? FORMAT.exec(storedHash) : null;
  if (!match) return false;
  const digest = await derive(password, Buffer.from(match[1], 'hex'), 64, KDF);
  return timingSafeEqual(digest, Buffer.from(match[2], 'hex'));
}

export async function wasteLoginWork(password) {
  const input = typeof password === 'string' && password.length <= 1024 ? password : '';
  await derive(input, Buffer.alloc(16, 0x5c), 64, KDF);
}

export function makeSession() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: tokenHash(token) };
}

export function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function readSessionCookie(header) {
  const match = /(?:^|;\s*)crm_session=([A-Za-z0-9_-]{43})(?:;|$)/.exec(header || '');
  return match ? match[1] : null;
}

export function sessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=${SESSION_SECONDS}`;
}
export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0`;
}
export function validOrigin(header, expected) {
  return typeof header === 'string' && header === expected;
}
