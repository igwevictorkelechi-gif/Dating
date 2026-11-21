-- alignment Pro: free swipes / free trial set by an admin, paid Pro via CheqPay.

-- ---------- Settings (one row, edited by admins in the app: Settings → Admin) ----------
create table public.app_settings (
  id boolean primary key default true check (id),
  free_swipes int not null default 3 check (free_swipes between 0 and 1000),
  free_trial_days int not null default 0 check (free_trial_days between 0 and 365),
  pro_price_naira int not null default 2000 check (pro_price_naira between 100 and 1000000),
  pro_days int not null default 30 check (pro_days between 1 and 366),
  updated_at timestamptz not null default now()
);
insert into public.app_settings default values;
alter table public.app_settings enable row level security;
create policy "Signed-in users can read the settings" on public.app_settings for select to authenticated using (true);

-- ---------- Membership: admin flag, Pro end date, swipe counter ----------
-- Readable by its owner; only changed by the functions below (never directly by the app).
create table public.memberships (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  is_admin boolean not null default false,
  pro_until timestamptz,
  swipes_used int not null default 0,
  credit_kobo bigint not null default 0, -- money paid that didn't add up to a whole Pro period yet
  updated_at timestamptz not null default now()
);
alter table public.memberships enable row level security;
create policy "Users can read their own membership" on public.memberships for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------- Payments (CheqPay payment requests) ----------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  cheqpay_request_id text not null unique,
  amount_kobo bigint not null check (amount_kobo > 0),
  amount_paid_kobo bigint not null default 0,
  account_number text not null,
  bank_name text not null,
  account_name text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired')),
  expires_at timestamptz not null,
  paid_at timestamptz,
  livemode boolean not null default false,
  created_at timestamptz not null default now()
);
create index payments_user_idx on public.payments (user_id, created_at desc);
alter table public.payments enable row level security;
create policy "Users can read their own payments" on public.payments for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------- Helpers ----------
create or replace function private.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.memberships where user_id = uid), false);
$$;


-- Adds Pro time: from now, or from the end of the current Pro period if it hasn't ended.
create or replace function private.extend_pro(uid uuid, days int)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare result timestamptz;
begin
  insert into public.memberships (user_id) values (uid) on conflict do nothing;
  update public.memberships
    set pro_until = greatest(coalesce(pro_until, now()), now()) + make_interval(days => days), updated_at = now()
    where user_id = uid
    returning pro_until into result;
  return result;
end;
$$;

-- What the app needs to know about the signed-in user's plan.
create or replace function public.my_plan()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'is_admin', coalesce(m.is_admin, false),
    'is_pro', coalesce(m.pro_until > now(), false),
    'pro_until', m.pro_until,
    'swipes_used', coalesce(m.swipes_used, 0),
    'free_swipes', s.free_swipes,
    'free_trial_days', s.free_trial_days,
    'trial_ends_at', case when s.free_trial_days > 0 then p.created_at + make_interval(days => s.free_trial_days) end,
    'in_trial', s.free_trial_days > 0 and now() < p.created_at + make_interval(days => s.free_trial_days),
    'price_naira', s.pro_price_naira,
    'pro_days', s.pro_days
  )
  from public.profiles p
  cross join public.app_settings s
  left join public.memberships m on m.user_id = p.id
  where p.id = auth.uid();
$$;

