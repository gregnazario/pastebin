/**
 * Shelby server functions
 * These run on the server and handle all Shelby protocol interactions
 */

import {
  Account,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Network,
  PrivateKey,
  PrivateKeyVariants,
} from '@aptos-labs/ts-sdk'
import {
  createDefaultErasureCodingProvider,
  expectedTotalChunksets,
  generateCommitments,
  ShelbyBlobClient,
  ShelbyNodeClient,
} from '@shelby-protocol/sdk/node'
import { createServerFn } from '@tanstack/react-start'

// Server-side configuration (only available on server)
const getConfig = () => ({
  apiKey: process.env.SHELBY_API_KEY || '',
  privateKey: process.env.SHELBY_PRIVATE_KEY || '',
  defaultExpirationDays: parseInt(process.env.DEFAULT_EXPIRATION_DAYS || '30', 10),
})

// Singleton client instance
let shelbyClient: ShelbyNodeClient | null = null
let aptosClient: Aptos | null = null
let serviceAccount: Account | null = null

function getClients() {
  const config = getConfig()

  if (!shelbyClient) {
    shelbyClient = new ShelbyNodeClient({
      network: Network.SHELBYNET,
      apiKey: config.apiKey,
    })
  }

  if (!aptosClient) {
    aptosClient = new Aptos(
      new AptosConfig({
        network: Network.SHELBYNET,
      }),
    )
  }

  if (!serviceAccount && config.privateKey) {
    const privateKey = new Ed25519PrivateKey(
      PrivateKey.formatPrivateKey(config.privateKey, PrivateKeyVariants.Ed25519),
    )
    serviceAccount = Account.fromPrivateKey({ privateKey })
  }

  return { shelbyClient, aptosClient, serviceAccount }
}

/**
 * Upload encrypted data to Shelby
 */
export const uploadBlob = createServerFn({ method: 'POST' })
  .inputValidator((d: { data: number[]; filename: string }) => d)
  .handler(async ({ data: input }) => {
    const { shelbyClient, aptosClient, serviceAccount } = getClients()
    const config = getConfig()

    if (!serviceAccount || !shelbyClient || !aptosClient) {
      throw new Error('Shelby not configured - check SHELBY_PRIVATE_KEY and SHELBY_API_KEY')
    }

    const data = new Uint8Array(input.data)
    const filename = input.filename

    console.log(`[Shelby] Uploading: ${filename} (${data.length} bytes)`)

    // Step 1: Encode and generate commitments
    const provider = await createDefaultErasureCodingProvider()
    const commitments = await generateCommitments(provider, Buffer.from(data))

    // Step 2: Register on-chain
    const blobName = `pastebin-${Date.now()}-${filename}`
    const expirationMicros =
      (Date.now() + config.defaultExpirationDays * 24 * 60 * 60 * 1000) * 1000

    const payload = ShelbyBlobClient.createRegisterBlobPayload({
      account: serviceAccount.accountAddress,
      blobName,
      blobMerkleRoot: commitments.blob_merkle_root,
      numChunksets: expectedTotalChunksets(commitments.raw_data_size),
      expirationMicros,
      blobSize: commitments.raw_data_size,
    })

    const transaction = await aptosClient.transaction.build.simple({
      sender: serviceAccount.accountAddress,
      data: payload,
    })

    const pendingTx = await aptosClient.signAndSubmitTransaction({
      signer: serviceAccount,
      transaction,
    })

    await aptosClient.waitForTransaction({
      transactionHash: pendingTx.hash,
    })

    console.log(`[Shelby] Registered: ${pendingTx.hash}`)

    // Step 3: Upload to RPC
    await shelbyClient.rpc.putBlob({
      account: serviceAccount.accountAddress.toString(),
      blobName,
      blobData: data,
    })

    console.log(`[Shelby] Upload complete: ${blobName}`)

    return {
      id: blobName,
      expiresAt: Date.now() + config.defaultExpirationDays * 24 * 60 * 60 * 1000,
    }
  })

/**
 * Download encrypted data from Shelby
 */
export const downloadBlob = createServerFn({ method: 'GET' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data: input }) => {
    const { shelbyClient, serviceAccount } = getClients()

    if (!serviceAccount || !shelbyClient) {
      throw new Error('Shelby not configured')
    }

    console.log(`[Shelby] Downloading: ${input.id}`)

    const result = await shelbyClient.rpc.getBlob({
      account: serviceAccount.accountAddress.toString(),
      blobName: input.id,
    })

    if (!result?.readable) {
      throw new Error('Blob not found')
    }

    // Read stream into buffer
    const reader = result.readable.getReader()
    const chunks: Uint8Array[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    const data = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      data.set(chunk, offset)
      offset += chunk.length
    }

    // Return as array of numbers (serializable)
    return {
      data: Array.from(data),
    }
  })

/**
 * Check server health and Shelby configuration
 */
export const checkHealth = createServerFn({ method: 'GET' }).handler(async () => {
  const { serviceAccount } = getClients()
  const config = getConfig()

  return {
    configured: !!config.apiKey && !!config.privateKey,
    account: serviceAccount?.accountAddress.toString() || null,
  }
})
