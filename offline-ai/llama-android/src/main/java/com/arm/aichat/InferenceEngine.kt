package com.arm.aichat
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow
interface InferenceEngine {
    val state: StateFlow<State>
    suspend fun loadModel(pathToModel: String)
    suspend fun setSystemPrompt(systemPrompt: String)
    fun sendUserPrompt(message: String, predictLength: Int = DEFAULT_PREDICT_LENGTH): Flow<String>
    fun cleanUp()
    fun destroy()
    sealed class State {
        data object Uninitialized : State()
        data object Initializing : State()
        data object Initialized : State()
        data object LoadingModel : State()
        data object UnloadingModel : State()
        data object ModelReady : State()
        data object Benchmarking : State()
        data object ProcessingSystemPrompt : State()
        data object ProcessingUserPrompt : State()
        data object Generating : State()
        data class Error(val exception: Exception) : State()
    }
    companion object { const val DEFAULT_PREDICT_LENGTH = 1024 }
}
class UnsupportedArchitectureException : Exception()
