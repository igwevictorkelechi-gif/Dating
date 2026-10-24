-- alignment: initial schema
-- Profiles, follows, posts, likes, comments, swipes, matches, chat, reports, notifications,
-- media storage and the functions the app calls. Every table has row level security.

create extension if not exists citext with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext unique check (username ~ '^[A-Za-z0-9_.]{3,30}$'),
  first_name text not null default '' check (char_length(first_name) <= 50),
  last_name text not null default '' check (char_length(last_name) <= 50),
  bio text not null default '' check (char_length(bio) <= 150),
  gender text check (gender in ('Male', 'Female', 'Other')),
  age int check (age >= 18), -- kept in sync from profile_private.dob; birthdays stay private
  interested_in text check (interested_in in ('Men', 'Women', 'Both')),
  orientation text check (orientation in ('Straight', 'Gay', 'Lesbian', 'Pan-sexual', 'Bi-sexual', 'Asexual')),
  spiritual text check (spiritual in ('Spiritualist', 'Traditionalist', 'Agnostic', 'Atheist')),
  political text check (political in ('Conservative', 'A-political', 'Moderate', 'Liberal')),
  causes text[] not null default '{}' check (cardinality(causes) <= 10),
  smoke text check (smoke in ('Yes', 'No', 'Sometimes')),
  drink text check (drink in ('Yes', 'No', 'Sometimes')),
  hobbies text[] not null default '{}' check (cardinality(hobbies) <= 20),
  location text not null default '' check (char_length(location) <= 80),
  job text not null default '' check (char_length(job) <= 80),
  looking_for text check (looking_for in ('Long-term relationship', 'Something casual', 'New friends', 'Still figuring it out')),
  avatar_url text,
  photos text[] not null default '{}' check (cardinality(photos) <= 6),
  audio_url text,
  hue int not null default floor(random() * 360)::int,
  is_creator boolean not null default false,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Date of birth is only visible to its owner; everyone else sees `profiles.age`.
create table public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  dob date not null check (dob > date '1900-01-01')
);

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;

create policy "Signed-in users can see finished profiles and their own"
  on public.profiles for select to authenticated
  using (onboarded or id = (select auth.uid()));

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Only these columns are editable by users (not age, hue, is_creator, timestamps).
revoke update on public.profiles from authenticated, anon;
grant update (username, first_name, last_name, bio, gender, interested_in, orientation, spiritual, political,
  causes, smoke, drink, hobbies, location, job, looking_for, avatar_url, photos, audio_url, onboarded)
  on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated, anon;

create policy "Users can read their own birthday"
  on public.profile_private for select to authenticated using (id = (select auth.uid()));
create policy "Users can add their own birthday"
  on public.profile_private for insert to authenticated with check (id = (select auth.uid()));
create policy "Users can change their own birthday"
  on public.profile_private for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create function public.age_from_dob(dob date)
returns int language sql stable set search_path = '' as $$
  select extract(year from age(current_date, dob))::int
$$;

-- Validate the birthday (18+) and copy the age onto the public profile.
create function public.sync_age()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.age_from_dob(new.dob) < 18 then
    raise exception 'You must be 18 or older to use alignment' using errcode = 'check_violation';
  end if;
  update public.profiles set age = public.age_from_dob(new.dob) where id = new.id;
  return new;
end;
$$;
create trigger profile_private_sync_age
  after insert or update of dob on public.profile_private
  for each row execute function public.sync_age();

-- Ages roll over on birthdays; refresh them once a day.
select cron.schedule('alignment-refresh-ages', '15 0 * * *', $$
  update public.profiles p set age = public.age_from_dob(pp.dob)
  from public.profile_private pp
  where pp.id = p.id and p.age is distinct from public.age_from_dob(pp.dob)
$$);

