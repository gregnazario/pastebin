package com.securepastebin.core.crypto

import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import java.util.Base64
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Roundtrip and web conformance tests for the production native crypto adapter.
 */
class ProductionNativeCryptoEngineTest {
    @Test
    fun productionEngineRoundTripsPayload(): Unit = runBlocking {
        val engine = ProductionNativeCryptoEngine()
        val metadata = CryptoFileMetadata(
            name = "note.txt",
            size = 2,
            mimeType = "text/plain",
            uploadDate = 1_738_886_400_000,
            expirationDate = null,
            encryptionConfig = CryptoFileMetadata.EncryptionConfig(
                encryptMetadata = true,
                algorithm = "Kyber768+AES256-GCM",
            ),
        )

        val encrypted = engine.encrypt(
            plaintext = byteArrayOf(72, 73),
            password = "StrongPass#2026",
            metadata = metadata,
            encryptMetadata = true,
        )

        val decrypted = engine.decrypt(
            serializedPayload = encrypted.serializedPayload,
            password = "StrongPass#2026",
            privateKeyBase64Url = encrypted.privateKeyBase64Url,
        )

        assertTrue(decrypted.plaintext.contentEquals(byteArrayOf(72, 73)))
        assertEquals(metadata, decrypted.metadata)
    }

    @Test
    fun productionEngineDecryptsWebConformanceVector(): Unit = runBlocking {
        val vector = JSONObject(VECTOR_JSON)
        val expectedMetadataJson = vector.getJSONObject("metadata")
        val expectedEncryptionConfigJson = expectedMetadataJson.getJSONObject("encryptionConfig")

        val expectedMetadata = CryptoFileMetadata(
            name = expectedMetadataJson.getString("name"),
            size = expectedMetadataJson.getInt("size"),
            mimeType = expectedMetadataJson.getString("mimeType"),
            uploadDate = expectedMetadataJson.getLong("uploadDate"),
            expirationDate = expectedMetadataJson.getLong("expirationDate"),
            encryptionConfig = CryptoFileMetadata.EncryptionConfig(
                encryptMetadata = expectedEncryptionConfigJson.getBoolean("encryptMetadata"),
                algorithm = expectedEncryptionConfigJson.getString("algorithm"),
            ),
        )

        val engine = ProductionNativeCryptoEngine()
        val result = engine.decrypt(
            serializedPayload = decodeBase64Url(vector.getString("serializedPayloadBase64Url")),
            password = vector.getString("password"),
            privateKeyBase64Url = vector.getString("privateKeyBase64Url"),
        )

        val expectedPlaintext = decodeBase64Url(vector.getString("plaintextBase64Url"))
        assertTrue(result.plaintext.contentEquals(expectedPlaintext))
        assertEquals(expectedMetadata, result.metadata)
    }

    private fun decodeBase64Url(value: String): ByteArray {
        return Base64.getUrlDecoder().decode(value)
    }

