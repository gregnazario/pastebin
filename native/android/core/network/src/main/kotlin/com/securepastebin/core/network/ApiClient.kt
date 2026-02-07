package com.securepastebin.core.network

/**
 * API contract for native Android calls to Secure Pastebin API v1.
 */
interface ApiClient {
    suspend fun uploadEncryptedBlob(data: List<Byte>, filename: String): UploadResponse
    suspend fun downloadEncryptedBlob(id: String): DownloadResponse
    suspend fun health(): HealthResponse
}

data class UploadResponse(val id: String, val expiresAt: Long)
data class DownloadResponse(val data: List<Int>)
data class HealthResponse(val configured: Boolean, val account: String?)
