// POST /api/pro/checkout  → an account number for the Pro price (reuses an open one if it has 5+ minutes left)
// GET  /api/pro/checkout?payment=<id>  → re-checks that payment with CheqPay ("I've sent the money")
import { cheqpay } from '../_lib/cheqpay.js';
import { db, publicPayment, userFromRequest } from '../_lib/supabase.js';
import { json, missingConfig } from '../_lib/env.js';

const NOT_READY = 'Payments aren’t switched on yet. Please try again later.';

export async function POST(request) {
  if (missingConfig('supabaseServiceKey', 'cheqpaySecretKey').length) return json({ error: NOT_READY }, 503);
  const user = await userFromRequest(request);
  if (!user) return json({ error: 'Please log in again.' }, 401);

  try {
    const settings = await db.settings();
    const amountKobo = settings.pro_price_naira * 100;
    const open = await db.openPayment(user.id, amountKobo);
    if (open) return json({ payment: publicPayment(open) });

    const pr = await cheqpay('/payment_requests', {
      method: 'POST',
      idempotencyKey: `aln-${user.id}-${amountKobo}-${Math.floor(Date.now() / 60_000)}`, // one per user per minute
      body: {
        amount: amountKobo,
        account_name: 'alignment Pro',
        description: `alignment Pro, ${settings.pro_days} days`,
        expires_in: 3600,
        reference: `aln_${user.id.replace(/-/g, '').slice(0, 12)}_${Date.now()}`,
        metadata: { user_id: user.id, product: 'pro' },
      },
    });
    const row = await db.insertPayment({
      user_id: user.id,
      cheqpay_request_id: pr.id,
      amount_kobo: pr.amount,
      account_number: pr.account_number,
      bank_name: pr.bank_name,
      account_name: pr.account_name,
      expires_at: pr.expires_at,
      livemode: !!pr.livemode,
    });
    return json({ payment: publicPayment(row) });
  } catch (e) {
    console.error('checkout failed', e);
    return json({ error: 'We couldn’t get an account number right now. Please try again in a minute.' }, 502);
  }
}

export async function GET(request) {
  if (missingConfig('supabaseServiceKey', 'cheqpaySecretKey').length) return json({ error: NOT_READY }, 503);
  const user = await userFromRequest(request);
  if (!user) return json({ error: 'Please log in again.' }, 401);
  const id = new URL(request.url).searchParams.get('payment');
  if (!id) return json({ error: 'Missing payment' }, 400);

  try {
    const row = await db.payment(user.id, id);
    if (!row) return json({ error: 'Payment not found' }, 404);
    if (row.status === 'pending') {
      const pr = await cheqpay(`/payment_requests/${encodeURIComponent(row.cheqpay_request_id)}`);
      if (pr.status === 'paid') {
        await db.recordPaid(pr.id, pr.amount_paid);
        row.status = 'paid';
      } else if (pr.status === 'expired') {
        await db.markExpired(pr.id);
        row.status = 'expired';
      }
    }
    return json({ payment: publicPayment(row) });
  } catch (e) {
    console.error('payment check failed', e);
    return json({ error: 'We couldn’t check the payment right now. It will still go through once it arrives.' }, 502);
  }
}
