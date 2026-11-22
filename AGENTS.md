# GymSora Member Android App — React Native & Expo Standards

This project is a native-first React Native + Expo application for GymSora gym members.

## Stack & Libraries
- **Framework**: React Native + Expo (TypeScript strict mode)
- **Navigation**: Expo Router (`app/` file-based routes, native Android back handling)
- **Styling**: Consistent token-driven design system (`src/theme/` or NativeWind when configured); never treat React Native as a web app
- **Data Fetching & Server State**: TanStack Query (`@tanstack/react-query`) with `fetch`, single-flight token refresh, and offline-first caching
- **Forms & Validation**: React Hook Form + Zod for multi-field/complex forms
- **Security**: `expo-secure-store` (Android Keystore / iOS Keychain) for all tokens, `qr_secret`, and auth metadata — never `AsyncStorage` for secrets
- **Local Persistence**: `expo-sqlite` for structured offline databases when needed; `AsyncStorage` strictly for non-secret display cache
- **Icons**: Lucide React Native (`lucide-react-native`) / Material Icons for Android-idiomatic controls
- **Animations**: `react-native-reanimated` (UI-thread animations)
- **Builds & Deployment**: EAS Build (`eas.json` preview APK & production AAB)

## Quality & UX Rules
1. **Platform-Native Android/iOS Conventions**: Minimum `48dp` touch targets on Android, native ripple feedback, system back navigation, edge-to-edge safe-area handling (`react-native-safe-area-context` / `contentInsetAdjustmentBehavior="automatic"`).
2. **Four Explicit Data States**: Every async screen handles **loading**, **error** (with retry), **empty** (`ListEmptyComponent`), and **content** (preserving cached data during failed refreshes).
3. **Offline-First QR Pass**: Never log a member out on network timeouts or Airplane Mode; keep Flow A rotating QR generation functional 100% offline.
4. **Keyboard & Forms**: Use `keyboardShouldPersistTaps="handled"`, keep primary actions reachable above the keyboard, preserve form drafts on failed saves, and disable repeat submissions while pending.
5. **Performance**: Use `FlatList`/`FlashList` with stable IDs for variable-length lists, avoid hardcoded colors/spacing outside the theme, and strip debug logs in production.
6. **Accessibility**: Meaningful `accessibilityLabel` and `accessibilityRole` on interactive controls; avoid fixed heights that clip scaled system fonts.

## Recommended Installed Skills
Consult the globally installed Antigravity skills in `~/.gemini/config/skills/` on demand:
- `expo-router`, `expo-native-ui`, `expo-design-system`, `expo-animation`, `expo-data-fetching`, `expo-project-structure`, `eas-app-stores`
- `react-native-best-practices`, `vercel-react-native-skills`, `vercel-composition-patterns`
- `tanstack-query-best-practices`, `react-native-testing`, `mobile-design`
