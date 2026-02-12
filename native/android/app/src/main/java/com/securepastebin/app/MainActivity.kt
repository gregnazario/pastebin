package com.securepastebin.app

import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.Bundle
import android.os.ParcelFileDescriptor
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import android.widget.MediaController
import android.widget.VideoView
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.FileProvider
import com.securepastebin.core.crypto.ProductionNativeCryptoEngine
import com.securepastebin.core.network.HttpApiClient
import com.securepastebin.core.storage.GoogleDriveHistorySyncAdapter
import com.securepastebin.core.storage.GoogleDriveSyncConfigurationStore
import com.securepastebin.core.storage.HistoryCloudSyncCoordinator
import com.securepastebin.core.storage.HistorySyncResult
import com.securepastebin.core.storage.SharedPreferencesHistoryStore
import com.securepastebin.feature.history.HistoryFeature
import com.securepastebin.feature.history.HistoryListItem
import com.securepastebin.feature.upload.UploadFeature
import com.securepastebin.feature.upload.UploadRequest
import com.securepastebin.feature.view.DecryptRequest
import com.securepastebin.feature.view.ViewFeature
import kotlinx.coroutines.launch
import java.io.File
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.UUID

private enum class UploadInputMode {
    NOTE,
    FILE,
}

private data class PickedFile(
    val name: String,
    val mimeType: String,
    val bytes: ByteArray,
)

private data class DecryptedFilePayload(
    val name: String,
    val mimeType: String,
    val bytes: ByteArray,
)

private sealed interface DecryptPreview {
    data class Text(val value: String) : DecryptPreview
    data class Image(val bitmap: Bitmap) : DecryptPreview
    data class Pdf(val file: File) : DecryptPreview
    data class Media(val uri: Uri) : DecryptPreview
    data class Unsupported(val message: String) : DecryptPreview
}

private data class DecryptPreviewBuild(
    val preview: DecryptPreview,
    val temporaryFile: File?,
)

private val defaultApiBaseURL = ApiBaseEnvironmentPreset.PRODUCTION.baseUrl
private const val defaultDriveSyncFileName = "secure-pastebin-history-sync.json"
private const val historyIncludeExpiredSwitchTestTag = "history-include-expired-switch"
private const val apiSettingsOpenButtonTestTag = "api-settings-open-button"
private const val apiSettingsCurrentApiLabelTestTag = "api-settings-current-api-label"
private const val apiSettingsInputTestTag = "api-settings-input"
private const val apiSettingsApplyButtonTestTag = "api-settings-apply-button"
private const val uploadNoteInputTestTag = "upload-note-input"
private const val uploadPasswordInputTestTag = "upload-password-input"
private const val uploadSubmitButtonTestTag = "upload-submit-button"
private const val uploadChooseFileButtonTestTag = "upload-choose-file-button"
private const val decryptShareURLInputTestTag = "decrypt-share-url-input"
private const val decryptPasswordInputTestTag = "decrypt-password-input"
private const val decryptSubmitButtonTestTag = "decrypt-submit-button"

