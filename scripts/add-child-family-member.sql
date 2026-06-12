create extension if not exists pgcrypto;

-- Parent-managed child profiles do not have auth.users rows. These identity
-- columns must allow both real auth user ids and local child profile ids.
do $$
declare
  constraint_name text;
begin
  select tc.constraint_name
  into constraint_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
    and tc.table_schema = kcu.table_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
    and ccu.table_schema = tc.table_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
    and tc.table_name = 'profiles'
    and kcu.column_name = 'id'
    and ccu.table_schema = 'auth'
    and ccu.table_name = 'users'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end if;

  select tc.constraint_name
  into constraint_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
    and tc.table_schema = kcu.table_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
    and ccu.table_schema = tc.table_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
    and tc.table_name = 'family_members'
    and kcu.column_name = 'user_id'
    and ccu.table_schema = 'auth'
    and ccu.table_name = 'users'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.family_members drop constraint %I', constraint_name);
  end if;

  select tc.constraint_name
  into constraint_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
    and tc.table_schema = kcu.table_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
    and ccu.table_schema = tc.table_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
    and tc.table_name = 'event_participants'
    and kcu.column_name = 'user_id'
    and ccu.table_schema = 'auth'
    and ccu.table_name = 'users'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.event_participants drop constraint %I', constraint_name);
  end if;
end;
$$;

create or replace function public.add_child_family_member(
  child_name text,
  child_color text default '#6C5CE7'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_family_id uuid;
  child_id uuid := gen_random_uuid();
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  if nullif(trim(child_name), '') is null then
    raise exception 'Child name is required';
  end if;

  select family_id
  into current_family_id
  from public.family_members
  where user_id = auth.uid()
  limit 1;

  if current_family_id is null then
    raise exception 'No family found';
  end if;

  insert into public.profiles (
    id,
    name,
    phone,
    role_label,
    avatar_color
  )
  values (
    child_id,
    trim(child_name),
    null,
    'Child',
    coalesce(nullif(trim(child_color), ''), '#6C5CE7')
  );

  insert into public.family_members (
    family_id,
    user_id,
    role
  )
  values (
    current_family_id,
    child_id,
    'child'
  );

  return child_id;
end;
$$;

grant execute on function public.add_child_family_member(text, text) to authenticated;

notify pgrst, 'reload schema';
