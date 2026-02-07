package com.securepastebin.app

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.securepastebin.core.crypto.ProductionNativeCryptoEngine
import com.securepastebin.core.network.HttpApiClient
import com.securepastebin.feature.upload.UploadFeature
import com.securepastebin.feature.upload.UploadRequest
import com.securepastebin.feature.view.DecryptRequest
import com.securepastebin.feature.view.ViewFeature
import kotlinx.coroutines.launch

private enum class UploadInputMode {
    NOTE,
    FILE,
}

private data class PickedFile(
    val name: String,
    val mimeType: String,
    val bytes: ByteArray,
)

/**
 * Main Android entry activity with Compose screens for upload and decrypt flows.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                NativeFlowApp()
            }
        }
    }
}

@Composable
private fun NativeFlowApp() {
    val apiBase = remember { "http://10.0.2.2:3000" }
    val apiClient = remember { HttpApiClient(baseUrl = apiBase) }
    val cryptoEngine = remember { ProductionNativeCryptoEngine() }
    val uploadFeature = remember {
        UploadFeature(
            apiClient = apiClient,
            cryptoEngine = cryptoEngine,
            shareBaseUrl = apiBase,
        )
    }
    val viewFeature = remember {
        ViewFeature(
            apiClient = apiClient,
            cryptoEngine = cryptoEngine,
        )
    }

    var selectedTab by remember { mutableIntStateOf(0) }

    Column(modifier = Modifier.fillMaxSize()) {
        TabRow(selectedTabIndex = selectedTab) {
            Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("Upload") })
            Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("Decrypt") })
        }

        when (selectedTab) {
            0 -> UploadFlowScreen(uploadFeature = uploadFeature, modifier = Modifier.fillMaxSize())
            else -> DecryptFlowScreen(viewFeature = viewFeature, modifier = Modifier.fillMaxSize())
        }
    }
}

@Composable
private fun UploadFlowScreen(
    uploadFeature: UploadFeature,
    modifier: Modifier = Modifier,
) {
    var filename by remember { mutableStateOf("note.txt") }
    var noteText by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isUploading by remember { mutableStateOf(false) }
    var shareLink by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var inputMode by remember { mutableStateOf(UploadInputMode.NOTE) }
    var selectedFile by remember { mutableStateOf<PickedFile?>(null) }

    val context = LocalContext.current
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument(),
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult

        try {
            selectedFile = readPickedFile(context, uri)
            error = null
        } catch (e: Exception) {
            selectedFile = null
            error = e.message ?: "Failed to read selected file."
        }
    }

    val scope = rememberCoroutineScope()

    Column(
        modifier = modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        TabRow(selectedTabIndex = if (inputMode == UploadInputMode.NOTE) 0 else 1) {
            Tab(
                selected = inputMode == UploadInputMode.NOTE,
                onClick = { inputMode = UploadInputMode.NOTE },
                text = { Text("Note") },
            )
            Tab(
                selected = inputMode == UploadInputMode.FILE,
                onClick = { inputMode = UploadInputMode.FILE },
                text = { Text("File") },
            )
        }

        if (inputMode == UploadInputMode.NOTE) {
            OutlinedTextField(
                modifier = Modifier.fillMaxWidth(),
                value = filename,
                onValueChange = { filename = it },
                label = { Text("Filename") },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Text,
                    capitalization = KeyboardCapitalization.None,
                ),
                singleLine = true,
            )

            OutlinedTextField(
                modifier = Modifier.fillMaxWidth(),
                value = noteText,
                onValueChange = { noteText = it },
                label = { Text("Note") },
                minLines = 6,
            )
        } else {
            Button(onClick = { filePickerLauncher.launch(arrayOf("*/*")) }) {
                Text("Choose File")
            }

            selectedFile?.let { file ->
                Text("Selected: ${file.name}", style = MaterialTheme.typography.bodyMedium)
                Text(
                    "${file.bytes.size} bytes • ${file.mimeType}",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }

        OutlinedTextField(
            modifier = Modifier.fillMaxWidth(),
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            visualTransformation = PasswordVisualTransformation(),
            singleLine = true,
        )

        Button(
            onClick = {
                val uploadPayload = when (inputMode) {
                    UploadInputMode.NOTE -> UploadRequest(
                        plaintext = noteText.toByteArray(Charsets.UTF_8),
                        filename = if (filename.isBlank()) "note.txt" else filename,
                        mimeType = "text/plain",
                        password = password,
                        encryptMetadata = false,
                    )
                    UploadInputMode.FILE -> {
                        val file = selectedFile
                        if (file == null) {
                            error = "Choose a file before uploading."
                            return@Button
                        }
                        UploadRequest(
                            plaintext = file.bytes,
                            filename = file.name,
                            mimeType = file.mimeType,
                            password = password,
                            encryptMetadata = false,
                        )
                    }
                }

                isUploading = true
                error = null
                shareLink = null
                scope.launch {
                    try {
                        val result = uploadFeature.upload(uploadPayload)
                        shareLink = result.shareUrl
                    } catch (e: Exception) {
                        error = e.message
                    } finally {
                        isUploading = false
                    }
                }
            },
            enabled = !isUploading &&
                password.isNotBlank() &&
                (
                    (inputMode == UploadInputMode.NOTE && noteText.isNotBlank()) ||
                        (inputMode == UploadInputMode.FILE && selectedFile != null)
                    ),
        ) {
            Text(if (isUploading) "Uploading..." else "Encrypt and Upload")
        }

        shareLink?.let { link ->
            Text("Share Link", style = MaterialTheme.typography.titleMedium)
            Text(link, style = MaterialTheme.typography.bodySmall)
        }

        error?.let { message ->
            Text("Error: $message", color = MaterialTheme.colorScheme.error)
        }
    }
}