create function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Every new auth user gets an (empty) profile.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Social: follows, posts, likes, comments
-- ---------------------------------------------------------------------------

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows (followee_id);
alter table public.follows enable row level security;
create policy "Signed-in users can see follows" on public.follows for select to authenticated using (true);
create policy "Users can follow as themselves" on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()));
create policy "Users can unfollow as themselves" on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()));

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('note', 'text')),
  body text not null default '' check (char_length(body) <= 2000),
  images text[] not null default '{}' check (cardinality(images) <= 4),
  video_url text,
  created_at timestamptz not null default now(),
  check (body <> '' or cardinality(images) > 0 or video_url is not null)
);
create index posts_author_idx on public.posts (author_id, created_at desc);
create index posts_created_idx on public.posts (created_at desc);
alter table public.posts enable row level security;
create policy "Signed-in users can read posts" on public.posts for select to authenticated using (true);
create policy "Users can post as themselves" on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()));
create policy "Users can delete their own posts" on public.posts for delete to authenticated
  using (author_id = (select auth.uid()));

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_likes_user_idx on public.post_likes (user_id);
alter table public.post_likes enable row level security;
create policy "Signed-in users can see likes" on public.post_likes for select to authenticated using (true);
create policy "Users can like as themselves" on public.post_likes for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Users can unlike as themselves" on public.post_likes for delete to authenticated
  using (user_id = (select auth.uid()));

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);
create index comments_author_idx on public.comments (author_id);
alter table public.comments enable row level security;
create policy "Signed-in users can read comments" on public.comments for select to authenticated using (true);
create policy "Users can comment as themselves" on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()));
create policy "Users can delete their own comments" on public.comments for delete to authenticated
  using (author_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Dating: swipes, matches, messages, reports
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Notifications (written by triggers)
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('follow', 'like', 'comment', 'match', 'super')),
  post_id uuid references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_actor_idx on public.notifications (actor_id);
create index notifications_post_idx on public.notifications (post_id);
alter table public.notifications enable row level security;
create policy "Users can read their notifications" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users can mark their notifications read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on public.notifications from authenticated, anon;
grant update (read_at) on public.notifications to authenticated;

