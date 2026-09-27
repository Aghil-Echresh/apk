import type { CapacitorConfig } from "@capacitor/cli";

const remoteUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.aghil.echresh.apk",
  appName: "APK Project",
  webDir: "public",
  bundledWebRuntime: false,
  ...(remoteUrl
    ? {
        server: {
          url: remoteUrl,
          androidScheme: "https",
          cleartext: false,
        },
      }
    : {}),
};

export default config;
