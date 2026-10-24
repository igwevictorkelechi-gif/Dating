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