create function public.notify(recipient uuid, actor uuid, kind text, post uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if recipient is null or recipient = actor then return; end if;
  insert into public.notifications (user_id, actor_id, type, post_id) values (recipient, actor, kind, post);
end;
$$;
revoke execute on function public.notify(uuid, uuid, text, uuid) from public, anon, authenticated;

create function public.on_follow() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify(new.followee_id, new.follower_id, 'follow');
  return new;
end;
$$;
create trigger follows_notify after insert on public.follows for each row execute function public.on_follow();

create function public.on_post_like() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify((select author_id from public.posts where id = new.post_id), new.user_id, 'like', new.post_id);
  return new;
end;
$$;
create trigger post_likes_notify after insert on public.post_likes for each row execute function public.on_post_like();

create function public.on_comment() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify((select author_id from public.posts where id = new.post_id), new.author_id, 'comment', new.post_id);
  return new;
end;
$$;
create trigger comments_notify after insert on public.comments for each row execute function public.on_comment();

-- ---------------------------------------------------------------------------
-- Functions the app calls (RPC)
-- ---------------------------------------------------------------------------

-- Record a like / super like / pass. Returns the match id when it's mutual.
create function public.swipe(target uuid, swipe_kind text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  match_id uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if target = me then raise exception 'You can’t swipe on yourself'; end if;
  if swipe_kind not in ('like', 'super', 'pass') then raise exception 'Unknown swipe'; end if;
  if not exists (select 1 from public.profiles where id = target and onboarded) then
    raise exception 'Profile not found';
  end if;

  insert into public.swipes (swiper_id, target_id, kind) values (me, target, swipe_kind)
  on conflict (swiper_id, target_id) do update set kind = excluded.kind, created_at = now();

  if swipe_kind = 'super' then perform public.notify(target, me, 'super'); end if;

  if swipe_kind <> 'pass' and exists (
    select 1 from public.swipes where swiper_id = target and target_id = me and kind <> 'pass'
  ) then
    insert into public.matches (user_a, user_b) values (least(me, target), greatest(me, target))
    on conflict (user_a, user_b) do nothing
    returning id into match_id;
    if match_id is not null then
      perform public.notify(target, me, 'match');
      perform public.notify(me, target, 'match');
    else
      select id into match_id from public.matches
      where user_a = least(me, target) and user_b = greatest(me, target) and closed_at is null;
    end if;
  end if;
  return match_id;
end;
$$;

-- Close (and optionally report) a chat.
create function public.close_match(m uuid, report boolean default false, reason text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  other uuid;
begin
  select case when user_a = me then user_b else user_a end into other
  from public.matches where id = m and me in (user_a, user_b);
  if other is null then raise exception 'Chat not found'; end if;
  update public.matches set closed_at = coalesce(closed_at, now()), closed_by = coalesce(closed_by, me) where id = m;
  if report then
    insert into public.reports (reporter_id, reported_id, match_id, reason) values (me, other, m, left(coalesce(reason, ''), 500));
  end if;
end;
$$;

-- People to swipe on: finished profiles you haven't swiped on or matched with, filtered by gender and age.
create function public.discover(seeking text default 'Both', min_age int default 18, max_age int default 99, lim int default 30)
returns setof public.profiles language sql stable security invoker set search_path = '' as $$
  select p.* from public.profiles p
  where p.onboarded
    and p.id <> (select auth.uid())
    and (seeking = 'Both'
      or (seeking = 'Men' and p.gender = 'Male')
      or (seeking = 'Women' and p.gender = 'Female'))
    and coalesce(p.age, 0) between min_age and max_age
    and not exists (select 1 from public.swipes s where s.swiper_id = (select auth.uid()) and s.target_id = p.id)
    and not exists (select 1 from public.matches m
      where (m.user_a = p.id and m.user_b = (select auth.uid())) or (m.user_b = p.id and m.user_a = (select auth.uid())))
  order by p.created_at desc
  limit least(lim, 100)
$$;

-- Search people by name or username.
create function public.search_people(q text, lim int default 10)
returns setof public.profiles language sql stable security invoker set search_path = '' as $$
  select p.* from public.profiles p
  where p.onboarded and p.id <> (select auth.uid())
    and char_length(trim(q)) >= 1
    and (p.username::text ilike ('%' || trim(q) || '%')
      or (p.first_name || ' ' || p.last_name) ilike ('%' || trim(q) || '%'))
  order by p.is_creator desc, p.created_at
  limit least(lim, 25)
$$;

-- Suggestions for the "follow five creators" step: creators first, then the most-followed people.
create function public.suggested_people(lim int default 8)
returns setof public.profiles language sql stable security invoker set search_path = '' as $$
  select p.* from public.profiles p
  left join lateral (select count(*) as n from public.follows f where f.followee_id = p.id) c on true
  where p.onboarded and p.id <> (select auth.uid())
    and not exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = p.id)
  order by p.is_creator desc, c.n desc, p.created_at
  limit least(lim, 25)
$$;

-- Follower, following and post counts for one profile.
create function public.profile_counts(uid uuid)
returns table (followers bigint, following bigint, posts bigint)
language sql stable security invoker set search_path = '' as $$
  select
    (select count(*) from public.follows where followee_id = uid),
    (select count(*) from public.follows where follower_id = uid),
    (select count(*) from public.posts where author_id = uid)
$$;

-- Permanently delete the signed-in user's account and everything linked to it.
create function public.delete_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- Only signed-in users may call the app's functions.
revoke execute on function public.swipe(uuid, text), public.close_match(uuid, boolean, text),
  public.discover(text, int, int, int), public.search_people(text, int), public.suggested_people(int),
  public.profile_counts(uuid), public.delete_account(), public.is_open_match_member(uuid)
  from public, anon;
grant execute on function public.swipe(uuid, text), public.close_match(uuid, boolean, text),
  public.discover(text, int, int, int), public.search_people(text, int), public.suggested_people(int),
  public.profile_counts(uuid), public.delete_account(), public.is_open_match_member(uuid)
  to authenticated;
revoke execute on function public.handle_new_user(), public.sync_age(), public.on_follow(),
  public.on_post_like(), public.on_comment() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: live chat, new matches and notifications
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.messages, public.matches, public.notifications;

-- ---------------------------------------------------------------------------
-- Storage: one public bucket; each user writes only inside their own folder
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac',
  'video/mp4', 'video/webm', 'video/quicktime'
])
on conflict (id) do nothing;

create policy "Users upload into their own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users see files in their own folder" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users replace files in their own folder" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users delete files in their own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
