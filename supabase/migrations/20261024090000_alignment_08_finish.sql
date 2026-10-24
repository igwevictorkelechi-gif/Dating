-- PENDING: needs approval in Supabase (it contains a delete and permission changes).
-- Paste into the SQL Editor and click Run, or approve it when Claude applies it.

-- Permanently remove the signed-in user's account; everything linked to it cascades away.
create or replace function public.delete_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- Trigger functions don't need to be reachable through the API.
alter function public.handle_new_user() set schema private;
alter function public.sync_age() set schema private;
alter function public.on_follow() set schema private;
alter function public.on_post_like() set schema private;
alter function public.on_comment() set schema private;

-- Only signed-in users can call the app's functions.
revoke execute on function public.swipe(uuid, text), public.close_match(uuid, boolean, text),
  public.is_open_match_member(uuid), public.delete_account(),
  public.discover(text, int, int, int), public.search_people(text, int),
  public.suggested_people(int), public.profile_counts(uuid)
  from public, anon;
grant execute on function public.swipe(uuid, text), public.close_match(uuid, boolean, text),
  public.is_open_match_member(uuid), public.delete_account(),
  public.discover(text, int, int, int), public.search_people(text, int),
  public.suggested_people(int), public.profile_counts(uuid)
  to authenticated;
