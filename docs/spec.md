# Spec: Location Sharing App (working name: TBD)

## Overview
A location-sharing app for couples/close contacts, solving "how far are you" without map clutter, constant calls, or Google Maps' information overload. Minimal and cute on the receiver's end, functional nav for the sender.

## Target users
v1: builder + partner, scaling to ~500 users in month one via direct sharing (invite links + APK), not app store discovery.

## Core user flows

### 1. Sign up
Google or email. Basic profile: name, email, avatar.

### 2. Add contact + nickname
Import phone contacts, assign private nicknames (e.g. "Harshu"). System checks if each contact is a registered user (match by **email**) — determines whether they're trip-startable directly or need a link invite.

### 3. Start a trip (one tap)
Tap nicknamed contact → trip begins, live location streams, scoped to that trip + contact only.
- One active trip per user at a time (as sender).

### 4. Sender experience
Full live map/nav view while trip is active — own location, route, ETA (like Google Maps), so they don't need a separate nav app open.

### 5. Receiver experience — foreground
Full map view by default when app is open — live route, moving dot, ETA.

### 6. Receiver experience — backgrounded
Floating avatar overlay (chat-head style) shows live countdown even while receiver is in another app. Tapping it opens the app in a popup over their current context.

### 7. Trip ends
- Auto-end: proximity ≤ **3m** between sender and receiver.
- Reconnection handling: if sender's signal drops mid-trip, trip stays open. On reconnect, if elapsed time has exceeded predicted ETA **+ 20% buffer**, auto-end.
- Manual end: either party, anytime.

### 8. Sharing / invite flow
- Existing app users (matched by email): trip starts directly in-app, no link needed.
- Non-users: sender shares invite link (WhatsApp/any messaging app) → link carries `trip_id` → routes to APK download page if not installed → deep-links into the live trip on first open post-install.

## Non-goals for v1
- No iOS (Android-only for month one)
- No Play Store listing (sideloaded APK)
- No ads/monetization
- No always-on "circles" — only active-trip-scoped sharing
- No web-based viewing — receiver must be on the app
- No multi-trip concurrency (v1 is one active trip per user)

## Known technical complexity flags
- Floating chat-head overlay requires Android's "draw over other apps" permission — a distinct, real capability, but non-trivial to build compared to a simple push notification.
- Deep-linking a not-yet-installed user from a WhatsApp link into a specific live trip post-install requires deferred deep linking (Android App Links + a "pending trip" state that survives the install gap).

## Decisions log
- Proximity auto-end threshold: 3m
- Reconnect auto-end buffer: predicted ETA + 20%
- Contact-to-user matching: by email
- Platform: Android only, v1
- Distribution: sideloaded APK, no Play Store, no App Store
- Monetization: none for v1 (explicitly deferred, not ads-on-idle-screen)
