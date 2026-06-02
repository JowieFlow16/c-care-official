# Building the C-Care Android APK

C-Care is wrapped with [Capacitor](https://capacitorjs.com). The native
Android shell loads the published web app at `https://c-care.lovable.app`,
but every screen reads/writes through **IndexedDB (Dexie)** first, so the
app works fully offline. The background sync engine pushes local changes
to Lovable Cloud the moment the device is online again.

## Prerequisites (one-time, on your machine)

- Node.js 20+ and Bun (or npm)
- Android Studio (latest) with an Android SDK + a virtual or physical device
- JDK 17

## First-time setup

```bash
# 1. Clone the repo from GitHub and install
git clone https://github.com/altra-co/c-care.git
cd c-care
bun install

# 2. Add the native Android project (creates the /android folder)
bunx cap add android

# 3. Sync the Capacitor config into the native project
bunx cap sync android
```

## Build the APK

### Option A — Android Studio (easiest)

```bash
bunx cap open android
```

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
The APK ends up under `android/app/build/outputs/apk/debug/app-debug.apk`.

### Option B — Command line (debug)

```bash
cd android
./gradlew assembleDebug
# APK at: android/app/build/outputs/apk/debug/app-debug.apk
```

### Signed release APK

1. Generate a keystore once:
   ```bash
   keytool -genkey -v -keystore ccare.keystore -alias ccare \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. In Android Studio: **Build → Generate Signed Bundle / APK**, pick APK,
   point at `ccare.keystore`, and let it build a release APK ready for
   distribution or the Play Store.

## Updating the app

The Android shell points at `https://c-care.lovable.app`, so **every time
you publish from Lovable the installed app updates automatically** — no
APK reinstall needed.

You only need to rebuild the APK when:
- You change `capacitor.config.ts` (app id, name, icons, splash)
- You add/upgrade Capacitor plugins
- You ship a new app icon / splash screen

After such a change:

```bash
bunx cap sync android
cd android && ./gradlew assembleDebug
```

## Offline behaviour

- **Local DB:** Dexie (IndexedDB) is the source of truth on the device.
- **Outbox pattern:** every write is queued in an `outbox` table.
- **Sync engine** (`src/lib/sync.ts`): flushes the outbox to Lovable Cloud
  every 30s and on every `online` event, and pulls remote changes back.

This means the cashier can keep selling on a phone with no signal — sales,
inventory edits, and new customers all persist locally and sync the next
time the device sees the internet.

## App icon & splash

Drop a 1024×1024 PNG at `resources/icon.png` and a 2732×2732 PNG at
`resources/splash.png`, then:

```bash
bunx @capacitor/assets generate --android
bunx cap sync android
```
