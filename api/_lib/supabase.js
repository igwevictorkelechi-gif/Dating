import { env } from './env.js';

// Who is calling: checks the user's Supabase access token with Supabase Auth.
export async function userFromRequest(request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const res = await fetch(`${env.supabaseUrl}/auth/v1/user`, {
    headers: { apikey: env.supabasePublishableKey, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user?.id ? user : null;
}

// Database calls as the server (service role: bypasses row level security, so keep these narrow).
async function admin(path, init = {}) {
  const res = await fetch(`${env.supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.supabaseServiceKey,
      Authorization: `Bearer ${env.supabaseServiceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${body?.message || text}`);
  return body;
}

export const db = {
  settings: async () => (await admin('app_settings?select=pro_price_naira,pro_days&limit=1'))[0],
  openPayment: async (userId, amountKobo) => (await admin(
    `payments?select=*&user_id=eq.${userId}&status=eq.pending&amount_kobo=eq.${amountKobo}`
    + `&expires_at=gt.${encodeURIComponent(new Date(Date.now() + 5 * 60_000).toISOString())}&order=created_at.desc&limit=1`,
  ))[0] || null,
  payment: async (userId, id) => (await admin(`payments?select=*&id=eq.${encodeURIComponent(id)}&user_id=eq.${userId}&limit=1`))[0] || null,
  insertPayment: async (row) => (await admin('payments', { method: 'POST', body: JSON.stringify(row) }))[0],
  markExpired: (requestId) => admin(
    `payments?cheqpay_request_id=eq.${encodeURIComponent(requestId)}&status=eq.pending`,
    { method: 'PATCH', body: JSON.stringify({ status: 'expired' }) },
  ),
  recordPaid: (requestId, paidKobo) => admin('rpc/record_cheqpay_payment', {
    method: 'POST', body: JSON.stringify({ request_id: requestId, paid_kobo: paidKobo }),
  }),
};

// The shape the app gets back.
export const publicPayment = (p) => ({
  id: p.id, status: p.status, amount_kobo: Number(p.amount_kobo), account_number: p.account_number,
  bank_name: p.bank_name, account_name: p.account_name, expires_at: p.expires_at, paid_at: p.paid_at,
});
