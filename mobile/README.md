# RideGP Mobile (Expo)


Quick start:

1. Copy `.env.example` to `.env` and fill in keys.
2. From `mobile/` run:

```bash
npm install
npm start
```

Supabase setup:

1. Create a Supabase project and note `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
2. In SQL editor run the following to create tables:

```sql
create table if not exists posts (
	id bigint generated always as identity primary key,
	title text,
	content text,
	image_path text,
	created_at timestamptz default now(),
	user_id uuid
);

create table if not exists rides (
	id bigint generated always as identity primary key,
	user_id uuid,
	metrics jsonb,
	geo jsonb,
	fuel_cost numeric,
	score int,
	created_at timestamptz default now()
);

create table if not exists push_tokens (
	id bigint generated always as identity primary key,
	user_id uuid unique,
	token text,
	created_at timestamptz default now()
);
```

3. Create a storage bucket named `posts` (public if you want simple public URLs).

Running server locally:

1. Copy `server/.env.example` → `server/.env` and set `SUPABASE_SERVICE_ROLE_KEY` and `PORT`.
2. From `server/` run:

```bash
npm install
npm run dev
```

Required keys and values (place in `mobile/.env` and `server/.env`):

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anon/public key (mobile)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server, keep secret)
- `API_URL` — server URL (e.g., `http://localhost:3000`)
- `GOOGLE_MAPS_API_KEY` — optional, for native maps
- `ADMIN_EMAILS` — optional comma-separated admin emails for broadcast access

Notes:
- Expo push tokens are generated on-device; the app saves them to Supabase. The server reads tokens (using the service role key) and posts to Expo's push API to broadcast.
- This project is scaffolded for development. For production builds use EAS and supply platform credentials if you need native push via APNs/FCM.

If you want, I can now:
- polish UI (theme, icons)
- add map view with markers
- add admin-only screen protections
- prepare EAS build config

Full end-to-end setup and testing (keys, where to paste)

1) Supabase
 - Create a project at https://supabase.com and open Project Settings → API. Copy `Project URL` → set `SUPABASE_URL` and `anon public key` → set `SUPABASE_ANON_KEY` in `mobile/.env`.
 - In Supabase SQL editor run the provided SQL for `posts`, `push_tokens`, and `rides` tables.

2) MongoDB Atlas (server storage)
 - Create a free cluster at https://cloud.mongodb.com and create a database user.
 - Get the connection string (URI) and paste into `server/.env` as `MONGODB_URI`.

3) Google Maps
 - Go to Google Cloud Console → APIs & Services → Credentials. Create an API key and enable Maps SDK for Android/iOS and Directions/Geocoding if needed.
 - Paste the API key into `mobile/app.json` under `android.config.googleMaps.apiKey` and `ios.config.googleMapsApiKey`. Also set `GOOGLE_MAPS_API_KEY` in `.env` if needed.

4) Server
 - Copy `server/.env.example` → `server/.env` and set `SUPABASE_SERVICE_ROLE_KEY`, `MONGODB_URI`, and `PORT`.
 - Install dependencies and run `npm run dev` in `server/`.

5) Mobile env
 - Copy `mobile/.env.example` → `mobile/.env` and set:
	 - `SUPABASE_URL`, `SUPABASE_ANON_KEY`
	 - `API_URL` to your server URL (e.g., `http://192.168.x.y:3000` for local LAN)
	 - `FUEL_EFFICIENCY_KM_PER_L` and `FUEL_PRICE_PER_L` as desired

6) Background location notes (Expo managed)
 - The app uses `expo-task-manager` and `expo-location` to track in the background. On Android you must build a dev client or EAS build to test background location (Expo Go does not support background location). Use `expo prebuild` / `eas build` to create a custom dev client.

7) Run and test
 - Start server: `cd server && npm install && npm run dev`.
 - Start mobile dev client: `cd mobile && npm install`.
 - For quick testing without background: `npm start` and open in Expo Go; use Quick Start Ride → Start Ride → move phone → Stop Ride.
 - For background testing: build a dev client with EAS and install on device, then Start Ride, background the app and drive; Stop Ride to save.

8) API endpoints
 - `POST /broadcast` — server broadcasts push notifications.
 - `POST /ingest-ride` — server accepts ride JSON and stores in MongoDB (the app posts to this after saving to Supabase).

If you'd like, I can: create EAS build config, add server-side analytics in more detail, or implement background crash recovery notifications. Tell me which next.

