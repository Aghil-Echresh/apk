# Virtual Walkie Talkie Pro APK: Redmi 13 / ARM compatibility review

Review date: 2026-10-14

## Deliverable
- Compatibility APK: `Virtual_Walkie_Talkie_Pro_Redmi13_armv7_compat.apk`
- SHA-256: `63db49be17e36e7cd7531c349ce241c925cf2feece63adc568acd8993e051937`
- APK archive size: approximately 618 KiB
- Package: `ix.com.android.VirtualWalkieTalkiePro`
- App version label: `1.39`
- Compatibility rebuild version code: `29` (original: `28`)

## Findings from the supplied APK

| Check | Finding |
|---|---|
| Native libraries (`lib/*/*.so`) | None found |
| DEX files | `classes.dex` only |
| Original min SDK | 4 |
| Original target SDK | 22 |
| Compatibility target SDK | 24 |
| Declared permissions | `RECORD_AUDIO`, `INTERNET`, `ACCESS_COARSE_LOCATION`, `WAKE_LOCK` |
| ZIP integrity | Passed |
| Rebuilt JAR/v1 signature verification | Passed with SHA-256 / RSA 2048-bit self-signed compatibility certificate |
| Installation / live audio test on a physical Redmi 13 | Not performed in this environment |

## Architecture conclusion
The supplied APK has no native `.so` libraries, so there is no native ABI payload to convert to `armeabi-v7a`. Its Dalvik bytecode is CPU-independent. The compatibility work here addresses the old Android target SDK and old APK signature, not a missing ARMv7 native library.

## Compatibility edits
1. Changed `targetSdkVersion` from 22 to 24. Android 15 and Android 16 block new installation of apps targeting below API 24; the rebuilt APK meets that installation threshold. References: [Android Developers: target SDK requirements](https://developer.android.com/google/play/requirements/target-sdk) and [Android Developers: uses-sdk](https://developer.android.com/guide/topics/manifest/uses-sdk-element).
2. Changed `versionCode` from 28 to 29 to identify the compatibility rebuild.
3. Removed the original APK's stale v1 signature files and signed the rebuilt archive using SHA-256 with a 2048-bit RSA self-signed compatibility certificate.
4. Kept package ID and application code/resources unchanged.

## Important limitations
- This is not an official publisher build. The original signature cannot be preserved without the publisher's private signing key. Therefore, the compatibility APK cannot update an installation signed by the original publisher. If the original app is already installed, Android will reject an in-place update because the signatures differ. Uninstalling the old app first may erase its local settings/server list; record those settings before proceeding.
- Changing the target SDK activates runtime-permission behavior. Static inspection did not find `requestPermissions`, `checkSelfPermission`, or `onRequestPermissionsResult` strings in the DEX. After installing, open **Settings → Apps → Virtual Walkie Talkie Pro → Permissions** and manually allow **Microphone** and, if the app needs it, **Location**. If Android does not offer a permission control or audio still fails, source-level changes and a rebuilt app are required.
- The file was checked structurally and cryptographically at the archive/signature level, but was not executed on a Redmi 13. Successful installation, server connectivity and two-way audio remain unverified.
- This is a dated third-party app with legacy networking and permission behavior. Do not rely on it for emergency, confidential, or security-critical communications.

## Manual install on Redmi 13
1. Download the compatibility APK to the phone.
2. Open it from Downloads or the file manager and allow APK installation for that source if Android asks.
3. If the original-signed app is already present, save its server/configuration details first; then uninstall it before installing this differently signed compatibility build.
4. After installation, allow Microphone and Location permissions in the app's Settings page as needed.
5. Open the app and test connection plus audio with another device. This final device test is still required.

## Reproduction
`patch_manifest.py` validates the expected original manifest values and patches the binary manifest values only. It does not re-sign the APK or add runtime permission-request code. ZIP repacking, removal of stale signature entries, and signing must then be performed with Android/JDK tooling. Never publish or reuse the private compatibility signing key.
