create table public.swipes (
  swiper_id uuid not null references public.profiles (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('like', 'super', 'pass')),
  created_at timestamptz not null default now(),
  primary key (swiper_id, target_id),
  check (swiper_id <> target_id)
);
create index swipes_target_idx on public.swipes (target_id);
alter table public.swipes enable row level security;
-- You only ever see your own swipes. Writes go through public.swipe().
create policy "Users can see their own swipes" on public.swipes for select to authenticated
  using (swiper_id = (select auth.uid()));
create policy "Users can clear their own passes" on public.swipes for delete to authenticated
  using (swiper_id = (select auth.uid()) and kind = 'pass');

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references public.profiles (id) on delete set null,
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index matches_user_b_idx on public.matches (user_b);
create index matches_closed_by_idx on public.matches (closed_by);
alter table public.matches enable row level security;
create policy "Users can see their own matches" on public.matches for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 2000),
  image_url text,
  created_at timestamptz not null default now(),
  check (body <> '' or image_url is not null)
);
create index messages_match_idx on public.messages (match_id, created_at);
create index messages_sender_idx on public.messages (sender_id);
alter table public.messages enable row level security;

create function public.is_open_match_member(m uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.matches
    where id = m and closed_at is null and (select auth.uid()) in (user_a, user_b)
  )
$$;

create policy "Match members can read their chat" on public.messages for select to authenticated
  using (exists (
    select 1 from public.matches mt
    where mt.id = match_id and (select auth.uid()) in (mt.user_a, mt.user_b)
  ));
create policy "Match members can write to an open chat" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_open_match_member(match_id));

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  match_id uuid references public.matches (id) on delete set null,
  reason text not null default '' check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);
create index reports_reporter_idx on public.reports (reporter_id);
create index reports_reported_idx on public.reports (reported_id);
create index reports_match_idx on public.reports (match_id);
alter table public.reports enable row level security;
-- Reports are written through public.close_match(); nobody can read them from the app.
