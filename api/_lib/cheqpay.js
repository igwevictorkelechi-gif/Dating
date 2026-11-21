import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from './env.js';

// Calls the CheqPay API with alignment's secret key.
export async function cheqpay(path, { method = 'GET', body, idempotencyKey } = {}) {
  const res = await fetch(`${env.cheqpayApiUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.cheqpaySecretKey}`,
      'Content-Type': 'application/json',
      ...(method === 'POST' ? { 'Idempotency-Key': idempotencyKey || randomUUID() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || `CheqPay returned ${res.status}`);
    err.status = res.status;
    err.code = data?.error?.code;
    throw err;
  }
  return data;
}

// Checks a CheqPay webhook (Standard Webhooks format): `webhook-signature` holds one or more
// "v1,<base64 HMAC-SHA256 of id.timestamp.body>", keyed with the base64 part of the whsec_ secret.
export function verifyWebhook(headers, rawBody, secret, now = Date.now()) {
  const id = headers.get('webhook-id');
  const ts = headers.get('webhook-timestamp');
  const sigs = (headers.get('webhook-signature') || '').split(' ').filter(Boolean);
  if (!id || !ts || !sigs.length || !secret) return false;
  if (Math.abs(now / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${ts}.${rawBody}`).digest();
  return sigs.some((s) => {
    const given = Buffer.from(s.replace(/^v1,/, ''), 'base64');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
