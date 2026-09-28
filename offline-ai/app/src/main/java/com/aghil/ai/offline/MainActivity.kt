package com.aghil.ai.offline

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.arm.aichat.AiChat
import kotlinx.coroutines.launch
import java.io.File

data class ChatMessage(val text: String, val user: Boolean)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { OfflineChat() }
    }
    @Composable private fun OfflineChat() {
        val engine = remember { AiChat.getInferenceEngine(this@MainActivity) }
        val scope = rememberCoroutineScope()
        var input by remember { mutableStateOf("") }
        var loaded by remember { mutableStateOf(false) }
        var status by remember { mutableStateOf("مدل GGUF را بارگذاری کن") }
        val messages = remember { mutableStateListOf<ChatMessage>() }
        Scaffold(topBar = { TopAppBar(title = { Text("🤖 عقیل AI آفلاین") }) }) { pad ->
            Column(Modifier.fillMaxSize().padding(pad).padding(12.dp)) {
                Text(status, style = MaterialTheme.typography.labelMedium)
                Spacer(Modifier.height(8.dp))
                LazyColumn(Modifier.weight(1f).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(messages) { msg ->
                        Surface(tonalElevation = 2.dp, shape = MaterialTheme.shapes.medium) {
                            Text(if (msg.user) "شما: ${msg.text}" else "AI: ${msg.text}", Modifier.padding(12.dp))
                        }
                    }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value=input,onValueChange={input=it},Modifier.weight(1f),placeholder={Text("پیامت رو بنویس…")},singleLine=true)
                    Button(enabled=loaded && input.isNotBlank(), onClick={
                        val prompt=input.trim(); input=""; messages.add(ChatMessage(prompt,true))
                        scope.launch { val answer=StringBuilder(); try {
                            engine.sendUserPrompt(prompt,512).collect { token -> answer.append(token); status="در حال پاسخ…" }
                            messages.add(ChatMessage(answer.toString(),false)); status="آماده — بدون اینترنت"
                        } catch(e:Exception) { messages.add(ChatMessage("خطا: ${e.message}",false)); status="خطا" } }
                    }) { Text("ارسال") }
                }
                Spacer(Modifier.height(8.dp))
                Button(onClick={ scope.launch { try {
                    val model=File(filesDir,"models/model.gguf")
                    if(!model.exists()){ status="فایل مدل را در files/models/model.gguf قرار بده"; return@launch }
                    status="در حال بارگذاری مدل…"; engine.loadModel(model.absolutePath)
                    engine.setSystemPrompt("تو یک دستیار فارسی، دقیق، مفید و دوستانه هستی.")
                    loaded=true; status="مدل آماده است — کاملاً آفلاین"
                } catch(e:Exception){ status="خطا در مدل: ${e.message}" } } }) { Text("بارگذاری مدل GGUF") }
            }
        }
    }
}
