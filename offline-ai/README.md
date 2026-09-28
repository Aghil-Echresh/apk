# Aghil AI Offline

پروژه Android Studio برای اجرای مدل GGUF به‌صورت محلی با llama.cpp.

- Kotlin + Jetpack Compose
- Android NDK 29
- CMake 3.31.6
- JNI/C++
- llama.cpp رسمی
- مدل GGUF
- بدون API و بدون اینترنت هنگام inference

راه‌اندازی:
`cd offline-ai && ../scripts/bootstrap-llama.sh`
سپس پوشه `offline-ai` را در Android Studio باز کن و Gradle Sync/Build را اجرا کن.

نمونه Android رسمی llama.cpp نیز از همین معماری JNI/llama.cpp و بارگذاری مدل GGUF از فایل خصوصی برنامه استفاده می‌کند.