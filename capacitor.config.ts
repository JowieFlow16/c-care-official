import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.ccare.altra",
  appName: "C-Care",
  // Capacitor still requires a webDir on disk; we ship a tiny placeholder
  // because the live app is loaded from `server.url` below (the published
  // Lovable site). The offline-first IndexedDB layer keeps the app usable
  // without network; sync resumes automatically when online.
  webDir: "android-shell",
  server: {
    url: "https://c-care.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