private fun readPickedFile(context: Context, uri: Uri): PickedFile {
    val resolver = context.contentResolver
    val mimeType = resolver.getType(uri) ?: "application/octet-stream"
    val displayName = queryDisplayName(resolver, uri) ?: "file.bin"
    val bytes = resolver.openInputStream(uri)?.use { input ->
        input.readBytes()
    } ?: throw IllegalStateException("Unable to open selected file.")

    return PickedFile(
        name = displayName,
        mimeType = mimeType,
        bytes = bytes,
    )
}

private fun queryDisplayName(
    resolver: ContentResolver,
    uri: Uri,
): String? {
    resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (nameIndex >= 0 && cursor.moveToFirst()) {
            return cursor.getString(nameIndex)
        }
    }
    return null
}

@Composable
private fun DecryptFlowScreen(
    viewFeature: ViewFeature,
    modifier: Modifier = Modifier,
) {
    var shareUrl by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isDecrypting by remember { mutableStateOf(false) }
    var fileName by remember { mutableStateOf<String?>(null) }
    var preview by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    val scope = rememberCoroutineScope()

    Column(
        modifier = modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        OutlinedTextField(
            modifier = Modifier.fillMaxWidth(),
            value = shareUrl,
            onValueChange = { shareUrl = it },
            label = { Text("Share URL") },
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Uri,
                capitalization = KeyboardCapitalization.None,
            ),
            singleLine = true,
        )

        OutlinedTextField(
            modifier = Modifier.fillMaxWidth(),
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            visualTransformation = PasswordVisualTransformation(),
            singleLine = true,
        )

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(
                onClick = {
                    isDecrypting = true
                    fileName = null
                    preview = null
                    error = null
                    scope.launch {
                        try {
                            val result = viewFeature.decrypt(
                                DecryptRequest(
                                    shareUrl = shareUrl,
                                    password = password,
                                ),
                            )
                            fileName = result.metadata.name
                            preview = result.plaintext.toString(Charsets.UTF_8)
                        } catch (e: Exception) {
                            error = e.message
                        } finally {
                            isDecrypting = false
                        }
                    }
                },
                enabled = !isDecrypting && shareUrl.isNotBlank() && password.isNotBlank(),
            ) {
                Text(if (isDecrypting) "Decrypting..." else "Download and Decrypt")
            }
        }

        fileName?.let {
            Text("File: $it", style = MaterialTheme.typography.titleMedium)
        }

        preview?.let {
            Text("Preview", style = MaterialTheme.typography.titleMedium)
            Text(it, style = MaterialTheme.typography.bodySmall)
        }

        error?.let {
            Text("Error: $it", color = MaterialTheme.colorScheme.error)
        }
    }
}
