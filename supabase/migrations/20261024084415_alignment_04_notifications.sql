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

create function public.notify(recipient uuid, actor uuid, kind text, post uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if recipient is null or recipient = actor then return; end if;
  insert into public.notifications (user_id, actor_id, type, post_id) values (recipient, actor, kind, post);
end;
$$;

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
