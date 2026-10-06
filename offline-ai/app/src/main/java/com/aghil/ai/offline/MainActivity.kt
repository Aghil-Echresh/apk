package com.aghil.ai.offline

import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalLayoutDirection
import com.arm.aichat.AiChat
import kotlinx.coroutines.launch
import java.io.File

data class ChatMessage(val text: String, val user: Boolean)

class MainActivity : ComponentActivity() {
    private var onModelSelected: ((Uri) -> Unit)? = null
    private val modelPicker = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri?.let { onModelSelected?.invoke(it) }
    }

    private fun chooseModel(onSelected: (Uri) -> Unit) {
        onModelSelected = onSelected
        modelPicker.launch(arrayOf("application/octet-stream", "application/x-gguf", "*/*"))
    }

    private fun copyModel(uri: Uri): File {
        val dir = File(filesDir, "models")
        if (!dir.exists()) dir.mkdirs()
        val target = File(dir, "model.gguf")
        contentResolver.openInputStream(uri).use { input ->
            requireNotNull(input) { "امکان خواندن فایل مدل وجود ندارد" }
            val header = ByteArray(4)
            require(input.read(header) == 4 && header.contentEquals(byteArrayOf(0x47, 0x47, 0x55, 0x46))) {
                "فایل انتخاب‌شده GGUF معتبر نیست"
            }
            target.outputStream().use { output ->
                output.write(header)
                input.copyTo(output)
            }
        }
        require(target.length() > 4) { "فایل GGUF خالی یا ناقص است" }
        return target
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { OfflineChat() }
    }

    override fun onDestroy() {
        runCatching {
            val engine = AiChat.getInferenceEngine(this)
            if (engine.state.value is com.arm.aichat.InferenceEngine.State.ModelReady) {
                engine.cleanUp()
            }
        }
        super.onDestroy()
    }

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable private fun OfflineChat() {
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
            OfflineChatContent()
        }
    }

    @Composable
    private fun OfflineChatContent() {
        val engine = AiChat.getInferenceEngine(this@MainActivity)
        val scope = rememberCoroutineScope()
        var input by remember { mutableStateOf("") }
        var loaded by remember { mutableStateOf(false) }
        var status by remember { mutableStateOf("یک فایل GGUF انتخاب کن") }
        var modelInfo by remember { mutableStateOf("") }
        val messages = remember { mutableStateListOf<ChatMessage>() }

        Scaffold(topBar = { TopAppBar(title = { Text("🤖 عقیل AI آفلاین") }) }) { pad ->
            Column(Modifier.fillMaxSize().padding(pad).padding(12.dp)) {
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(12.dp)) {
                        Text(status, style = MaterialTheme.typography.titleSmall)
                        if (modelInfo.isNotBlank()) {
                            Spacer(Modifier.height(4.dp))
                            Text(modelInfo, style = MaterialTheme.typography.bodySmall)
                        }
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = {
                                chooseModel { uri ->
                                    try {
                                        val model = copyModel(uri)
                                        loaded = false
                                        modelInfo = "مدل نصب شد • ${model.length() / (1024 * 1024)} MB"
                                        status = "مدل ذخیره شد؛ حالا بارگذاری کن"
                                    } catch (e: Exception) {
                                        status = "خطا در نصب مدل: ${e.message}"
                                    }
                                }
                            }) { Text("انتخاب GGUF") }
                            Button(onClick = {
                                scope.launch {
                                    try {
                                        val model = File(filesDir, "models/model.gguf")
                                        if (!model.exists()) {
                                            status = "اول یک فایل GGUF انتخاب کن"
                                            return@launch
                                        }
                                        status = "در حال بارگذاری مدل…"
                                        if (engine.state.value is com.arm.aichat.InferenceEngine.State.ModelReady) {
                                            engine.cleanUp()
                                        }
                                        engine.loadModel(model.absolutePath)
                                        engine.setSystemPrompt("تو یک دستیار فارسی، دقیق، مفید و دوستانه هستی.")
                                        loaded = true
                                        status = "مدل آماده است — کاملاً آفلاین"
                                    } catch (e: Exception) {
                                        loaded = false
                                        status = "خطا در بارگذاری: ${e.message}"
                                    }
                                }
                            }) { Text("بارگذاری") }
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
                LazyColumn(Modifier.weight(1f).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(messages) { msg ->
                        Surface(tonalElevation = 2.dp, shape = MaterialTheme.shapes.medium) {
                            Text(if (msg.user) "شما: ${msg.text}" else "AI: ${msg.text}", Modifier.padding(12.dp))
                        }
                    }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value=input,onValueChange={input=it},Modifier.weight(1f),placeholder={Text("پیامت رو بنوی…")},singleLine=true)
                    Button(enabled=loaded && input.isNotBlank(), onClick={
                        val prompt=input.trim(); input=""; messages.add(ChatMessage(prompt,true))
                        scope.launch { val answer=StringBuilder(); try {
                            engine.sendUserPrompt(prompt,512).collect { token -> answer.append(token); status="در حال پاسخ…" }
                            messages.add(ChatMessage(answer.toString(),false)); status="آماده — بدون اینترنت"
                        } catch(e:Exception) { messages.add(ChatMessage("خطا: ${e.message}",false)); status="خطا" } }
                    }) { Text("ارسال") }
                }
            }
        }
    }
}