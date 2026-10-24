-- Internal helpers live in a schema the API doesn't expose, so the app can't call them directly.
create schema if not exists private;
alter function public.notify(uuid, uuid, text, uuid) set schema private;

create or replace function public.on_follow() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify(new.followee_id, new.follower_id, 'follow');
  return new;
end;
$$;

create or replace function public.on_post_like() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify((select author_id from public.posts where id = new.post_id), new.user_id, 'like', new.post_id);
  return new;
end;
$$;

create or replace function public.on_comment() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify((select author_id from public.posts where id = new.post_id), new.author_id, 'comment', new.post_id);
  return new;
end;
$$;

create or replace function public.swipe(target uuid, swipe_kind text)
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

-- Users can edit their profile, but not their computed age, colour, creator badge, id or join date.
create function public.protect_profile_columns() returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.id := old.id;
    new.age := old.age;
    new.hue := old.hue;
    new.is_creator := old.is_creator;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Users can only mark notifications as read; everything else stays as written.
create function public.protect_notification_columns() returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.id := old.id;
    new.user_id := old.user_id;
    new.actor_id := old.actor_id;
    new.type := old.type;
    new.post_id := old.post_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;
create trigger notifications_protect before update on public.notifications
  for each row execute function public.protect_notification_columns();
