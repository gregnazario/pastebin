/**
 * Non-destructive smoke checks for shared backend environments.
 * Validates health/capabilities schema parity and request tracing headers.
 */

type HealthResponse = {
  configured: boolean
  account: string | null
}

type CapabilitiesResponse = {
  apiVersion: string
  maxUploadBytes: number
  maxFilenameLength: number
  rateLimitWindowMs: number
  maxUploadsPerWindow: number
  maxDownloadsPerWindow: number
}

type EndpointResult = {
  endpoint: string
  status: number
  latencyMs: number
  requestId: string | null
  ok: boolean
  note?: string
}

type TargetResult = {
  baseUrl: string
  ok: boolean
  endpointResults: EndpointResult[]
}

function parseTargets(): string[] {
  const raw = process.env.BACKEND_SMOKE_TARGETS
    ?? 'https://pastebin.sed.fyi,https://staging.pastebin.sed.fyi'
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

function validateHealth(payload: unknown): payload is HealthResponse {
  if (!payload || typeof payload !== 'object') return false
  const data = payload as Record<string, unknown>
  return (
    typeof data.configured === 'boolean'
    && (data.account === null || typeof data.account === 'string')
  )
}

function validateCapabilities(payload: unknown): payload is CapabilitiesResponse {
  if (!payload || typeof payload !== 'object') return false
  const data = payload as Record<string, unknown>
  return (
    typeof data.apiVersion === 'string'
    && typeof data.maxUploadBytes === 'number'
    && typeof data.maxFilenameLength === 'number'
    && typeof data.rateLimitWindowMs === 'number'
    && typeof data.maxUploadsPerWindow === 'number'
    && typeof data.maxDownloadsPerWindow === 'number'
  )
}

async function runCheck(baseUrl: string, endpoint: string): Promise<EndpointResult> {
  const requestId = `smoke-${crypto.randomUUID()}`
  const started = Date.now()

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'X-Client-Platform': 'web',
        'X-Client-Version': 'smoke-check',
        'X-Request-Id': requestId,
      },
    })
    const latencyMs = Date.now() - started
    const traceHeader = response.headers.get('x-request-id')
    const body = await response.json().catch(() => null)

    if (response.status !== 200) {
      return {
        endpoint,
        status: response.status,
        latencyMs,
        requestId: traceHeader,
        ok: false,
        note: `Unexpected status ${response.status}`,
      }
    }

    const schemaOk =
      endpoint === '/api/v1/health'
        ? validateHealth(body)
        : validateCapabilities(body)

    if (!schemaOk) {
      return {
        endpoint,
        status: response.status,
        latencyMs,
        requestId: traceHeader,
        ok: false,
        note: 'Schema validation failed',
      }
    }

    if (!traceHeader) {
      return {
        endpoint,
        status: response.status,
        latencyMs,
        requestId: traceHeader,
        ok: false,
        note: 'Missing x-request-id response header',
      }
    }

    return {
      endpoint,
      status: response.status,
      latencyMs,
      requestId: traceHeader,
      ok: true,
    }
  } catch (error) {
    return {
      endpoint,
      status: 0,
      latencyMs: Date.now() - started,
      requestId: null,
      ok: false,
      note: error instanceof Error ? error.message : 'Unknown network error',
    }
  }
}

async function run(): Promise<void> {
  const targets = parseTargets()
  const results: TargetResult[] = []
  let failures = 0

  for (const baseUrl of targets) {
    const parsed = new URL(baseUrl)
    if (parsed.protocol !== 'https:' && !isLocalHost(parsed.hostname)) {
      console.error(`Refusing non-HTTPS target outside localhost: ${baseUrl}`)
      failures++
      continue
    }

    const health = await runCheck(baseUrl, '/api/v1/health')
    const capabilities = await runCheck(baseUrl, '/api/v1/capabilities')
    const endpointResults = [health, capabilities]
    const ok = endpointResults.every((item) => item.ok)

    if (!ok) failures++
    results.push({ baseUrl, ok, endpointResults })
  }

  console.log('Shared Backend Smoke Check Results')
  console.log('| Target | Endpoint | Status | Latency (ms) | Trace Header | Result | Notes |')
  console.log('| --- | --- | --- | --- | --- | --- | --- |')
  for (const target of results) {
    for (const item of target.endpointResults) {
      console.log(
        `| ${target.baseUrl} | ${item.endpoint} | ${item.status} | ${item.latencyMs} | ${item.requestId ?? 'missing'} | ${item.ok ? 'PASS' : 'FAIL'} | ${item.note ?? ''} |`,
      )
    }
  }

  if (failures > 0) {
    console.error(`Smoke checks failed for ${failures} target(s).`)
    process.exit(1)
  }

  console.log('Smoke checks passed for all targets.')
}

void run().catch((error) => {
  console.error(error)
  process.exit(1)
})
