// Server-only settings, read from Vercel environment variables (Project → Settings → Environment Variables).
// Never import this file from the app in src/.
export const env = {
  supabaseUrl: process.env.SUPABASE_URL || 'https://shadyxtgsthuwuyeuciq.supabase.co',
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_UPvY9oRkHur1mDK_8-im7w_SZ95Vq7b',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  cheqpayApiUrl: (process.env.CHEQPAY_API_URL || 'https://api.mycheqpay.com/v1').replace(/\/$/, ''),
  cheqpaySecretKey: process.env.CHEQPAY_SECRET_KEY || '',
  cheqpayWebhookSecret: process.env.CHEQPAY_WEBHOOK_SECRET || '',
};

export function missingConfig(...keys) {
  return keys.filter((k) => !env[k]);
}

export const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