    private companion object {
        const val VECTOR_JSON = """{"id":"vector-001","password":"VectorPass#2026!","metadata":{"name":"vector.txt","size":36,"mimeType":"text/plain","uploadDate":1738886400000,"expirationDate":1741478400000,"encryptionConfig":{"encryptMetadata":false,"algorithm":"Kyber768+AES256-GCM"}},"plaintextBase64Url":"TmF0aXZlIHBhcml0eSB2ZWN0b3IgdjE6IGhlbGxvIHdvcmxk","serializedPayloadBase64Url":"AQAAIL1SrePCAs0FyqY3mO94XUIJtoHx0yxaalRn9vX5FWk5BEDFKtbGaOMCaaLzdfovJ97ehOIGjYIA9I0UGjhCBL3sKamg5rSuamOZ6uZScz9_HCM2edYKhpzhS1Xc1EUehSmX2ameUbwQiKFRGrQ2zKUQ6wYNYMReEoMNERoOC8pOwiYd6zdyWIKo8HiU9GDHzJLvqGpNQfNmuBQtCj5MRo49akYDwkx8-imqEJdSZxajFySyhyWB37Q5G7GUD0RM49O-XaF77JHpgCu3jtmffA6cRuLTJTGuBYpZEo0R8iRGCZvNoUu7CviW0LWiHDKFKlkOu4cRxEoclOa2DruHjTFREfyBIHkMjX7sNWwHlZj_1HflSGqaPvvhiJXpcKY9WTN6IIwR_g1Qczk0p0uRrRpayVWbRpRy017EfapAvQXrxv_L0bGdqRTmHkPGiCf8UQt51WDdHS_WPujLYYzVcvjshSsqy4FP7RdN8exIGc25b0TEYMKd4uX97HWoV62YRa9MJeuMZ80ajWOL_r68SYIPWLnhwRIalPE7hWE9Fsj_ikh8txXHBfucEevnUBNBoSQNc3kOUipgDnucP16tBBgy30YhoPxQrhSJA6NOsLAjIHUtMriR3cn2pL5wyhsV4zVX1W9L_ITI2PDDZ3lwozcQCo5x8e07dBEeEzVvZUJHB32YlcBbJFIlgNKgY2rk-r7VckGSAuzfmCJFf3lUIwS8I-pd8LMDdxWsaLYjj6y3809_pDGOBnyYiG2NcTAcc6F5h47wHkxsnc4Es_MLFA5rlYLGG27eWcXct_9VJbITaAngHJjy9Knmc1vfAkU9cdJlB5HZtXVarkh7fKRcTzt4z4zQPuzFFN2ZgIkM8WHwVvILgbATdO-e9DUwbZdYnJKkl9UGUoXPMz2Q7y5SstgBQtwHHkVSbLR3u0OQAkLxu0V8TS-SXJIqKpjJNm9f2QOwkQzPao_S9xNrv4k_qvfKH0FDSWqvndFLkFgJvzGOQ-bAPJAAyR_GXwgzypxc4FU3HwelYxxm0IYWX9uqP9sLL1wRIQC5NxKBxf7I9Ldy7VjeVSFg364CCaF3SX7FgHpB3Ju3jfuMgEnNGZFnUbxyAPuY5hutQqH8vWdBKvmkxjTkjP-I_jOv2Qcl0-H9a8zWN6leDdZ_x0gD680HpgqQV_wSrJ2z6GfUX8rwXLrJ9tmkgO6S2UpYA_k8gA_fd5oK6ZctTG4dlRJ8oECC1xBuxNdk3Gldc5RENEFJ5FtflFJW7icT9W8VBe2QXuiQbbq_1IEvTHiMtr9Dx3Mr_G9uZyZxcLhbNeVZgKcUAgLmEytvgvD_oE4MAt7lWWXP3YgObx1c5C9FwL798NdfANaFc2l6ud6OoS3_7olzqtC9DKorr88lbYlzvSjX93DEQAXgO82dXVe02sybAda9QLk7kwAlPDGEnR8NesTYQgKqqy5FxuU1zwpax2p4SRH0GxNdEZN2yeI0fZQydXP8BaLs8gAAAEAR5BkKeN0liaUUisAijlw1XjY-CfMbvlTkCW2mt-gCu_YDB6aCPPG2YBUmNVUzD_ur_VuZrnoy7CUU7s_q6wIDAAAAwHsibmFtZSI6InZlY3Rvci50eHQiLCJzaXplIjozNiwibWltZVR5cGUiOiJ0ZXh0L3BsYWluIiwidXBsb2FkRGF0ZSI6MTczODg4NjQwMDAwMCwiZXhwaXJhdGlvbkRhdGUiOjE3NDE0Nzg0MDAwMDAsImVuY3J5cHRpb25Db25maWciOnsiZW5jcnlwdE1ldGFkYXRhIjpmYWxzZSwiYWxnb3JpdGhtIjoiS3liZXI3NjgrQUVTMjU2LUdDTSJ9fQ","privateKeyBase64Url":"8juHWKmSLmw_mgQqEDCtloDBZ6CD0zRaN7mde9VfMuAezdMF9cSOTgwY-GBDZgSsT9HLxpoUTvEUY9jBU-EbXIp22be7DVy9ybio4PaTkEmdLIOHyCbCyjczfARetutSTCGBZymzW-YoyFBYIuB2GIsMkGY7_guUGHtsBOAMEVHDx5pDKFaSFIKRmuO1SJOjODNd16gFBhzCRxg41WF9ifq_6Qw5IrOVufdG5OTL_dRQqdVWIZxzkOjJNkhw-GZ7cLQ4RmEvFudaKzhBHMYzEQcsNlNX5YOazEga4oQRQsWO6RukdTFFi_c1W5aey7SqFGvD_wU4nuoGfeZDCBkZeEKLrzKgz9JtA3k8xvnLyUO8laKSzYSF5CGcAvYz6iVivnZa_ccyftoqRrozQxaD1nElK8eqpuiXYhKZJYhQVQlTw1xB1mUL8iNpf_WovgwmaNwSH6oZPpsB17cKeVuFARhaUyqRb3hEfSwIfbsgtiJrjmh5VLoTlYKcFPYZFKGy7doRUlAD5ckUyAPFOktHqKuDiCl5_eFpupFd_SkDZaIO9Xh4h7md9jo-d3eWJUUVhvaPhJDDvHYuccqjDTVlQhS9qdFPIHFOYQchwCDBAhU5KdJ0gNUOkeyIEgk0DGNq6ICH8iCZF8QevsliI4WdP8Z3Yrqd_OKQHQGieRob6eWChNw1NrSNf1uAjKtYvVIOwnKnHqFiHvA3TSsOBTrPUhGwVnYrO2obBNqErBi-EKuB3vILcwUGV1i3goUM7HZaBCUb58i98aqMEfTOUKB-Y8XIrdujp9k8E9ViswWt_AyQ1cmgb4wVBSsM1jJRy0XP0aMUyZwIdARJYjyrkhhqlqVq0Aq2zdvMRyh9g9KVPvQd9KNNXotyDoC8g0IPQoybveGm8VDOXKGbJZgO40qbPpss1JK127GrFwqH5mJVVTEcyMhDHJMvuTd8-Zq_6yhBi0RXlUJ-Z-qeoMAH1-CPyUATtjoO1VmIu9e733xa9OWkKru6ttaMrYPHScCLdVAzueVMfze-OTowioiDwosnGPxHkSRc27qKe3Mx1rSJKGAK5oh7mmFrrJcUqEUGAtLNxGhuUdUB8HJ8-XiAXOOxCwFr8jKNDGjFO_ZTeCEQZkMceWYcPmgWaNd5eRsAe4ZhkMuWMKt5Yvk1kxSMBDlcBSdf_zaSQ3K4PrBsPfaBuBoSAKDAiiKKKnpoHGsQjffALsKjbuIF3RByKzOUx2AE6BNFSoQKSyyksWacyVR9FQdAOHt1T5HIqlg7qmwCPBKk87AUWzOQ5yWZQ4nFIkq_dMe8EdanBmWdSTG-xhOAdQwfoPBC8NUzcOScu-lMz5UV6KVDVIcsQ2UbY5tEaNlKi7mbmmrDLXYHLRZIJFKcctyW18U6UlC8Tdc6ZtKQ-UJvi1vH-WJVpSJxa5vKoKAw0PAvNOcIwvjKwjYenis-WLuAt2zDABitR7OzY1V6ugKOb9u1kSWW11c3Vyy5QoG7h8Kw-ueqvTw4m2a6rLAeTfBtzFF17wmAxYtmPjITzfxxX-ka_SgEklh1yotFRnGY6mUBNjhcn8FoV-SVdOo6rfp3f7OifKE5rpmvt0yYCxq58ZE5P2tjabMeKXOGYjHJMrSpUOSdvNAGPgfPw3V4XZxg9bq_gVpgcOhHyAMSdQy-9fh9Q2iNJ1BCVHokoFBIbAamwmYk8AZZHuxDTChIcnaklRIesri5MFAqA1Ew8wgbZXIAArAZ8WUCetnNaTS5gDJO-QlGYde02TfAHzHNoxahN-tj4jYrEHVwqkhjWzaPUdItsqZ34bBZsvoknCoMlRutUnhNNNVDQvcOrQFNu7Q6YqOOZNl9NhNwDmdgDtGDTAUrcsVkrKEBMNael7pocFo0ZHTJ25IXH3V-aWMhwsm3eqCBsdmcvFmt6lGRANJd7ld8jRvCUJSCREPGzKAy4old2HNZydsAHgS9ZnuaXJMUqVRHcxTD9IEK4iVxgWaIBNVAkkJuvLy9FLot74x37vqgAokGvRMqaaOeOOSpt0wN86cVscEniJlYDilITkm2w_sKm-wW_LuLe3Oe5zq6aEuBIOVV5lMK0-vMFQR09qS-aRyMzrCr-srMt2VTuEg3PCOThVNXScC1WRVqLbkrmJtCxKuQXuYw7tm56NMtRWOngQZ1KIaeb8Emv8uFMiBTJ4HLL0SbraeuoikGd9l8i9Fu4ZdXSLbIoYdbQKM-AqjO_-Jy8hQFOwiAn8gHZZJr6iaE10qoj9ElM9Cl6vaZtGlAF8Ue2hxgXqRy0XWG6Tl4VziNs_S26-U8Hbx9ePYZSTEVrQG7o_lzH5Z2QBMO2ipRzhxTblxmyPYxRtQje0mb3tteRwk3otexi1BZh9dXmocVDbiB9HGtv9m7o3S9Hha8eoC3kIVU7wukQyWSmJdzZkcVstycEVZMupAtJ3yQ76FhVKrLn3geOmUnt3eOGKcLrNFiGEhFbSyOwoGnEwpYN6yOBOFWxMsDOlyOKOw0XNeBt3q6r9WHeCCgArMOgtNS8bN_dPYVtnVu4MFMIoh-I8KwE7YXWJsnyPFabHpN61p84WuJS8XE0EleDPBjfUrOxpBC78EJROCZRbwoLhhZ-JDCbhIq2eAw7_eW4OeBpUajI3elGWWBWEQZoPam9dIeHkKVPhQLMeuuCkMFtve67IY7hOhmWNGDl_R2qHqGllkW7HdKEMgWFDdn2PoFBLETL9mfYAw7t_ZsvRYlcIWN5GWpBnzARQAONLMXo3VAFQSdePQHrambtxpArwqJt4tkYdUq7vYn6asDJIieKGzDdhrL8MRMY-d7H7R2jEFkGsSOZfyPE-q838OzPRd6ZSx6CToWOvmJE5VzgdFH5BothAm4x3ABXldPDAGGb-WCcHiKZXcIZ1KhSHihWOqOKmTOKGE13iGH2sOazCuObqxObqpW_cOaonUiYjnOyzyTVjV_0bIOlUknm2lTr9qYBYQdhFBjuvGxW3B2VqTLArN5KAuLaSkX7aRiT4k8_9LF4AwvYVOWOEkbWQerxoQW2QUHEZZIP9awptdkXqMCglgqL2ZBX3ia1tslCuI7iTYuJDpzwDuSDg70Z6f-jktlr5DdeFusqimm2DrwiVpcu0gYI40NIiOYumn9aI5gGhVTI8fhd6yX9M5Ij10c-yv57Z5kyTqGQ4xeU7kix5ZBqLKdNcfPMKFbrTADwUg-bKtj"}"""
    }
}
