'use client'

import React, { useState, useEffect } from 'react'
import { useApiUrl } from '../context/api-url-context'

interface ApiUrlEditorProps {
  className?: string
  showLabel?: boolean
  compact?: boolean
  onUrlChange?: (url: string) => void
}

export function ApiUrlEditor({
  className = '',
  showLabel = true,
  compact = false,
  onUrlChange
}: ApiUrlEditorProps) {
  const { apiUrl, setApiUrl, resetToDefault, isDefault, defaultApiUrl } = useApiUrl()
  const [inputValue, setInputValue] = useState(apiUrl)
  const [isValid, setIsValid] = useState(true)
  const [isTouched, setIsTouched] = useState(false)

  // Update input when context changes
  useEffect(() => {
    setInputValue(apiUrl)
  }, [apiUrl])

  // Validate URL format
  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return false
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setIsTouched(true)
    setIsValid(validateUrl(value))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid && inputValue.trim()) {
      setApiUrl(inputValue.trim())
      onUrlChange?.(inputValue.trim())
      setIsTouched(false)
    }
  }

  const handleReset = () => {
    resetToDefault()
    setInputValue(defaultApiUrl)
    setIsTouched(false)
    setIsValid(true)
    onUrlChange?.(defaultApiUrl)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any)
    } else if (e.key === 'Escape') {
      setInputValue(apiUrl)
      setIsTouched(false)
      setIsValid(true)
    }
  }

  const hasChanges = isTouched && inputValue !== apiUrl
  const canSubmit = isValid && hasChanges

  return (
    <div className={`api-url-editor ${className}`}>
      {showLabel && (
        <label className="api-url-editor__label">
          🔗 API Base URL
          {!isDefault && (
            <span className="api-url-editor__custom-indicator">
              (Custom)
            </span>
          )}
        </label>
      )}

      <form onSubmit={handleSubmit} className="api-url-editor__form">
        <div className="api-url-editor__input-group">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter API base URL (e.g., https://api.example.com)"
            className={`api-url-editor__input ${!isValid ? 'api-url-editor__input--error' : ''
              } ${hasChanges ? 'api-url-editor__input--changed' : ''}`}
          />

          <div className="api-url-editor__buttons">
            {canSubmit && (
              <button
                type="submit"
                className="api-url-editor__button api-url-editor__button--primary"
                title="Apply changes"
              >
                ✓
              </button>
            )}

            {hasChanges && (
              <button
                type="button"
                onClick={() => {
                  setInputValue(apiUrl)
                  setIsTouched(false)
                  setIsValid(true)
                }}
                className="api-url-editor__button api-url-editor__button--secondary"
                title="Cancel changes"
              >
                ✗
              </button>
            )}

            {!isDefault && (
              <button
                type="button"
                onClick={handleReset}
                className="api-url-editor__button api-url-editor__button--reset"
                title="Reset to default"
              >
                🔄
              </button>
            )}
          </div>
        </div>

        {!isValid && isTouched && (
          <div className="api-url-editor__error">
            Please enter a valid URL (e.g., https://api.example.com)
          </div>
        )}

        {!compact && (
          <div className="api-url-editor__info">
            <div className="api-url-editor__info-item">
              <strong>Current:</strong> {apiUrl}
            </div>
            <div className="api-url-editor__info-item">
              <strong>Default:</strong> {defaultApiUrl}
            </div>
            {!isDefault && (
              <div className="api-url-editor__info-item api-url-editor__info-item--warning">
                ⚠️ Using custom API URL - this will persist across browser sessions
              </div>
            )}
          </div>
        )}
      </form>

      <style jsx>{`
        .api-url-editor {
          margin: 1rem 0;
        }

        .api-url-editor__label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #374151;
        }

        .api-url-editor__custom-indicator {
          color: #f59e0b;
          font-weight: normal;
          margin-left: 0.5rem;
        }

        .api-url-editor__form {
          width: 100%;
        }

        .api-url-editor__input-group {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .api-url-editor__input {
          flex: 1;
          padding: 0.75rem;
          border: 2px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          transition: all 0.2s;
          font-family: var(--font-geist-mono, monospace);
        }

        .api-url-editor__input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .api-url-editor__input--error {
          border-color: #ef4444;
        }

        .api-url-editor__input--changed {
          border-color: #f59e0b;
          background-color: #fffbeb;
        }

        .api-url-editor__buttons {
          display: flex;
          gap: 0.25rem;
        }

        .api-url-editor__button {
          padding: 0.75rem;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .api-url-editor__button--primary {
          background-color: #10b981;
          color: white;
        }

        .api-url-editor__button--primary:hover {
          background-color: #059669;
        }

        .api-url-editor__button--secondary {
          background-color: #6b7280;
          color: white;
        }

        .api-url-editor__button--secondary:hover {
          background-color: #4b5563;
        }

        .api-url-editor__button--reset {
          background-color: #f59e0b;
          color: white;
        }

        .api-url-editor__button--reset:hover {
          background-color: #d97706;
        }

        .api-url-editor__error {
          margin-top: 0.5rem;
          color: #ef4444;
          font-size: 0.875rem;
        }

        .api-url-editor__info {
          margin-top: 1rem;
          padding: 1rem;
          background-color: #f9fafb;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }

        .api-url-editor__info-item {
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .api-url-editor__info-item:last-child {
          margin-bottom: 0;
        }

        .api-url-editor__info-item--warning {
          color: #f59e0b;
          font-weight: 500;
        }

        .api-url-editor__info-item strong {
          color: #374151;
        }
      `}</style>
    </div>
  )
}