/**
 * Main Android entry activity with Compose screens for upload, decrypt, and history flows.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SecurePastebinPremiumTheme {
                NativeFlowApp()
            }
        }
    }
}

@Composable
private fun NativeFlowApp() {
    val context = LocalContext.current
    val contentResolver = context.contentResolver
    val apiBaseConfigStore = remember(context.applicationContext) {
        ApiBaseConfigurationStore(context.applicationContext)
    }
    var apiBase by remember {
        mutableStateOf(apiBaseConfigStore.readApiBaseUrl(defaultApiBaseURL))
    }
    var isApiSettingsPresented by remember { mutableStateOf(false) }
    val apiClient = remember(apiBase) { HttpApiClient(baseUrl = apiBase) }
    val cryptoEngine = remember { ProductionNativeCryptoEngine() }
    val historyStore = remember(context.applicationContext) {
        SharedPreferencesHistoryStore(context.applicationContext)
    }
    val driveSyncConfigStore = remember(context.applicationContext) {
        GoogleDriveSyncConfigurationStore(context.applicationContext)
    }
    var driveSyncDocumentURIString by remember {
        mutableStateOf(driveSyncConfigStore.readDocumentURI())
    }
    var driveSyncError by remember { mutableStateOf<String?>(null) }
    val uploadFeature = remember(apiClient, cryptoEngine, apiBase) {
        UploadFeature(
            apiClient = apiClient,
            cryptoEngine = cryptoEngine,
            shareBaseUrl = apiBase,
        )
    }
    val viewFeature = remember(apiClient, cryptoEngine, historyStore) {
        ViewFeature(
            apiClient = apiClient,
            cryptoEngine = cryptoEngine,
            historyStore = historyStore,
        )
    }
    val historyFeature = remember(historyStore, apiBase) {
        HistoryFeature(
            historyStore = historyStore,
            shareBaseUrl = apiBase,
        )
    }
    val cloudSyncCoordinator = remember(
        context.applicationContext,
        historyStore,
        driveSyncDocumentURIString,
    ) {
        driveSyncDocumentURIString?.let { uriString ->
            HistoryCloudSyncCoordinator(
                historyStore = historyStore,
                cloudAdapter = GoogleDriveHistorySyncAdapter(
                    context = context.applicationContext,
                    documentUri = Uri.parse(uriString),
                ),
            )
        }
    }

    val createDriveSyncFileLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("application/json"),
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        if (!isGoogleDriveDocumentURI(uri)) {
            driveSyncError = "Select a Google Drive location for cloud sync."
            return@rememberLauncherForActivityResult
        }

        runCatching {
            driveSyncConfigStore.takePersistablePermissions(contentResolver, uri)
            driveSyncConfigStore.writeDocumentURI(uri)
            driveSyncDocumentURIString = uri.toString()
            driveSyncError = null
        }.onFailure { throwable ->
            driveSyncError = throwable.message ?: "Failed to configure Google Drive sync file."
        }
    }

    val openDriveSyncFileLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument(),
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        if (!isGoogleDriveDocumentURI(uri)) {
            driveSyncError = "Select a JSON document from Google Drive."
            return@rememberLauncherForActivityResult
        }

        runCatching {
            driveSyncConfigStore.takePersistablePermissions(contentResolver, uri)
            driveSyncConfigStore.writeDocumentURI(uri)
            driveSyncDocumentURIString = uri.toString()
            driveSyncError = null
        }.onFailure { throwable ->
            driveSyncError = throwable.message ?: "Failed to connect Google Drive sync file."
        }
    }

    var selectedTab by remember { mutableIntStateOf(0) }
    var pendingDecryptShareUrl by remember { mutableStateOf<String?>(null) }

    if (isApiSettingsPresented) {
        ApiBaseSettingsDialog(
            currentApiBase = apiBase,
            onDismissRequest = { isApiSettingsPresented = false },
            onApply = { updatedApiBase ->
                apiBaseConfigStore.writeApiBaseUrl(updatedApiBase)
                apiBase = updatedApiBase
                isApiSettingsPresented = false
            },
        )
    }

    PremiumMinimalBackdrop {
        PremiumSectionCard(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            contentPadding = 10.dp,
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "API: $apiBase",
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier
                        .weight(1f)
                        .testTag(apiSettingsCurrentApiLabelTestTag),
                )
                PremiumPrimaryButton(
                    text = "Settings",
                    onClick = { isApiSettingsPresented = true },
                    enabled = true,
                    modifier = Modifier.testTag(apiSettingsOpenButtonTestTag),
                )
            }
        }

        PremiumSectionCard(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp),
            contentPadding = 0.dp,
        ) {
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.Transparent,
            ) {
                Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("Upload") })
                Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("Decrypt") })
                Tab(selected = selectedTab == 2, onClick = { selectedTab = 2 }, text = { Text("History") })
            }
        }

        when (selectedTab) {
            0 -> UploadFlowScreen(
                uploadFeature = uploadFeature,
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
            )
            1 -> DecryptFlowScreen(
                viewFeature = viewFeature,
                prefilledShareUrl = pendingDecryptShareUrl,
                onPrefilledShareUrlConsumed = { pendingDecryptShareUrl = null },
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
            )
            else -> HistoryFlowScreen(
                historyFeature = historyFeature,
                onOpenInDecrypt = { shareUrl ->
                    pendingDecryptShareUrl = shareUrl
                    selectedTab = 1
                },
                isCloudSyncConfigured = cloudSyncCoordinator != null,
                driveSyncDocumentURIString = driveSyncDocumentURIString,
                onCreateDriveSyncFile = {
                    createDriveSyncFileLauncher.launch(defaultDriveSyncFileName)
                },
                onSelectDriveSyncFile = {
                    openDriveSyncFileLauncher.launch(arrayOf("application/json"))
                },
                onSyncNow = {
                    val coordinator = cloudSyncCoordinator
                        ?: throw IllegalStateException("Google Drive sync is not configured.")
                    coordinator.syncNow()
                },
                setupErrorMessage = driveSyncError,
                onSetupErrorConsumed = { driveSyncError = null },
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
            )
        }
    }
}

@Composable
private fun ApiBaseSettingsDialog(
    currentApiBase: String,
    onDismissRequest: () -> Unit,
    onApply: (String) -> Unit,
) {
    var draftApiBase by remember(currentApiBase) { mutableStateOf(currentApiBase) }
    var validationErrorMessage by remember { mutableStateOf<String?>(null) }
    val activePreset = remember(draftApiBase) {
        ApiBaseEnvironmentPreset.matching(draftApiBase)
    }

    AlertDialog(
        onDismissRequest = onDismissRequest,
        shape = MaterialTheme.shapes.large,
        title = { Text("API Settings") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    "Choose an environment preset or enter a custom API base URL.",
                    style = MaterialTheme.typography.bodySmall,
                )
                Text(
                    "Current preset: ${activePreset?.label ?: "Custom"}",
                    style = MaterialTheme.typography.bodySmall,
                )

                ApiBaseEnvironmentPreset.entries.forEach { preset ->
                    PremiumPrimaryButton(
                        text = "${preset.label}: ${preset.baseUrl}",
                        onClick = {
                            draftApiBase = preset.baseUrl
                            validationErrorMessage = null
                        },
                        enabled = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("api-settings-preset-${preset.name.lowercase()}"),
                    )
                }

                OutlinedTextField(
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag(apiSettingsInputTestTag),
                    value = draftApiBase,
                    onValueChange = {
                        draftApiBase = it
                        validationErrorMessage = null
                    },
                    label = { Text("API Base URL") },
                    singleLine = true,
                )

                validationErrorMessage?.let { message ->
                    Text(message, color = MaterialTheme.colorScheme.error)
                }
            }
        },
        confirmButton = {
            PremiumPrimaryButton(
                text = "Apply",
                onClick = {
                    val normalized = normalizeApiBaseUrlCandidate(draftApiBase)
                    if (!isValidApiBaseUrl(normalized)) {
                        validationErrorMessage = "Enter a valid http(s) API base URL."
                        return@PremiumPrimaryButton
                    }
                    onApply(normalized)
                },
                enabled = true,
                modifier = Modifier.testTag(apiSettingsApplyButtonTestTag),
            )
        },
        dismissButton = {
            Button(onClick = onDismissRequest) {
                Text("Cancel")
            }
        },
    )
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
        modifier = modifier.padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        PremiumSectionCard(title = "Input") {
            TabRow(
                selectedTabIndex = if (inputMode == UploadInputMode.NOTE) 0 else 1,
                containerColor = Color.Transparent,
            ) {
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
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag(uploadNoteInputTestTag),
                    value = noteText,
                    onValueChange = { noteText = it },
                    label = { Text("Note") },
                    minLines = 6,
                )
            } else {
                PremiumPrimaryButton(
                    text = "Choose File",
                    onClick = { filePickerLauncher.launch(arrayOf("*/*")) },
                    enabled = true,
                    modifier = Modifier.testTag(uploadChooseFileButtonTestTag),
                )

                selectedFile?.let { file ->
                    Text("Selected: ${file.name}", style = MaterialTheme.typography.bodyMedium)
                    Text(
                        "${file.bytes.size} bytes • ${file.mimeType}",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
        }

        PremiumSectionCard(title = "Security") {
            OutlinedTextField(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag(uploadPasswordInputTestTag),
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true,
            )

            PremiumPrimaryButton(
                text = if (isUploading) "Uploading..." else "Encrypt and Upload",
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
                                return@PremiumPrimaryButton
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
                modifier = Modifier.testTag(uploadSubmitButtonTestTag),
            )
        }

        shareLink?.let { link ->
            PremiumSectionCard(title = "Share Link") {
                Text(link, style = MaterialTheme.typography.bodySmall)
            }
        }

        error?.let { message ->
            PremiumSectionCard(title = "Error") {
                Text("Error: $message", color = MaterialTheme.colorScheme.error)
            }
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
    prefilledShareUrl: String?,
    onPrefilledShareUrlConsumed: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    var shareUrl by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isDecrypting by remember { mutableStateOf(false) }
    var fileName by remember { mutableStateOf<String?>(null) }
    var preview by remember { mutableStateOf<DecryptPreview?>(null) }
    var previewTempFile by remember { mutableStateOf<File?>(null) }
    var decryptedPayload by remember { mutableStateOf<DecryptedFilePayload?>(null) }
    var exportTempFile by remember { mutableStateOf<File?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(prefilledShareUrl) {
        if (!prefilledShareUrl.isNullOrBlank()) {
            shareUrl = prefilledShareUrl
            error = null
            onPrefilledShareUrlConsumed()
        }
    }

    DisposableEffect(previewTempFile?.absolutePath) {
        onDispose {
            previewTempFile?.delete()
        }
    }

    DisposableEffect(exportTempFile?.absolutePath) {
        onDispose {
            exportTempFile?.delete()
        }
    }

    val saveFileLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("*/*"),
    ) { destinationUri ->
        val payload = decryptedPayload
        if (destinationUri == null || payload == null) {
            return@rememberLauncherForActivityResult
        }

        runCatching {
            saveDecryptedFile(context, destinationUri, payload.bytes)
        }.onFailure { throwable ->
            error = throwable.message ?: "Failed to save decrypted file."
        }
    }

    val scope = rememberCoroutineScope()

    Column(
        modifier = modifier.padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        PremiumSectionCard(title = "Decrypt") {
            OutlinedTextField(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag(decryptShareURLInputTestTag),
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
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag(decryptPasswordInputTestTag),
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true,
            )

            PremiumPrimaryButton(
                text = if (isDecrypting) "Decrypting..." else "Download and Decrypt",
                onClick = {
                    isDecrypting = true
                    fileName = null
                    preview = null
                    decryptedPayload = null
                    error = null
                    previewTempFile?.delete()
                    previewTempFile = null
                    exportTempFile?.delete()
                    exportTempFile = null
                    scope.launch {
                        try {
                            val result = viewFeature.decrypt(
                                DecryptRequest(
                                    shareUrl = shareUrl,
                                    password = password,
                                ),
                            )
                            fileName = result.metadata.name
                            decryptedPayload = DecryptedFilePayload(
                                name = result.metadata.name,
                                mimeType = result.metadata.mimeType,
                                bytes = result.plaintext,
                            )
                            val builtPreview = buildDecryptPreview(
                                context = context,
                                fileName = result.metadata.name,
                                mimeType = result.metadata.mimeType,
                                bytes = result.plaintext,
                            )
                            preview = builtPreview.preview
                            previewTempFile = builtPreview.temporaryFile
                        } catch (e: Exception) {
                            error = e.message
                        } finally {
                            isDecrypting = false
                        }
                    }
                },
                enabled = !isDecrypting && shareUrl.isNotBlank() && password.isNotBlank(),
                modifier = Modifier.testTag(decryptSubmitButtonTestTag),
            )
        }

        fileName?.let {
            PremiumSectionCard(title = "Decrypted File") {
                Text("File: $it", style = MaterialTheme.typography.titleSmall)
            }
        }

        decryptedPayload?.let { payload ->
            PremiumSectionCard(title = "Actions") {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    PremiumPrimaryButton(
                        text = "Save As",
                        onClick = { saveFileLauncher.launch(payload.name) },
                        enabled = true,
                    )

                    PremiumPrimaryButton(
                        text = "Export",
                        onClick = {
                            runCatching {
                                exportTempFile?.delete()
                                val exportFile = writePreviewFile(
                                    context = context,
                                    fileName = payload.name,
                                    mimeType = payload.mimeType,
                                    bytes = payload.bytes,
                                    prefix = "decrypt-export-",
                                )
                                exportTempFile = exportFile
                                shareDecryptedFile(context, exportFile, payload.mimeType)
                            }.onFailure { throwable ->
                                error = throwable.message ?: "Failed to export decrypted file."
                            }
                        },
                        enabled = true,
                    )
                }
            }
        }

        preview?.let { content ->
            PremiumSectionCard(title = "Preview") {
                when (content) {
                    is DecryptPreview.Text -> {
                        Text(content.value, style = MaterialTheme.typography.bodySmall)
                    }
                    is DecryptPreview.Image -> {
                        Image(
                            bitmap = content.bitmap.asImageBitmap(),
                            contentDescription = "Decrypted image preview",
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(max = 320.dp),
                        )
                    }
                    is DecryptPreview.Pdf -> {
                        PdfFirstPagePreview(file = content.file)
                    }
                    is DecryptPreview.Media -> {
                        MediaPreview(uri = content.uri)
                    }
                    is DecryptPreview.Unsupported -> {
                        Text(content.message, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }

        error?.let {
            PremiumSectionCard(title = "Error") {
                Text("Error: $it", color = MaterialTheme.colorScheme.error)
            }
        }
    }
}

@Composable
private fun HistoryFlowScreen(
    historyFeature: HistoryFeature,
    onOpenInDecrypt: (String) -> Unit,
    isCloudSyncConfigured: Boolean,
    driveSyncDocumentURIString: String?,
    onCreateDriveSyncFile: () -> Unit,
    onSelectDriveSyncFile: () -> Unit,
    onSyncNow: suspend () -> HistorySyncResult,
    setupErrorMessage: String?,
    onSetupErrorConsumed: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    var includeExpired by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var isSyncing by remember { mutableStateOf(false) }
    var entries by remember { mutableStateOf<List<HistoryListItem>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var syncSummary by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(includeExpired) {
        isLoading = true
        error = null
        try {
            entries = historyFeature.list(includeExpired = includeExpired)
        } catch (e: Exception) {
            error = e.message ?: "Failed to load history."
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(setupErrorMessage) {
        if (!setupErrorMessage.isNullOrBlank()) {
            error = setupErrorMessage
            onSetupErrorConsumed()
        }
    }

    Column(
        modifier = modifier.padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        PremiumSectionCard(title = "Controls") {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("Include expired")
                Switch(
                    modifier = Modifier.testTag(historyIncludeExpiredSwitchTestTag),
                    checked = includeExpired,
                    onCheckedChange = { includeExpired = it },
                )
            }

            PremiumPrimaryButton(
                text = if (isLoading) "Refreshing..." else "Refresh",
                onClick = {
                    scope.launch {
                        isLoading = true
                        error = null
                        try {
                            entries = historyFeature.list(includeExpired = includeExpired)
                        } catch (e: Exception) {
                            error = e.message ?: "Failed to load history."
                        } finally {
                            isLoading = false
                        }
                    }
                },
                enabled = !isLoading,
            )
        }

        PremiumSectionCard(title = "Cloud Sync") {
            if (!isCloudSyncConfigured) {
                Text(
                    "Google Drive sync file is not configured yet.",
                    style = MaterialTheme.typography.bodySmall,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PremiumPrimaryButton(
                        text = "Create Drive File",
                        onClick = onCreateDriveSyncFile,
                        enabled = !isLoading && !isSyncing,
                    )
                    PremiumPrimaryButton(
                        text = "Use Existing File",
                        onClick = onSelectDriveSyncFile,
                        enabled = !isLoading && !isSyncing,
                    )
                }
            } else {
                driveSyncDocumentURIString?.let { uriString ->
                    Text(uriString, style = MaterialTheme.typography.bodySmall)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PremiumPrimaryButton(
                        text = if (isSyncing) "Syncing..." else "Sync Now",
                        onClick = {
                            scope.launch {
                                isSyncing = true
                                error = null
                                syncSummary = null
                                try {
                                    val result = onSyncNow()
                                    entries = historyFeature.list(includeExpired = includeExpired)
                                    syncSummary = formatCloudSyncSummary(result)
                                } catch (e: Exception) {
                                    error = e.message ?: "Cloud sync failed."
                                } finally {
                                    isSyncing = false
                                }
                            }
                        },
                        enabled = !isLoading && !isSyncing,
                    )

                    PremiumPrimaryButton(
                        text = "Change File",
                        onClick = onSelectDriveSyncFile,
                        enabled = !isLoading && !isSyncing,
                    )
                }
            }

            syncSummary?.let {
                Text(it, style = MaterialTheme.typography.bodySmall)
            }
        }

        if (entries.isEmpty() && !isLoading) {
            PremiumSectionCard(title = "Recent Decrypts") {
                Text("No history entries yet.", style = MaterialTheme.typography.bodyMedium)
            }
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(entries, key = { it.id }) { entry ->
                PremiumSectionCard {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Column(
                            modifier = Modifier.weight(1f).padding(end = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(2.dp),
                        ) {
                            Text(entry.fileName, style = MaterialTheme.typography.titleSmall)
                            Text("ID: ${entry.id}", style = MaterialTheme.typography.bodySmall)
                            Text(
                                "Created: ${formatHistoryMillis(entry.createdAtMillis)}",
                                style = MaterialTheme.typography.bodySmall,
                            )
                            Text(
                                historyExpirationLabel(entry),
                                style = MaterialTheme.typography.bodySmall,
                                color = if (entry.isExpired) {
                                    MaterialTheme.colorScheme.error
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                },
                            )
                        }

                        Column(
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            entry.shareUrl?.let { shareUrl ->
                                PremiumPrimaryButton(
                                    text = "Open",
                                    onClick = {
                                        runCatching {
                                            onOpenInDecrypt(shareUrl)
                                        }.onFailure { throwable ->
                                            error = throwable.message ?: "Failed to open history link."
                                        }
                                    },
                                    enabled = !isLoading,
                                )

                                PremiumPrimaryButton(
                                    text = "Share",
                                    onClick = {
                                        runCatching {
                                            shareHistoryLink(context, shareUrl)
                                        }.onFailure { throwable ->
                                            error = throwable.message ?: "Failed to share history link."
                                        }
                                    },
                                    enabled = !isLoading,
                                )
                            }

                            Button(
                                onClick = {
                                    scope.launch {
                                        isLoading = true
                                        error = null
                                        try {
                                            historyFeature.delete(entry.id)
                                            entries = historyFeature.list(includeExpired = includeExpired)
                                        } catch (e: Exception) {
                                            error = e.message ?: "Failed to delete history entry."
                                        } finally {
                                            isLoading = false
                                        }
                                    }
                                },
                                enabled = !isLoading,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                                    contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                ),
                            ) {
                                Text("Delete")
                            }
                        }
                    }
                }
            }
        }

        error?.let {
            PremiumSectionCard(title = "Error") {
                Text("Error: $it", color = MaterialTheme.colorScheme.error)
            }
        }
    }
}

@Composable
private fun PdfFirstPagePreview(file: File) {
    val firstPageBitmap = remember(file.absolutePath) { renderPdfFirstPage(file) }

    if (firstPageBitmap != null) {
        Image(
            bitmap = firstPageBitmap.asImageBitmap(),
            contentDescription = "PDF first page preview",
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 360.dp),
        )
    } else {
        Text("Unable to render PDF preview.", style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun MediaPreview(uri: Uri) {
    AndroidView(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 220.dp, max = 320.dp),
        factory = { context ->
            VideoView(context).apply {
                setMediaController(MediaController(context))
                setVideoURI(uri)
                seekTo(1)
            }
        },
        update = { view ->
            view.setVideoURI(uri)
            view.seekTo(1)
        },
    )
}

private fun buildDecryptPreview(
    context: Context,
    fileName: String,
    mimeType: String,
    bytes: ByteArray,
): DecryptPreviewBuild {
    val normalizedMimeType = mimeType.lowercase()

    if (normalizedMimeType.startsWith("text/")) {
        return DecryptPreviewBuild(
            preview = DecryptPreview.Text(bytes.toString(Charsets.UTF_8)),
            temporaryFile = null,
        )
    }

    if (normalizedMimeType.startsWith("image/")) {
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        if (bitmap != null) {
            return DecryptPreviewBuild(
                preview = DecryptPreview.Image(bitmap),
                temporaryFile = null,
            )
        }
        return DecryptPreviewBuild(
            preview = DecryptPreview.Unsupported("Image preview could not be decoded."),
            temporaryFile = null,
        )
    }

    if (normalizedMimeType == "application/pdf") {
        val file = writePreviewFile(context, fileName, mimeType, bytes)
        return DecryptPreviewBuild(
            preview = DecryptPreview.Pdf(file),
            temporaryFile = file,
        )
    }

    if (normalizedMimeType.startsWith("audio/") || normalizedMimeType.startsWith("video/")) {
        val file = writePreviewFile(context, fileName, mimeType, bytes)
        return DecryptPreviewBuild(
            preview = DecryptPreview.Media(Uri.fromFile(file)),
            temporaryFile = file,
        )
    }

    return DecryptPreviewBuild(
        preview = DecryptPreview.Unsupported("No preview available for $mimeType."),
        temporaryFile = null,
    )
}

private fun writePreviewFile(
    context: Context,
    fileName: String,
    mimeType: String,
    bytes: ByteArray,
    prefix: String = "decrypt-preview-",
): File {
    val originalExtension = fileName.substringAfterLast('.', "").lowercase()
    val extension = if (originalExtension.isNotBlank()) {
        originalExtension
    } else {
        MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType) ?: ""
    }

    val suffix = if (extension.isBlank()) "" else ".$extension"
    val previewFile = File(context.cacheDir, "$prefix${UUID.randomUUID()}$suffix")
    previewFile.writeBytes(bytes)
    return previewFile
}

private fun saveDecryptedFile(
    context: Context,
    destinationUri: Uri,
    bytes: ByteArray,
) {
    context.contentResolver.openOutputStream(destinationUri)?.use { output ->
        output.write(bytes)
    } ?: throw IllegalStateException("Unable to open destination for writing.")
}

private fun shareDecryptedFile(
    context: Context,
    file: File,
    mimeType: String,
) {
    val contentUri = FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file,
    )

    val shareIntent = Intent(Intent.ACTION_SEND).apply {
        type = mimeType
        putExtra(Intent.EXTRA_STREAM, contentUri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }

    context.startActivity(Intent.createChooser(shareIntent, "Export decrypted file"))
}

private fun shareHistoryLink(
    context: Context,
    shareUrl: String,
) {
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, shareUrl)
    }
    context.startActivity(Intent.createChooser(intent, "Share paste link"))
}

private fun isGoogleDriveDocumentURI(uri: Uri): Boolean {
    val authority = uri.authority ?: return false
    return authority.contains("com.google.android.apps.docs.storage")
}

private fun formatCloudSyncSummary(result: HistorySyncResult): String {
    return "Synced: ${result.stats.added} added, ${result.stats.updated} updated, " +
        "${result.stats.conflicts} conflicts."
}

private val historyDateTimeFormatter: DateTimeFormatter =
    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")

private fun formatHistoryMillis(millis: Long): String {
    if (millis <= 0) {
        return "N/A"
    }
    return Instant.ofEpochMilli(millis)
        .atZone(ZoneId.systemDefault())
        .format(historyDateTimeFormatter)
}

private fun historyExpirationLabel(item: HistoryListItem): String {
    if (item.expiresAtMillis <= 0) {
        return "Expires: Never"
    }
    val formattedExpiration = formatHistoryMillis(item.expiresAtMillis)
    return if (item.isExpired) {
        "Expires: $formattedExpiration (expired)"
    } else {
        "Expires: $formattedExpiration"
    }
}

private fun renderPdfFirstPage(file: File): Bitmap? {
    if (!file.exists()) {
        return null
    }

    val descriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
    descriptor.use { fileDescriptor ->
        PdfRenderer(fileDescriptor).use { renderer ->
            if (renderer.pageCount == 0) {
                return null
            }

            renderer.openPage(0).use { page ->
                val width = page.width.coerceAtLeast(1)
                val height = page.height.coerceAtLeast(1)
                val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                bitmap.eraseColor(android.graphics.Color.WHITE)
                page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                return bitmap
            }
        }
    }
}
