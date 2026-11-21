// POST /api/cheqpay/webhook — CheqPay tells us a payment request was paid or expired.
// Add this URL in the CheqPay developer dashboard (Webhooks) and put its signing secret in CHEQPAY_WEBHOOK_SECRET.
import { verifyWebhook } from '../_lib/cheqpay.js';
import { db } from '../_lib/supabase.js';
import { json, missingConfig, env } from '../_lib/env.js';

export async function POST(request) {
  if (missingConfig('supabaseServiceKey', 'cheqpayWebhookSecret').length) return json({ error: 'Not configured' }, 503);
  const raw = await request.text();
  if (!verifyWebhook(request.headers, raw, env.cheqpayWebhookSecret)) return json({ error: 'Bad signature' }, 401);

  let event;
  try { event = JSON.parse(raw); } catch { return json({ error: 'Bad JSON' }, 400); }
  const pr = event?.data?.object;

  try {
    if (event.type === 'payment_request.paid' && pr?.id) {
      await db.recordPaid(pr.id, pr.amount_paid);
    } else if (event.type === 'payment_request.expired' && pr?.id) {
      await db.markExpired(pr.id);
    }
  } catch (e) {
    // A request that isn't ours is fine to acknowledge; anything else should be retried by CheqPay.
    if (/Unknown payment request/.test(e.message)) return json({ received: true, ignored: true });
    console.error('webhook failed', e);
    return json({ error: 'Try again' }, 500);
  }
  return json({ received: true });
}
