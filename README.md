# GymSora Member Android App

Multi-tenant Android (and iOS) member companion app for the **GymSora** Gym Management SaaS platform, built with **React Native + Expo + TypeScript**.

One shared app serves members of every gym on GymSora — automatically discovering the member's gym(s) at login and dynamically applying each gym's logo and brand color.

## Features
- **Offline Rotating QR Pass (Flow A)**: Time-based 30-second HMAC-SHA256 (`GS1:...`) digital check-in pass stored in Android Keystore (`expo-secure-store`). Works 100% offline in Airplane Mode with automatic clock-drift sync and screen brightness boost.
- **Attendance History & Streak**: Monthly check-in calendar, current & longest streak counters, and offline SQLite cache.
- **Membership & Billing**: Active plan card, expiry countdown, payment status, subscription/payment history, and in-app renewal requests sent directly to the gym's dashboard.
- **Gym Hub**: Plans, trainers, services, retail products & cafe menu, pinned announcements, and one-tap call/email.
- **Personal Progress Tracker**: Body weight, live BMI calculation, body measurements with SVG weight trend chart, and workout logs with exercise sets/reps/weights.
- **Multi-Gym Switcher**: Members enrolled in multiple GymSora gyms can switch gyms from the Profile tab.

## Quick Start (Expo Go on Android)

1. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_BASE` to your Django backend LAN URL (e.g. `http://192.168.1.112:8000`) or production API (`https://api.gymsora.com`):
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Start the Expo dev server:
   ```bash
   npx expo start
   ```
4. Scan the QR code with **Expo Go** on an Android phone connected to the same Wi-Fi network.

## Scripts
- `npm start` — start Expo Metro dev server
- `npm run typecheck` — run strict TypeScript check (`tsc --noEmit`)
- `npm test` — run cross-language Flow A QR parity & rotation tests
- `npx eas-cli build -p android --profile preview` — build an installable Android APK in the cloud
- `npx eas-cli build -p android --profile production` — build a Play Store Android App Bundle (AAB)
