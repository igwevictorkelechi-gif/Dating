# Backend setup (Supabase)

alignment's backend runs on Supabase project **alignment** (`shadyxtgsthuwuyeuciq`, London region).
The database tables, security rules, storage bucket and live chat are already set up. These are the
steps only you can do in the Supabase dashboard. Do them once, in this order.

Dashboard: https://supabase.com/dashboard/project/shadyxtgsthuwuyeuciq

## 1. Finish the database setup

One last piece needs your approval because it contains a delete (it's what powers **Settings → Delete account**).

1. Open the SQL Editor: https://supabase.com/dashboard/project/shadyxtgsthuwuyeuciq/sql/new
2. Paste everything from `supabase/migrations/20261024090000_alignment_08_finish.sql` and click **Run**.
   If Supabase warns about a destructive operation, run it anyway: it only creates the delete-account
   function, tucks internal functions out of reach and tightens who can call the app's functions.
3. You should see "Success. No rows returned."

Until this is done, everything works except Delete account, which shows "Account deletion isn't switched on yet".

## 2. Tell Supabase where the app lives

Authentication → **URL Configuration**:

- **Site URL**: your live address, e.g. `https://yourdomain.com`
- **Redirect URLs**: add `https://yourdomain.com/**` (and `http://localhost:5173/**` if you run the app on your computer)

## 3. Put the 6-digit code in the sign-up email

The app asks new users for the code from their email. Authentication → **Emails** → **Confirm signup**.
Replace the message body with:

```html
<h2>Confirm your email</h2>
<p>Your alignment code is:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
<p>Enter it in the app to finish signing up. It expires soon.</p>
```

Subject suggestion: `Your alignment code`. (Tapping a link also works, but codes are more reliable because some
mail apps open links automatically and use them up.)

## 4. Send emails to everyone (required before launch)

Supabase's built-in email only delivers to members of your Supabase team (so you can test with your own
address) and only a few emails per hour. For real users, connect your own email sender:

Authentication → **Emails** → **SMTP Settings** → enable **Custom SMTP** and enter the details from either:

- **Your WhoGoHost / Go54 email**: create a mailbox such as `no-reply@yourdomain.com` in cPanel → Email Accounts,
  then use cPanel → Email Accounts → **Connect Devices** for the SMTP host, port and username.
- **A transactional email service** such as Brevo, Resend or ZeptoMail (better delivery and higher limits).

After saving, raise the email limit under Authentication → **Rate Limits** to suit your expected sign-ups.

## 5. Optional: mark creators

People shown first on the "follow five creators" step are marked as creators. In the SQL Editor:

```sql
update public.profiles set is_creator = true where username = 'their_username';
```

## What's where

| Piece | Where |
| --- | --- |
| Accounts & sign-in | Supabase Auth (email + password, confirmed with an emailed code) |
| Profiles, posts, likes, comments, follows, swipes, matches, chat, reports, notifications | Postgres tables in the `public` schema, each protected by row level security |
| Birthdays | `profile_private`, readable only by the owner; everyone else sees `profiles.age`, refreshed daily |
| Photos, voice notes, videos, chat pictures | Storage bucket `media` (10 MB per file); each user can only write in their own folder |
| Live chat, new matches, notifications | Supabase Realtime |
| Reports | `reports` table. Not readable from the app; view them in the dashboard's Table Editor |
| Schema history | `supabase/migrations/` in this repo |

The app connects with the project URL and publishable key in `src/lib/supabase.js`. The publishable key is meant
to be public; the security rules in the database decide what each user can see and change.
