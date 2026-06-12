create extension if not exists pgcrypto;

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
