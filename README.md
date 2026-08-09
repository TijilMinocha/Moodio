# Moodio

A music streaming app I built to learn how streaming actually works.

It started as a plain HTML/CSS/JS page that made an `<audio>` element and played
MP3s from a folder in the repo. That version worked, but it wasn't really a
streaming app — it was a file player with a nice UI. So I rebuilt it: Next.js,
Postgres, object storage, real HLS adaptive streaming, and a mood engine that
analyses each track's audio.

**Live:** https://moodio-livid.vercel.app

---

## What it does

- Browse albums, search songs and artists, play them
- Queue with drag-and-drop reordering
- Accounts, liked songs, your own playlists
- **Smart shuffle** — spreads the same artist apart instead of clustering them
- **Waveform seekbar** — the real waveform of the track, not a progress bar
- **Moods** — every song is analysed and sorted into Chill / Focus / Hype / Late Night
- **Adaptive streaming** — quality shifts between 96/160/320 kbps as your connection changes

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript |
| Styling | Tailwind v4 |
| Database | Postgres via Supabase |
| Auth | Supabase Auth, sessions in httpOnly cookies |
| Storage | Supabase Storage (private bucket, signed URLs) |
| Cache | Upstash Redis (optional) |
| Audio | ffmpeg for HLS, hls.js in the browser |
| Hosting | Vercel |

---

## The parts I'm actually proud of

### The shuffle was wrong, and I could prove it

Nearly everyone writes shuffle as `array.sort(() => Math.random() - 0.5)`. I did
too. It's broken — the comparator is inconsistent, so the sort can't produce a
uniform result.

I wrote a script (`npm run shuffle-bias`) that shuffles `[A,B,C,D,E]` 200,000
times with each method and counts how often each of the 120 orderings shows up:

| | naive `sort()` | Fisher-Yates |
|---|---|---|
| Most common ordering | **ABCDE — 18,795** | DACEB — 1,786 |
| Least common | 342 | 1,567 |
| Spread (max ÷ min) | **54.96×** | 1.14× |
| Chi-square (df=119) | **400,563** | 128 |

Every ordering should appear about 1,667 times. With the naive version, the most
likely outcome is *the list not being shuffled at all*, about 11× more often than
it should be.

Then there's a second problem, which is that a correct shuffle still feels wrong.
Random clustering means you hear three Arijit songs in a row and assume shuffle is
broken. Spotify rewrote theirs over this. So after Fisher-Yates I do a pass that
spreads artists apart: repeatedly take the artist with the most tracks left,
skipping whoever just played.

Measured on my library (`npm run shuffle-demo`), 27 tracks across 20 artists:

```
plain Fisher-Yates : 0.66 same-artist pairs back to back (worst run: 4)
+ artist spreading : 0.00
```

Correct and *feeling* random are two different targets.

### Waveforms: do the work once, not every time

A 4-minute MP3 is about 12 million samples per channel. Decoding that in the
browser on every play would burn CPU and bandwidth to draw a strip a few hundred
pixels wide.

So it happens once, when a song is added. Decode, split into 200 buckets, keep the
loudest sample in each, normalise, store as JSON on the row:

```
19,227,600 samples decoded  →  1,132 bytes stored   (~68,000× smaller)
```

Every playback after that gets the waveform for free. It's the same idea as a
materialised view or a denormalised counter — reads massively outnumber writes, so
push the cost to write time.

I use peak-per-bucket rather than average, because averaging flattens transients
and every song ends up looking like the same blob.

### The mood engine

The app is called Moodio, so it should probably know something about mood.

Two features, both computed at ingest from the PCM I'm already decoding for the
waveform:

- **Energy** — RMS loudness
- **Brightness** — spectral centroid, i.e. where the centre of mass of the spectrum
  sits. Bass-heavy tracks score low, tracks with lots of cymbal and air score high.

I wrote the FFT by hand (iterative radix-2 Cooley-Tukey, ~30 lines). Pulling in a
dependency for one primitive felt silly.

The moods are the four quadrants of the (energy, brightness) plane. The important
decision was **where to split**. My whole library's energy spans 0.147–0.356 and
brightness 0.080–0.161 — pick any absolute threshold and it's a number I made up,
and it breaks the moment a louder master shows up. So I split at the **median of
the library**. Four populated buckets, always, and it adapts as the library grows.

It works better than I expected:

- **Hype** → SHEIKH CHILLI, Lahore, Wakhra Swag, MUMMY NU PASAND
- **Late Night** → Kesariya, Saibo, Phir Milenge Chalte Chalte

Party tracks and ballads sorted themselves out of raw DSP, with no labels.

**Where it's honest about being wrong:** loudness isn't happiness. A sad song
played loud lands in Hype. And my tempo estimate (onset flux + autocorrelation) is
frequently half or double the real BPM, which is the classic failure mode — so I
show it as a hint and never classify on it. A real system trains on human-labelled
data. This is signal processing standing in for that, and the app says so on the
page.

### HLS, and the problem that took the longest

Originally I served whole MP3 files. That works, and range requests give you
seeking for free, but there's only one quality — take it or leave it.

Now `npm run transcode` runs ffmpeg over each track and produces three bitrate
ladders (96/160/320 kbps), each cut into ~10 second segments, plus a playlist per
ladder. The player fetches segments a few ahead instead of the whole file, times
each one, and picks the quality for the next. Bandwidth drops mid-song and it
steps down without stopping.

The hard part was **signing**. My bucket is private, and a playlist is just a list
of URLs, every one of which needs a signature. Both obvious options fail:

- **Sign at upload time** — signatures expire, so the stored playlist rots and
  playback breaks a few days later.
