// Client-side configuration
// Uses NEXT_PUBLIC_ environment variables that are available in the browser

export function getClientConfig() {
  return {
    sagaSmApiUrl: process.env.NEXT_PUBLIC_SAGA_SM_API_URL || 'http://localhost:3000',
    trpcBasePath: process.env.NEXT_PUBLIC_TRPC_BASE_PATH || '/trpc',
  }
}

export function getApiUrl() {
  return getClientConfig().sagaSmApiUrl
}

export function getTrpcUrl() {
  const config = getClientConfig()
  return `${config.sagaSmApiUrl}${config.trpcBasePath}`
}