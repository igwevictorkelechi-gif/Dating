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
