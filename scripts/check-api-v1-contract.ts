/**
 * Contract guard for API v1 OpenAPI documentation.
 * Ensures required routes and schema fields remain present for native/web parity.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const contractPath = resolve(process.cwd(), 'design-docs/native-api-v1-openapi.yaml')
const contract = readFileSync(contractPath, 'utf8')

const requiredSnippets = [
  'version: 1.1.0',
  '/api/v1/capabilities:',
  '/api/v1/health:',
  '/api/v1/upload:',
  '/api/v1/download:',
  '/api/v1/download/{id}:',
  'CapabilitiesResponse:',
  'apiVersion:',
  'maxUploadBytes:',
  'maxFilenameLength:',
  'rateLimitWindowMs:',
  'maxUploadsPerWindow:',
  'maxDownloadsPerWindow:',
]

const missing = requiredSnippets.filter((snippet) => !contract.includes(snippet))

if (missing.length > 0) {
  console.error('API v1 contract check failed. Missing snippets:')
  for (const snippet of missing) {
    console.error(`- ${snippet}`)
  }
  process.exit(1)
}

console.log('API v1 contract check passed.')
