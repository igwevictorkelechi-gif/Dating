-- Zodiac sign on the dating profile, and a zodiac filter in Discover.

-- The sign for a birthday (tropical zodiac, Western dates).
create or replace function private.zodiac_for(dob date)
returns text language sql immutable set search_path = '' as $$
  select case
    when dob is null then null
    when (extract(month from dob), extract(day from dob)) >= (3, 21) and (extract(month from dob), extract(day from dob)) <= (4, 19) then 'Aries'
    when (extract(month from dob), extract(day from dob)) >= (4, 20) and (extract(month from dob), extract(day from dob)) <= (5, 20) then 'Taurus'
    when (extract(month from dob), extract(day from dob)) >= (5, 21) and (extract(month from dob), extract(day from dob)) <= (6, 20) then 'Gemini'
    when (extract(month from dob), extract(day from dob)) >= (6, 21) and (extract(month from dob), extract(day from dob)) <= (7, 22) then 'Cancer'
    when (extract(month from dob), extract(day from dob)) >= (7, 23) and (extract(month from dob), extract(day from dob)) <= (8, 22) then 'Leo'
    when (extract(month from dob), extract(day from dob)) >= (8, 23) and (extract(month from dob), extract(day from dob)) <= (9, 22) then 'Virgo'
    when (extract(month from dob), extract(day from dob)) >= (9, 23) and (extract(month from dob), extract(day from dob)) <= (10, 22) then 'Libra'
    when (extract(month from dob), extract(day from dob)) >= (10, 23) and (extract(month from dob), extract(day from dob)) <= (11, 21) then 'Scorpio'
    when (extract(month from dob), extract(day from dob)) >= (11, 22) and (extract(month from dob), extract(day from dob)) <= (12, 21) then 'Sagittarius'
    when (extract(month from dob), extract(day from dob)) >= (1, 20) and (extract(month from dob), extract(day from dob)) <= (2, 18) then 'Aquarius'
    when (extract(month from dob), extract(day from dob)) >= (2, 19) and (extract(month from dob), extract(day from dob)) <= (3, 20) then 'Pisces'
    else 'Capricorn' -- 22 December to 19 January
  end;
$$;

alter table public.profiles add column zodiac text check (zodiac in (
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
));

-- Start everyone who has a birthday on file with their sign; they can confirm or change it in the app.
update public.profiles p set zodiac = private.zodiac_for(pp.dob)
from public.profile_private pp
where pp.id = p.id and p.zodiac is null;

-- Discover, now with an optional list of signs (null or empty = any sign).
drop function if exists public.discover(text, int, int, int);
create function public.discover(
  seeking text default 'Both', min_age int default 18, max_age int default 99, lim int default 30, zodiacs text[] default null
)
returns setof public.profiles language sql stable security invoker set search_path = '' as $$
  select p.* from public.profiles p
  where p.onboarded
    and p.id <> (select auth.uid())
    and (seeking = 'Both'
      or (seeking = 'Men' and p.gender = 'Male')
      or (seeking = 'Women' and p.gender = 'Female'))
    and coalesce(p.age, 0) between min_age and max_age
    and (zodiacs is null or cardinality(zodiacs) = 0 or p.zodiac = any (zodiacs))
    and not exists (select 1 from public.swipes s where s.swiper_id = (select auth.uid()) and s.target_id = p.id)
    and not exists (select 1 from public.matches m
      where (m.user_a = p.id and m.user_b = (select auth.uid())) or (m.user_b = p.id and m.user_a = (select auth.uid())))
  order by p.created_at desc
  limit least(lim, 100)
$$;

revoke execute on function public.discover(text, int, int, int, text[]) from public, anon;
grant execute on function public.discover(text, int, int, int, text[]) to authenticated;
revoke execute on function private.zodiac_for(date) from public, anon, authenticated;
