# Plan: Location Sharing App

Derived from spec.md. This is the "how" — stack, architecture, schema, and build phasing.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| App framework | Expo (React Native), dev client / bare workflow | Managed Expo Go is NOT enough — chat-head overlay needs native modules, so we need a custom dev client build from early on |
| Backend | Supabase | Auth, Postgres DB, Realtime (live location pings), also used for deferred deep linking (see below) |
| Auth | Supabase Auth | Google + email sign-in |
| Maps / routing | Mapbox (free tier) | Avoids Google Maps API cost at scale |
| Push notifications | FCM (Firebase Cloud Messaging) | For trip-start alerts; NOT sufficient alone for the live chat-head overlay |
| Background location | `expo-location` (background permissions) | Required for sender tracking while app is backgrounded |
| Contacts access | `expo-contacts` | For nickname assignment flow |
| Chat-head overlay | Native Android module (e.g. `react-native-floating-bubble` or custom) | High-risk item — phased separately, see Build Phasing |
| Deferred deep linking | Custom, via Supabase | Rolled our own instead of Branch.io — see below |

## Deferred deep linking design (custom, no third-party service)

1. Sender generates invite link containing a random `token`.
2. `pending_invites` table in Supabase: `token, trip_id, created_at, expires_at`.
3. Link opens a lightweight landing page → redirects to APK download.
4. On first app open post-install, app checks Android Install Referrer API for the token.
5. If found, app queries `pending_invites` by token, retrieves `trip_id`, deep-links user straight into that live trip.
6. Row expires/deletes after use or after a timeout (e.g. 24h) to avoid stale invite bloat.

## Data model

```
users
  id, name, email, avatar_url, created_at

contacts
  id, owner_id (fk users), contact_email, nickname, 
  contact_user_id (fk users, nullable until they sign up)

trips
  id, starter_id (fk users), target_contact_id (fk contacts),
  status (active/ended), start_time, end_time,
  end_reason (proximity/manual/timeout),
  predicted_eta (timestamp, set at trip start, used for reconnect-buffer logic)

location_pings
  id, trip_id (fk trips), user_id (fk users),
  lat, lng, timestamp

pending_invites
  token, trip_id, created_at, expires_at
```

Key constraints:
- `location_pings` only written while `trips.status = active`.
- RLS: a user can only read `location_pings` for trips where they are `starter_id` or the resolved user behind `target_contact_id`.
- One active trip per user as `starter_id` (enforced at insert time — reject new trip if an active one exists).

## Core logic

**Trip start**
- Resolve `target_contact_id` → check if `contact_user_id` is set (existing user) or null (needs invite link).
- If existing user: create `trips` row, status `active`, notify receiver in-app + push.
- If not: create `trips` row (status `pending_invite`?), generate `pending_invites` token, return shareable link.

**Live tracking**
- Sender's `expo-location` background watcher writes to `location_pings` every ~3-5s while trip is active.
- Supabase Realtime subscription on `location_pings` (filtered by `trip_id`) pushes updates to receiver's client.
- Receiver's Mapbox view re-renders dot position + recalculates ETA on each update.

**Auto-end: proximity**
- On each new ping, compute haversine distance between sender's latest ping and receiver's latest known location.
- If ≤ 3m, end trip (`end_reason = proximity`).

**Auto-end: reconnect/timeout**
- If no ping received for [gap threshold TBD, e.g. 60s], flag trip as "signal lost" client-side (UI shows this state, doesn't end yet).
- On reconnect (new ping arrives), compare `now` against `predicted_eta`.
- If `now > predicted_eta * 1.2` (20% buffer), auto-end (`end_reason = timeout`).

**Manual end**
- Either party can end anytime via UI button → sets `status = ended`, `end_reason = manual`.

## Build phasing (risk-ordered, not just feature-ordered)

**Phase 1 — Core loop, no overlay**
1. Auth (Google/email via Supabase)
2. Contacts + nickname CRUD, with email-based existing-user check
3. Trip start (existing users only, skip invite-link path for now)
4. Live location ping loop (sender → Supabase → receiver, no map yet, just logs/raw data confirmed working)
5. Receiver foreground map view (Mapbox, live dot, ETA)
6. Proximity auto-end + manual end

**Phase 2 — Invite flow**
7. Invite link generation + APK download page
8. Deferred deep linking (Install Referrer + `pending_invites` lookup)

**Phase 3 — Background experience (highest risk, isolated)**
9. Basic push notification fallback first (simple, proven) — ships as the "backgrounded" experience initially
10. Chat-head overlay — replaces the push-notification fallback once built and tested; treated as an upgrade, not a blocker for shipping Phase 1+2

**Phase 4 — Reconnect/timeout polish**
11. Signal-lost UI state
12. Reconnect + ETA-buffer auto-end logic

Rationale: Phase 1 alone is already a usable, demoable app between two people who both have it installed. Phases 2-4 layer on the harder, riskier pieces without blocking the core loop from working and being testable early.

## Open items carried into Tasks phase
- Exact "signal lost" gap threshold (proposed: 60s, needs real-device testing)
- Chat-head library choice / feasibility spike needed before committing to Phase 3 approach
