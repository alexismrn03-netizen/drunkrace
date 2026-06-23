-- ============================================================
-- DRUNKRACE — Schéma Supabase
-- Colle tout ça dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- Profiles (infos utilisateur)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  pseudo text not null default '',
  avatar text default '🐺',
  weight_kg int default 70,
  sex text default 'M',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Groups (soirées)
create table if not exists groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  join_code text unique not null,
  creator_id uuid references auth.users,
  creator_pseudo text,
  status text default 'waiting', -- waiting | active | finished
  created_at timestamptz default now()
);

-- Group members
create table if not exists group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references groups on delete cascade,
  user_id uuid references auth.users on delete cascade,
  color text default '#a855f7',
  is_creator boolean default false,
  is_sam boolean default false,
  young_driver boolean default false,
  drinks_log text[] default '{}',  -- array of drink IDs
  created_at timestamptz default now(),
  unique(group_id, user_id)
);

-- Enable RLS
alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;

-- RLS Policies: profiles
create policy "Users can view all profiles" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- RLS Policies: groups
create policy "Anyone can view groups" on groups for select using (true);
create policy "Auth users can create groups" on groups for insert with check (auth.uid() = creator_id);
create policy "Creator can update group" on groups for update using (auth.uid() = creator_id);

-- RLS Policies: group_members
create policy "Anyone can view members" on group_members for select using (true);
create policy "Auth users can join" on group_members for insert with check (auth.uid() = user_id);
create policy "Members can update own row" on group_members for update using (auth.uid() = user_id);
create policy "Creator can update all members" on group_members for update using (
  exists (select 1 from group_members where group_id = group_members.group_id and user_id = auth.uid() and is_creator = true)
);

-- Enable Realtime on group_members and groups
alter publication supabase_realtime add table group_members;
alter publication supabase_realtime add table groups;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
