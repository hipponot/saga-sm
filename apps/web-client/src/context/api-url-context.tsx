'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getClientConfig } from '../config/client-config'

interface ApiUrlContextType {
  apiUrl: string
  trpcBasePath: string
  trpcUrl: string
  setApiUrl: (url: string) => void
  setTrpcBasePath: (path: string) => void
  resetToDefault: () => void
  isDefault: boolean
  defaultApiUrl: string
  defaultTrpcBasePath: string
}

const ApiUrlContext = createContext<ApiUrlContextType | undefined>(undefined)

interface ApiUrlProviderProps {
  children: ReactNode
}

const API_URL_STORAGE_KEY = 'saga-sm-custom-api-url'
const TRPC_BASE_PATH_STORAGE_KEY = 'saga-sm-custom-trpc-base-path'

export function ApiUrlProvider({ children }: ApiUrlProviderProps) {
  const config = getClientConfig()
  const defaultApiUrl = config.sagaSmApiUrl
  const defaultTrpcBasePath = config.trpcBasePath

  const [apiUrl, setApiUrlState] = useState<string>(defaultApiUrl)
  const [trpcBasePath, setTrpcBasePathState] = useState<string>(defaultTrpcBasePath)

  // Initialize from localStorage on mount
  useEffect(() => {
    try {
      const savedUrl = localStorage.getItem(API_URL_STORAGE_KEY)
      if (savedUrl && savedUrl !== defaultApiUrl) {
        setApiUrlState(savedUrl)
      }

      const savedBasePath = localStorage.getItem(TRPC_BASE_PATH_STORAGE_KEY)
      if (savedBasePath && savedBasePath !== defaultTrpcBasePath) {
        setTrpcBasePathState(savedBasePath)
      }
    } catch (error) {
      console.warn('Failed to load custom API settings from localStorage:', error)
    }
  }, [defaultApiUrl, defaultTrpcBasePath])

  // Save API URL to localStorage when it changes
  useEffect(() => {
    try {
      if (apiUrl !== defaultApiUrl) {
        localStorage.setItem(API_URL_STORAGE_KEY, apiUrl)
      } else {
        localStorage.removeItem(API_URL_STORAGE_KEY)
      }
    } catch (error) {
      console.warn('Failed to save custom API URL to localStorage:', error)
    }
  }, [apiUrl, defaultApiUrl])

  // Save TRPC base path to localStorage when it changes
  useEffect(() => {
    try {
      if (trpcBasePath !== defaultTrpcBasePath) {
        localStorage.setItem(TRPC_BASE_PATH_STORAGE_KEY, trpcBasePath)
      } else {
        localStorage.removeItem(TRPC_BASE_PATH_STORAGE_KEY)
      }
    } catch (error) {
      console.warn('Failed to save custom TRPC base path to localStorage:', error)
    }
  }, [trpcBasePath, defaultTrpcBasePath])

  const setApiUrl = (url: string) => {
    // Normalize URL (remove trailing slash)
    const normalizedUrl = url.replace(/\/$/, '')
    setApiUrlState(normalizedUrl)
  }

  const setTrpcBasePath = (path: string) => {
    // Normalize path (ensure it starts with /)
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    setTrpcBasePathState(normalizedPath)
  }

  const resetToDefault = () => {
    setApiUrlState(defaultApiUrl)
    setTrpcBasePathState(defaultTrpcBasePath)
  }

  const isDefault = apiUrl === defaultApiUrl && trpcBasePath === defaultTrpcBasePath

  const trpcUrl = `${apiUrl}${trpcBasePath}`

  const value: ApiUrlContextType = {
    apiUrl,
    trpcBasePath,
    trpcUrl,
    setApiUrl,
    setTrpcBasePath,
    resetToDefault,
    isDefault,
    defaultApiUrl,
    defaultTrpcBasePath
  }

  return (
    <ApiUrlContext.Provider value={value}>
      {children}
    </ApiUrlContext.Provider>
  )
}

export function useApiUrl(): ApiUrlContextType {
  const context = useContext(ApiUrlContext)
  if (context === undefined) {
    throw new Error('useApiUrl must be used within an ApiUrlProvider')
  }
  return context
}

// Hook for backward compatibility - returns the current dynamic API URL
export function useDynamicApiUrl(): string {
  const { apiUrl } = useApiUrl()
  return apiUrl
}

// Hook for getting the current tRPC URL
export function useDynamicTrpcUrl(): string {
  const { trpcUrl } = useApiUrl()
  return trpcUrl
}

