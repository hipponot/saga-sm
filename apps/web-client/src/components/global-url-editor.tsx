'use client'

import React, { useState } from 'react'
import { useApiUrl } from '../context/api-url-context'

export function GlobalUrlEditor() {
    const { apiUrl, trpcBasePath, setApiUrl, setTrpcBasePath, isDefault, resetToDefault } = useApiUrl()
    const [isEditing, setIsEditing] = useState(false)
    const [tempApiUrl, setTempApiUrl] = useState(apiUrl)
    const [tempBasePath, setTempBasePath] = useState(trpcBasePath)

    // Update temp values when context changes
    React.useEffect(() => {
        setTempApiUrl(apiUrl)
        setTempBasePath(trpcBasePath)
    }, [apiUrl, trpcBasePath])

    const handleApply = () => {
        if (tempApiUrl !== apiUrl) {
            setApiUrl(tempApiUrl)
        }
        if (tempBasePath !== trpcBasePath) {
            setTrpcBasePath(tempBasePath)
        }
        setIsEditing(false)
    }

    const handleReset = () => {
        resetToDefault()
        setIsEditing(false)
    }

    const handleCancel = () => {
        setTempApiUrl(apiUrl)
        setTempBasePath(trpcBasePath)
        setIsEditing(false)
    }

    // Truncate long URLs for display
    const truncateUrl = (url: string, maxLength: number = 30) => {
        if (url.length <= maxLength) return url
        return url.substring(0, maxLength - 3) + '...'
    }

    return (
        <div className="global-url-editor">
            {!isEditing ? (
                /* Always visible display panel */
                <div className="url-display-panel">
                    <div className="panel-header">
                        <span className="panel-title">API Config {!isDefault && <span className="custom-badge">Custom</span>}</span>
                        <button onClick={() => setIsEditing(true)} className="edit-button" title="Edit API Configuration">
                            ✏️
                        </button>
                    </div>
                    <div className="url-display">
                        <div className="url-row">
                            <span className="url-label">API:</span>
                            <span className="url-value api-url" title={apiUrl}>{truncateUrl(apiUrl)}</span>
                        </div>
                        <div className="url-row">
                            <span className="url-label">Path:</span>
                            <span className="url-value path-url" title={trpcBasePath}>{trpcBasePath}</span>
                        </div>
                    </div>
                </div>
            ) : (
                /* Editing panel */
                <div className="url-editor-panel">
                    <div className="panel-header">
                        <span className="panel-title">Edit API Config</span>
                        <button onClick={handleCancel} className="close-button">×</button>
                    </div>

                    <div className="editor-content">
                        <div className="input-group">
                            <label>API Base URL</label>
                            <input
                                type="text"
                                value={tempApiUrl}
                                onChange={(e) => setTempApiUrl(e.target.value)}
                                placeholder="https://api.example.com"
                                className="url-input"
                            />
                        </div>

                        <div className="input-group">
                            <label>tRPC Base Path</label>
                            <input
                                type="text"
                                value={tempBasePath}
                                onChange={(e) => setTempBasePath(e.target.value)}
                                placeholder="/trpc"
                                className="url-input"
                            />
                        </div>

                        <div className="url-preview">
                            <strong>Full URL:</strong>
                            <div className="preview-url">
                                <span className="api-part">{tempApiUrl}</span>
                                <span className="path-part">{tempBasePath}</span>
                            </div>
                        </div>

                        <div className="button-group">
                            <button onClick={handleApply} className="apply-button">
                                Apply
                            </button>
                            {!isDefault && (
                                <button onClick={handleReset} className="reset-button">
                                    Reset
                                </button>
                            )}
                            <button onClick={handleCancel} className="cancel-button">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
        .global-url-editor {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 1000;
        }

        /* Always visible display panel */
        .url-display-panel {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          min-width: 250px;
          font-size: 0.875rem;
        }

        .url-display-panel:hover {
          box-shadow: 0 8px 15px -3px rgba(0, 0, 0, 0.15);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          border-bottom: 1px solid #f3f4f6;
          background: #f9fafb;
          border-radius: 0.5rem 0.5rem 0 0;
        }

        .panel-title {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }

        .custom-badge {
          background: #f59e0b;
          color: white;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.625rem;
          margin-left: 0.5rem;
        }

        .edit-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          color: #6b7280;
          font-size: 1rem;
          transition: color 0.2s;
        }

        .edit-button:hover {
          color: #374151;
        }

        .url-display {
          padding: 0.75rem;
        }

        .url-row {
          display: flex;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .url-row:last-child {
          margin-bottom: 0;
        }

        .url-label {
          color: #6b7280;
          font-weight: 500;
          min-width: 3rem;
          margin-right: 0.5rem;
        }

        .url-value {
          font-family: var(--font-geist-mono, monospace);
          font-size: 0.75rem;
          flex: 1;
        }

        .api-url {
          color: #3b82f6;
        }

        .path-url {
          color: #10b981;
        }

        /* Editor panel */
        .url-editor-panel {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          width: 350px;
          max-width: 90vw;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #6b7280;
          cursor: pointer;
          padding: 0;
          width: 1.5rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-button:hover {
          color: #374151;
        }

        .editor-content {
          padding: 1rem;
        }

        .input-group {
          margin-bottom: 1rem;
        }

        .input-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .url-input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-family: var(--font-geist-mono, monospace);
          transition: border-color 0.2s;
        }

        .url-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .url-preview {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          padding: 0.75rem;
          margin-bottom: 1rem;
        }

        .url-preview strong {
          display: block;
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }

        .preview-url {
          font-family: var(--font-geist-mono, monospace);
          font-size: 0.875rem;
          word-break: break-all;
        }

        .api-part {
          color: #3b82f6;
        }

        .path-part {
          color: #10b981;
        }

        .button-group {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }

        .apply-button {
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .apply-button:hover {
          background: #2563eb;
        }

        .reset-button {
          background: #f59e0b;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .reset-button:hover {
          background: #d97706;
        }

        .cancel-button {
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .cancel-button:hover {
          background: #4b5563;
        }

        /* Mobile responsive */
        @media (max-width: 640px) {
          .global-url-editor {
            top: 0.5rem;
            right: 0.5rem;
          }

          .url-display-panel {
            min-width: 200px;
          }

          .url-editor-panel {
            width: 300px;
          }
        }
      `}</style>
        </div>
    )
}
