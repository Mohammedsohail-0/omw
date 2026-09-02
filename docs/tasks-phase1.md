# Tasks: Phase 1 — Core Loop (no overlay, no invite links)

Derived from plan.md. Each task should be a single Claude Code session/prompt — don't bundle multiple tasks into one prompt. Test on a real Android device after each task where noted; Expo Go is not sufficient once native modules are involved (Task 7 onward).

---

### Task 0 — Project setup
- Init Expo project with dev client (not managed Expo Go)
- Set up Supabase project: create tables (`users`, `contacts`, `trips`, `location_pings`, `pending_invites`) per schema in plan.md
- Configure RLS policies (basic: users can only read their own rows / rows where they're sender or resolved receiver)
- Add `.env` handling for Supabase URL/anon key, Mapbox token
- **Test**: app boots, connects to Supabase, no auth yet

### Task 1 — Auth
- Integrate Supabase Auth: Google sign-in + email sign-in
- On first sign-in, create a `users` row (id, name, email, avatar_url)
- Basic logged-in/logged-out navigation state
- **Test**: sign up with two separate test accounts (you + a second email), confirm both appear in `users` table

### Task 2 — Contacts + nicknames
- Integrate `expo-contacts`, request permission, list phone contacts
- UI: pick a contact, assign a nickname, save to `contacts` table (`owner_id`, `contact_email`, `nickname`)
- On save, check `contact_email` against `users` table — if match found, set `contact_user_id`; else leave null
- Contacts list screen: show nickname + a badge/indicator for "on app" vs "not yet" (not yet = will matter in Phase 2, just display for now)
- **Test**: add your test second account as a contact, confirm `contact_user_id` resolves correctly

### Task 3 — Trip start (existing users only)
- UI: tap a nicknamed contact (only ones with `contact_user_id` set — others disabled/greyed for now, Phase 2 handles them)
- On tap: check no other `active` trip exists for this user as `starter_id` (enforce one-active-trip rule)
- Create `trips` row: `starter_id`, `target_contact_id`, `status = active`, `start_time`, `predicted_eta` (can hardcode a placeholder ETA for now — real ETA calc comes with Mapbox in Task 5)
- **Test**: start a trip from account A to account B, confirm row appears correctly in `trips`

### Task 4 — Live location ping loop
- `expo-location` background permission request + watcher
- While a trip is `active` (as starter), write pings to `location_pings` every 3-5s (lat, lng, timestamp, trip_id, user_id)
- No UI yet — just confirm via Supabase table view that pings are streaming in real time
- **Test**: walk around with the app running, confirm pings update in Supabase dashboard live

### Task 5 — Receiver map view (foreground)
- Integrate Mapbox SDK
- Receiver subscribes to Supabase Realtime on `location_pings` filtered by active `trip_id` where they're the target
- Render live moving dot on map as pings arrive
- Calculate + display ETA using Mapbox Directions API based on sender's current position → receiver's position
- Update `predicted_eta` on `trips` row once real ETA is available (replaces Task 3's placeholder)
- **Test**: account A moving (or simulated location), account B sees dot move + ETA update live

### Task 6 — Proximity auto-end
- On each new ping (server-side function or client-side check on receiver), compute haversine distance between sender's latest ping and receiver's latest known location
- If distance ≤ 3m: set `trips.status = ended`, `end_reason = proximity`, `end_time = now`
- Both clients should reflect trip-ended state immediately (via Realtime subscription on `trips` table too, not just `location_pings`)
- **Test**: physically bring both test devices within 3m, confirm trip auto-ends on both screens

### Task 7 — Manual end
- UI button (both sender and receiver side) to end trip manually
- Sets `status = ended`, `end_reason = manual`, `end_time = now`
- **Test**: start a trip, manually end from each side separately, confirm state updates correctly both times

---

## Definition of done for Phase 1
Two real Android devices, both with the app installed and signed in, added as each other's contacts. One starts a trip to the other by tapping a nickname. Receiver sees a live map with a moving dot and ETA. Trip ends automatically when they're within 3m of each other, or manually via a button. No invite links, no chat-head overlay, no push notifications yet — just the core loop working end-to-end on real devices.

## Notes for whoever (you) runs these in Claude Code
- Run tasks in order — later tasks assume earlier ones are working, not just written
- After each task, actually test on device before moving to the next — don't chain untested tasks
- Keep spec.md and plan.md in the repo root or a `/docs` folder so Claude Code can reference them each session
- If a task reveals the plan/schema needs to change, update plan.md first, then continue — don't let the code silently diverge from the docs
