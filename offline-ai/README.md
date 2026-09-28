# Aghil AI Offline 🤖

Android application for running a local GGUF language model completely offline with llama.cpp.

## Current architecture

- Kotlin + Jetpack Compose Persian RTL chat UI
- `llama-android` native library module
- llama.cpp fetched during CI/local bootstrap into `offline-ai/llama.cpp`
- GGUF model copied into the app-private `files/models/model.gguf`
- JNI bridge from Kotlin to llama.cpp
- CPU builds for `arm64-v8a` and `x86_64`

The app does not require an API key or network connection for inference after the model has been installed.

## Build locally

Requirements:

- Android Studio
- JDK 17
- Android SDK 36
- Android NDK `29.0.13113456`
- CMake `3.31.6`
- Gradle 8.13
- Git

From the `offline-ai` directory:

```bash
./scripts/bootstrap-llama.sh
gradle assembleDebug
```

The APK is produced at:

```text
app/build/outputs/apk/debug/app-debug.apk
```

## GitHub Actions

Every push or pull request that changes `offline-ai/**` runs `.github/workflows/offline-ai-android.yml`.
The workflow installs the Android SDK/NDK/CMake toolchain, fetches llama.cpp, builds the debug APK, and uploads `app-debug.apk` as the `aghil-ai-offline-debug` artifact.

## Using the app

1. Install the generated APK.
2. Obtain a compatible `.gguf` model separately.
3. Tap **انتخاب GGUF** and select the model.
4. Tap **بارگذاری**.
5. Wait for **مدل آماده است — کاملاً آفلاین**.
6. Send Persian messages from the chat box.

No model weights are committed to this repository; this keeps the Git repository small and avoids distributing model files with the source code.

## Important

The first native build requires an internet connection because `bootstrap-llama.sh` downloads the llama.cpp source. Once the APK and model are installed on the phone, inference itself runs locally and does not need internet access.
