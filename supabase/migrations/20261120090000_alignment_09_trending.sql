-- Trending feed, trending topics/keywords, and keyword flagging.

-- ---------- Topics: #hashtags in a post ----------
create or replace function public.extract_tags(body text)
returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array(
    select distinct lower(m[1]) from regexp_matches(coalesce(body, ''), '#([A-Za-z0-9_]{2,40})', 'g') as m
  ), '{}');
$$;

alter table public.posts add column tags text[] generated always as (public.extract_tags(body)) stored;
create index posts_tags_idx on public.posts using gin (tags);

-- ---------- Keyword flags ----------
-- Managed from the Supabase dashboard (Table Editor → flagged_keywords). The app can't read or change it.
create table public.flagged_keywords (
  keyword extensions.citext primary key check (char_length(keyword) between 2 and 60),
  reason text not null default 'Sensitive content' check (char_length(reason) <= 80),
  created_at timestamptz not null default now()
);
alter table public.flagged_keywords enable row level security;

alter table public.posts
  add column flagged boolean not null default false,
  add column flag_reason text;

-- The reason of the first keyword found in the text (whole words or phrases, any case), or null.
create or replace function private.flag_reason_for(body text)
returns text language sql stable security definer set search_path = '' as $$
  select k.reason
  from public.flagged_keywords k
  where coalesce(body, '') ~* ('\m' || regexp_replace(k.keyword::text, '([.^$*+?()\[\]{}|\\-])', '\\\1', 'g') || '\M')
  order by char_length(k.keyword) desc
  limit 1;
$$;

-- Flag posts as they are written (users can't set these columns themselves).
create or replace function private.flag_post()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.flag_reason := private.flag_reason_for(new.body);
  new.flagged := new.flag_reason is not null;
  return new;
end;
$$;
create trigger flag_post before insert or update of body on public.posts
  for each row execute function private.flag_post();

-- Re-check every post when the keyword list changes.
create or replace function private.reflag_posts()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.posts p set flag_reason = f.reason, flagged = f.reason is not null
  from (select id, private.flag_reason_for(body) as reason from public.posts) f
  where f.id = p.id and p.flag_reason is distinct from f.reason;
  return null;
end;
$$;
create trigger reflag_posts after insert or update or delete or truncate on public.flagged_keywords
  for each statement execute function private.reflag_posts();

-- A starting list aimed at common dating-app scams. Add, change or remove rows in the dashboard.
insert into public.flagged_keywords (keyword, reason) values
  ('cashapp', 'Possible scam'),
  ('western union', 'Possible scam'),
  ('gift card', 'Possible scam'),
  ('crypto investment', 'Possible scam'),
  ('wire transfer', 'Possible scam')
on conflict do nothing;

-- ---------- Trending ----------
-- Engagement (likes + 2 × comments + 1) divided by (hours old + 2)^1.5, so new posts with
-- quick engagement rise and older ones fade. Flagged posts never trend.
-- `topic` filters to a hashtag ('#travel') or a keyword ('travel').
create or replace function public.trending_posts(lim int default 50, topic text default null)
returns setof public.posts language sql stable set search_path = '' as $$
  select p.*
  from public.posts p
  cross join lateral (
    select (select count(*) from public.post_likes l where l.post_id = p.id)
         + 2 * (select count(*) from public.comments c where c.post_id = p.id) + 1 as engagement
  ) e
  where not p.flagged
    and (
      topic is null or topic = ''
      or (left(topic, 1) = '#' and lower(substr(topic, 2)) = any (p.tags))
      or (left(topic, 1) <> '#' and p.body ~* ('\m' || regexp_replace(topic, '[^A-Za-z0-9_]', '', 'g') || '\M'))
    )
  order by e.engagement / power(extract(epoch from now() - p.created_at) / 3600 + 2, 1.5) desc, p.created_at desc
  limit least(greatest(coalesce(lim, 50), 1), 100);
$$;

-- Hashtags and keywords trending over the last 7 days, weighted the same way.
-- A keyword needs at least 2 posts; common words are skipped.
create or replace function public.trending_topics(lim int default 10)
returns table (topic text, kind text, posts bigint, score numeric)
language sql stable set search_path = '' as $$
  with recent as (
    select p.id, p.body, p.tags,
      ((select count(*) from public.post_likes l where l.post_id = p.id)
        + 2 * (select count(*) from public.comments c where c.post_id = p.id) + 1)
        / power(extract(epoch from now() - p.created_at) / 3600 + 2, 1.5) as weight
    from public.posts p
    where not p.flagged and p.created_at > now() - interval '7 days'
  ),
  terms as (
    select '#' || t as topic, 'tag' as kind, r.id, r.weight
    from recent r cross join lateral unnest(r.tags) as t
    union all
    select w.word, 'keyword', r.id, r.weight
    from recent r
    cross join lateral (
      select distinct lower(m[1]) as word from regexp_matches(r.body, '\m([A-Za-z]{4,30})\M', 'g') as m
    ) w
    where w.word <> all (r.tags)
      and w.word <> all (array[
        'about','after','again','also','always','anyone','anything','back','because','been','before','being','came',
        'come','could','didn','does','doesn','doing','done','dont','even','every','from','going','gonna','good','have',
        'here','into','just','know','like','look','made','make','many','more','most','much','need','never','only',
        'other','over','people','really','said','same','should','some','something','still','such','sure','take','than',
        'that','their','them','then','there','these','they','thing','things','think','this','those','time','today',
        'very','want','wanna','well','were','what','when','where','which','while','will','with','would','yeah','your',
        'youre','thats','cant','wont','isnt'])
  )
  select t.topic, t.kind, count(distinct t.id) as posts, round(sum(t.weight)::numeric, 4) as score
  from terms t
  group by t.topic, t.kind
  having count(distinct t.id) >= (case when t.kind = 'tag' then 1 else 2 end)
  order by sum(t.weight) desc, count(distinct t.id) desc
  limit least(greatest(coalesce(lim, 10), 1), 30);
$$;

revoke execute on function public.trending_posts(int, text), public.trending_topics(int) from public, anon;
grant execute on function public.trending_posts(int, text), public.trending_topics(int) to authenticated;
revoke execute on function private.flag_reason_for(text) from public, anon, authenticated;