-- ---------- Swiping now respects the free allowance ----------
create or replace function public.swipe(target uuid, swipe_kind text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  match_id uuid;
  plan json;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if target = me then raise exception 'You can’t swipe on yourself'; end if;
  if swipe_kind not in ('like', 'super', 'pass') then raise exception 'Unknown swipe'; end if;
  if not exists (select 1 from public.profiles where id = target and onboarded) then
    raise exception 'Profile not found';
  end if;

  -- Pro members and people in their free trial swipe freely; everyone else gets the free swipes.
  plan := public.my_plan();
  if not (plan->>'is_pro')::boolean and not (plan->>'in_trial')::boolean then
    if (plan->>'swipes_used')::int >= (plan->>'free_swipes')::int then
      raise exception 'swipe_limit' using hint = 'Upgrade to alignment Pro to keep swiping.';
    end if;
    if swipe_kind = 'super' then
      raise exception 'pro_only' using hint = 'Super likes are part of alignment Pro.';
    end if;
  end if;

  insert into public.memberships (user_id, swipes_used) values (me, 1)
  on conflict (user_id) do update set swipes_used = public.memberships.swipes_used + 1, updated_at = now();

  insert into public.swipes (swiper_id, target_id, kind) values (me, target, swipe_kind)
  on conflict (swiper_id, target_id) do update set kind = excluded.kind, created_at = now();

  if swipe_kind = 'super' then perform private.notify(target, me, 'super'); end if;

  if swipe_kind <> 'pass' and exists (
    select 1 from public.swipes where swiper_id = target and target_id = me and kind <> 'pass'
  ) then
    insert into public.matches (user_a, user_b) values (least(me, target), greatest(me, target))
    on conflict (user_a, user_b) do nothing
    returning id into match_id;
    if match_id is not null then
      perform private.notify(target, me, 'match');
      perform private.notify(me, target, 'match');
    else
      select id into match_id from public.matches
      where user_a = least(me, target) and user_b = greatest(me, target) and closed_at is null;
    end if;
  end if;
  return match_id;
end;
$$;

-- ---------- Admin tools ----------
-- Give (or with negative days, take away) Pro time by username.
create or replace function public.admin_grant_pro(username text, days int)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare uid uuid; result timestamptz;
begin
  if not private.is_admin(auth.uid()) then raise exception 'Admins only'; end if;
  select id into uid from public.profiles p where p.username = admin_grant_pro.username;
  if uid is null then raise exception 'No one has that username'; end if;
  if days >= 0 then
    result := private.extend_pro(uid, days);
  else
    update public.memberships set pro_until = pro_until + make_interval(days => days), updated_at = now()
      where user_id = uid returning pro_until into result;
  end if;
  return result;
end;
$$;

-- Change the free allowance and the Pro price.
create or replace function public.admin_update_settings(free_swipes int, free_trial_days int, pro_price_naira int, pro_days int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin(auth.uid()) then raise exception 'Admins only'; end if;
  update public.app_settings set
    free_swipes = admin_update_settings.free_swipes,
    free_trial_days = admin_update_settings.free_trial_days,
    pro_price_naira = admin_update_settings.pro_price_naira,
    pro_days = admin_update_settings.pro_days,
    updated_at = now()
  where id;
end;
$$;

-- ---------- Called by the server when CheqPay says a payment request was paid ----------
-- Idempotent: a request is only counted once. Whole Pro periods are added for what was paid;
-- any remainder is kept as credit towards the next period.
create or replace function public.record_cheqpay_payment(request_id text, paid_kobo bigint)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  pay public.payments;
  price_kobo bigint;
  period int;
  total bigint;
  periods int;
  result timestamptz;
begin
  select * into pay from public.payments where cheqpay_request_id = request_id for update;
  if pay.id is null then raise exception 'Unknown payment request'; end if;
  if pay.status = 'paid' then
    return (select pro_until from public.memberships where user_id = pay.user_id);
  end if;

  update public.payments set status = 'paid', amount_paid_kobo = paid_kobo, paid_at = now() where id = pay.id;

  select pro_price_naira::bigint * 100, pro_days into price_kobo, period from public.app_settings;
  insert into public.memberships (user_id) values (pay.user_id) on conflict do nothing;
  select credit_kobo + paid_kobo into total from public.memberships where user_id = pay.user_id;
  periods := (total / price_kobo)::int;
  update public.memberships set credit_kobo = total - periods::bigint * price_kobo, updated_at = now()
    where user_id = pay.user_id;
  if periods > 0 then
    result := private.extend_pro(pay.user_id, periods * period);
  else
    select pro_until into result from public.memberships where user_id = pay.user_id;
  end if;
  return result;
end;
$$;

revoke execute on function public.my_plan(), public.admin_grant_pro(text, int), public.admin_update_settings(int, int, int, int) from public, anon;
grant execute on function public.my_plan(), public.admin_grant_pro(text, int), public.admin_update_settings(int, int, int, int) to authenticated;
revoke execute on function public.record_cheqpay_payment(text, bigint) from public, anon, authenticated;
grant execute on function public.record_cheqpay_payment(text, bigint) to service_role;
revoke execute on function private.is_admin(uuid), private.extend_pro(uuid, int) from public, anon, authenticated;

-- Make yourself an admin (replace the username), then use Settings → Admin in the app:
--   insert into public.memberships (user_id, is_admin)
--   select id, true from public.profiles where username = 'your_username'
--   on conflict (user_id) do update set is_admin = true;
