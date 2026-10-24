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
select cron.schedule('alignment-refresh-ages', '15 0 * * *', $cron$
  update public.profiles p set age = public.age_from_dob(pp.dob)
  from public.profile_private pp
  where pp.id = p.id and p.age is distinct from public.age_from_dob(pp.dob)
$cron$);

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
