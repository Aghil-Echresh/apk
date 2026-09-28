#pragma once

#include <android/log.h>
#include <cstdarg>
#include "ggml.h"

static inline void aichat_android_log_callback(ggml_log_level level, const char * text, void * /* user_data */) {
    int priority = ANDROID_LOG_INFO;
    switch (level) {
        case GGML_LOG_LEVEL_ERROR: priority = ANDROID_LOG_ERROR; break;
        case GGML_LOG_LEVEL_WARN:  priority = ANDROID_LOG_WARN; break;
        case GGML_LOG_LEVEL_INFO:  priority = ANDROID_LOG_INFO; break;
        case GGML_LOG_LEVEL_DEBUG: priority = ANDROID_LOG_DEBUG; break;
        default:                   priority = ANDROID_LOG_VERBOSE; break;
    }
    __android_log_write(priority, "AghilAI", text ? text : "");
}

#define LOGi(...) __android_log_print(ANDROID_LOG_INFO,  "AghilAI", __VA_ARGS__)
#define LOGw(...) __android_log_print(ANDROID_LOG_WARN,  "AghilAI", __VA_ARGS__)
#define LOGe(...) __android_log_print(ANDROID_LOG_ERROR, "AghilAI", __VA_ARGS__)
#define LOGd(...) __android_log_print(ANDROID_LOG_DEBUG, "AghilAI", __VA_ARGS__)
#define LOGv(...) __android_log_print(ANDROID_LOG_VERBOSE, "AghilAI", __VA_ARGS__)
