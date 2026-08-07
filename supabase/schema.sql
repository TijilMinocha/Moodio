-- Moodio schema
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).

-- ---------------------------------------------------------------- content

create table if not exists artists (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  image_url  text,
  created_at timestamptz not null default now()
);

create table if not exists albums (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  description text,
  cover_path  text,
  artist_id   uuid references artists(id) on delete set null,
  year        int,
  created_at  timestamptz not null default now()
);

-- status/hls_path/waveform_peaks/energy/brightness/tempo are filled in on
-- later days (waveforms, mood engine, HLS). Declared now so we never migrate.
create table if not exists songs (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  album_id       uuid not null references albums(id) on delete cascade,
  artist_id      uuid references artists(id) on delete set null,
  duration_sec   numeric,
  storage_path   text not null,
  hls_path       text,
  status         text not null default 'ready'
                 check (status in ('pending', 'processing', 'ready', 'failed')),
  waveform_peaks jsonb,
  energy         real,
  brightness     real,
  tempo          real,
  content_hash   text,
  created_at     timestamptz not null default now(),
  unique (album_id, title)
);

create index if not exists songs_album_id_idx  on songs (album_id);
create index if not exists songs_artist_id_idx on songs (artist_id);
create index if not exists albums_artist_id_idx on albums (artist_id);

-- ------------------------------------------------------------------ users

create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create table if not exists playlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  is_public   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- `position` uses gaps of 1000 so a drag-and-drop reorder is a single UPDATE
-- (drop between 1000 and 2000 -> 1500) instead of rewriting every row.
create table if not exists playlist_songs (
  playlist_id uuid not null references playlists(id) on delete cascade,
  song_id     uuid not null references songs(id) on delete cascade,
  position    double precision not null,
  added_at    timestamptz not null default now(),
  primary key (playlist_id, song_id)
);

create index if not exists playlist_songs_order_idx
  on playlist_songs (playlist_id, position);

create table if not exists liked_songs (
  user_id  uuid not null references auth.users(id) on delete cascade,
  song_id  uuid not null references songs(id) on delete cascade,
  liked_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create index if not exists playlists_user_id_idx on playlists (user_id);

-- -------------------------------------------------------------------- RLS
-- The browser never talks to Supabase directly -- every read and write goes
-- through our own API routes using the service key, which bypasses RLS.
-- These policies are a second line of defence: if a key ever leaked, the
-- database itself still refuses to hand one user another user's playlists.

alter table artists        enable row level security;
alter table albums         enable row level security;
alter table songs          enable row level security;
alter table profiles       enable row level security;
alter table playlists      enable row level security;
alter table playlist_songs enable row level security;
alter table liked_songs    enable row level security;

-- Catalogue is world-readable, writable only by the service key.
drop policy if exists "catalogue is public" on artists;
drop policy if exists "catalogue is public" on albums;
drop policy if exists "catalogue is public" on songs;
create policy "catalogue is public" on artists for select using (true);
create policy "catalogue is public" on albums  for select using (true);
create policy "catalogue is public" on songs   for select using (true);

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own or public playlists" on playlists;
create policy "own or public playlists" on playlists
  for select using (auth.uid() = user_id or is_public);

drop policy if exists "write own playlists" on playlists;
create policy "write own playlists" on playlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "playlist songs follow playlist" on playlist_songs;
create policy "playlist songs follow playlist" on playlist_songs
  for all using (
    exists (
      select 1 from playlists p
      where p.id = playlist_songs.playlist_id
        and (p.user_id = auth.uid() or p.is_public)
    )
  )
  with check (
    exists (
      select 1 from playlists p
      where p.id = playlist_songs.playlist_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "own likes" on liked_songs;
create policy "own likes" on liked_songs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------- storage
-- Two buckets:
--   audio  - private. Served only via short-lived signed URLs from our API.
--   covers - public. Album art is not sensitive and benefits from CDN caching.

insert into storage.buckets (id, name, public)
values ('audio', 'audio', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;
