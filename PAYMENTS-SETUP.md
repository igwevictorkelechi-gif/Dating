# alignment Pro and CheqPay payments

alignment is free to try and paid to use fully:

- **Free plan**: a few free swipes (3 by default) and no super likes.
- **Free trial** (optional): unlimited swipes for the first N days after someone joins.
- **Pro**: unlimited swipes and super likes for a set number of days (₦2,000 for 30 days by default).

Admins change all of these in the app under **Settings → Admin**. That page can also give someone Pro by username.

## How paying works

1. A user taps **Pay with CheqPay** on the Pro screen.
2. alignment's server asks CheqPay for a one-off account number for the Pro price (a CheqPay *payment request*). No ID or BVN is needed from the user.
3. The app shows the account number, bank, account name and amount. The number works for one hour.
4. The user sends the money by bank transfer.
5. CheqPay calls alignment's webhook, which turns on Pro, and the app updates by itself. "I've sent the money" also checks with CheqPay straight away.

If someone pays less than the price, it's kept as credit towards their next payment. If they pay for two periods, they get both.

The server code is in `api/` (Vercel Functions). The database side is in `supabase/migrations/20261121090000_alignment_10_pro.sql`.

## Setup (once)

### 1. Run the database migrations

In the Supabase SQL Editor, run the migrations that haven't been applied yet, in order: `..._08_finish.sql`, `..._09_trending.sql` and `..._10_pro.sql`. Then make yourself an admin (use your username):

```sql
insert into public.memberships (user_id, is_admin)
select id, true from public.profiles where username = 'your_username'
on conflict (user_id) do update set is_admin = true;
```

### 2. CheqPay

CheqPay needs the **payment requests** feature (cheqpay pull request "Payment requests"). Then, in the CheqPay developer dashboard:

1. Create a secret key with the `payment_requests:read` and `payment_requests:write` scopes. Use a test key (`cp_test_sk_…`) first.
2. Add a webhook endpoint `https://alignment-alpha.vercel.app/api/cheqpay/webhook` for the events `payment_request.paid` and `payment_request.expired`, and copy its signing secret (`whsec_…`).

### 3. Vercel environment variables

In the Vercel project **alignment**, go to Settings → Environment Variables. Add these for Production, and for Preview too if you test there:

| Name | Value |
| --- | --- |
| `CHEQPAY_SECRET_KEY` | The CheqPay secret key from step 2 |
| `CHEQPAY_WEBHOOK_SECRET` | The webhook signing secret (`whsec_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API keys → `service_role` (secret) |
| `CHEQPAY_API_URL` | Optional. Defaults to `https://api.mycheqpay.com/v1` |

These are secrets: they live only on the server and never reach the app. After adding them, redeploy the project (Deployments → ⋯ → Redeploy).

Until these are set, the Pro screen says "Payments aren't switched on yet". Free swipes and the trial still work.

### 4. Try it in test mode

With a test key, pay in the CheqPay sandbox using `POST /v1/test_helpers/payment_requests/{id}/pay` (or the developer dashboard). Pro should switch on within a few seconds. Then swap in a live key.

## Notes

- Payments only work on Vercel. The WhoGoHost/cPanel build serves the app but not the `api/` server functions.
- `npm run dev` doesn't run the `api/` functions either. Use `vercel dev` to try payments locally.
- Payments are in the `payments` table, and each user's plan is in `memberships`. Both are in the Supabase Table Editor.
