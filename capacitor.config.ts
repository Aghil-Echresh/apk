import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aghil.echresh.apk",
  appName: "APK Project",
  webDir: ".output/public",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
  },
};

export default config;