- **Proxy every segment through my server** — that's ~57 requests per track hitting
  Node, and I lose the CDN entirely.

What I do instead: generate the playlist per request and sign all its segments in
one batch call, with a 2 hour TTL so a link can't expire mid-track. The browser
then pulls segment bytes straight from storage's CDN. My server handles one
request per track per quality, not one per segment.

There's a fallback chain too, because things break: hls.js → native HLS (Safari) →
plain MP3. A song that's been added but not transcoded yet still plays, just
without adaptive switching.

---

## Architecture

```
Browser
  │
  ├── pages + API routes ──── Next.js on Vercel
  │                             │
  │                             ├── Redis (Upstash) — catalogue cache
  │                             └── Postgres (Supabase) — metadata, users, playlists
  │
  └── audio segments ─────── Supabase Storage CDN (signed URLs, private bucket)

My laptop
  └── npm run ingest      → decode, waveform peaks, mood features, upload
      npm run transcode   → ffmpeg → HLS ladders → upload
```

The browser never talks to Supabase directly. Everything goes through my own API
routes, which means I write the queries and the auth checks rather than handing
the database to the client.

### Two different Supabase clients, on purpose

- **Admin client** (service key) — the public catalogue and signing storage URLs.
  Bypasses Row Level Security.
- **Server client** (the user's own session) — anything user-owned: playlists,
  likes. Postgres applies the RLS policies itself, so a query literally cannot
  return someone else's rows even if my code forgot to filter.

That second one is what makes the RLS policies load-bearing instead of decorative.

### Schema

```
artists        id, name, image_url
albums         id, slug, title, description, cover_path, artist_id, year
songs          id, title, album_id, artist_id, duration_sec,
               storage_path, hls_path, status, content_hash,
               waveform_peaks jsonb, energy, brightness, tempo
profiles       id → auth.users, display_name, avatar_url
playlists      id, user_id, name, description, is_public, created_at
playlist_songs playlist_id, song_id, position, added_at
liked_songs    user_id, song_id, liked_at
```

`playlist_songs.position` is a `double precision` with gaps of 1000. Dragging a
song between two others sets its position to the midpoint, so a reorder is **one
UPDATE** instead of rewriting every row. Midpoints halve the gap each time, so
there's a renumber-and-retry path for when two positions eventually converge.

---

## Running it

```bash
git clone https://github.com/TijilMinocha/Moodio.git
cd Moodio
npm install
```

Make a Supabase project, run `supabase/schema.sql` in the SQL editor, then copy
`.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Redis is optional — leave those two blank and the cache is a no-op.

Drop MP3s into `songs/<Album Name>/` with a `cover.jpg` and an `info.json`:

```json
{ "title": "Arijit Singh", "description": "Melodies of Arijit", "songs": ["..."] }
```

Filenames go `Song Title - Artist.mp3`.

```bash
npm run ingest      # upload, durations, waveforms, mood features
npm run transcode   # ffmpeg → HLS ladders (slow, ~1 min/song)
npm run dev
```

ffmpeg comes from `ffmpeg-static`, so there's nothing to install system-wide.

---

## Three things that broke

**The audio element kept dying on navigation.** I had `PlayerProvider` inside a
page, so opening an album unmounted it and the music stopped. Moved it into the
root layout — that's the only thing that survives navigation in the App Router.

**Every song's duration came out as `?:??`.** `music-metadata` is ESM-only and
`tsx` was compiling my script to CommonJS, so every parse threw on a `require()`
of an ESM module. I couldn't see it because I'd written `catch {}` with no message.
Renaming the script to `.mts` fixed it, and I now always log the actual error. A
bare catch turned a five-second fix into a twenty-minute one.

**One flaky upload killed a whole track's encode.** Each song is 57–90 small files
going to storage back to back, and occasionally one came back "Bad Request" — the
kind of thing you only hit when you're hammering an API. The encode was already
done and it all got thrown away. Added exponential-backoff retries, which is
exactly the argument for a proper job queue.

---

## What I'd change at scale

I built this small on purpose, so here's where it stops working and what I'd do:

- **Transcoding is a manual script on my laptop.** Real answer is a worker queue —
  upload returns immediately with `status: pending`, workers pick it up, you get
  retries, a `failed` state and a dead-letter table for free. I'd start with
  Postgres as the queue (`SELECT ... FOR UPDATE SKIP LOCKED`) before reaching for
  Kafka, because at this scale Kafka would be a thing to maintain rather than a
  thing that helps.
- **Search uses `ILIKE '%term%'`.** A leading wildcard can't use a B-tree index, so
  it's a sequential scan. Fine for 27 songs. Real version is a `tsvector` column
  with a GIN index, which also gets you stemming and ranking — neither of which
  `ILIKE` knows anything about.
- **Mood medians are recomputed on every request.** One cheap query today; at scale
  it's a materialised view refreshed on ingest.
- **Cache stats are in-process**, so they reset on deploy and are per-instance.
  Real metrics belong in a proper collector.
- **No play tracking.** If I added it I wouldn't write to Postgres on every event —
  I'd buffer and batch-aggregate, and only count a play after 30 seconds of actual
  listening so scrubbing doesn't inflate the numbers.
- **Signed segment URLs sit in front of storage's CDN**, which is fine, but a
  proper setup would put a CDN in front of the manifests too with per-user tokens.

## Known issues

- `/album/<bad-slug>` renders the correct 404 page but returns HTTP 200. It's a
  soft 404 from streaming — the response starts before `notFound()` throws. Users
  see the right thing; search engines wouldn't.
- Storage is around 500MB of Supabase's 1GB free tier (originals plus three HLS
  ladders). Adding many more songs means dropping the originals, which only exist
  as a fallback.
