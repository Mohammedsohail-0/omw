-- ==========================================
-- Supabase Schema for Location Sharing App
-- Run this script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Run
-- ==========================================

-- 1. USERS TABLE
create table if not exists public.users (
  id uuid references auth.users not null primary key,
  name text,
  email text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.users enable row level security;

create policy "Allow public read access to users" on public.users
  for select using (true);

create policy "Users can insert their own profile" on public.users
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile" on public.users
  for update using (auth.uid() = id);

-- 2. CONTACTS TABLE
create table if not exists public.contacts (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.users(id) on delete cascade not null,
  contact_email text not null,
  nickname text not null,
  contact_user_id uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.contacts enable row level security;

create policy "Users can read own contacts" on public.contacts
  for select using (auth.uid() = owner_id);

create policy "Users can manage own contacts" on public.contacts
  for all using (auth.uid() = owner_id);

-- 3. TRIPS TABLE
create table if not exists public.trips (
  id uuid default gen_random_uuid() primary key,
  starter_id uuid references public.users(id) on delete cascade not null,
  target_contact_id uuid references public.contacts(id) on delete cascade not null,
  status text not null check (status in ('active', 'ended')),
  start_time timestamp with time zone default timezone('utc'::text, now()) not null,
  end_time timestamp with time zone,
  end_reason text check (end_reason in ('proximity', 'manual', 'timeout')),
  predicted_eta timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.trips enable row level security;

create policy "Trip participants can view trip" on public.trips
  for select using (
    auth.uid() = starter_id or
    auth.uid() in (
      select contact_user_id from public.contacts where id = target_contact_id
    )
  );

create policy "Starter can insert trip" on public.trips
  for insert with check (auth.uid() = starter_id);

create policy "Trip participants can update trip" on public.trips
  for update using (
    auth.uid() = starter_id or
    auth.uid() in (
      select contact_user_id from public.contacts where id = target_contact_id
    )
  );

-- 4. LOCATION PINGS TABLE
create table if not exists public.location_pings (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  lat double precision not null,
  lng double precision not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.location_pings enable row level security;

create policy "Trip participants can view location pings" on public.location_pings
  for select using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id
      and (
        t.starter_id = auth.uid() or
        t.target_contact_id in (select id from public.contacts where contact_user_id = auth.uid())
      )
    )
  );

create policy "Sender can insert location pings" on public.location_pings
  for insert with check (auth.uid() = user_id);

-- Enable Realtime for location_pings and trips
alter publication supabase_realtime add table public.location_pings;
alter publication supabase_realtime add table public.trips;

-- 5. PENDING INVITES TABLE
create table if not exists public.pending_invites (
  token text primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone not null
);

alter table public.pending_invites enable row level security;

create policy "Allow read pending_invites" on public.pending_invites
  for select using (true);

create policy "Trip starter can manage pending_invites" on public.pending_invites
  for all using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.starter_id = auth.uid()
    )
  );
