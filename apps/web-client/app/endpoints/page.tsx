'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { TrpcClientService } from '@/services/trpc-client-service'
import { TrpcCurlService } from '@/services/trpc-curl-service'
import { EXAMPLE_ENDPOINTS } from '@/services/endpoints'
import { Endpoint, ApiResponse, ServiceInterface } from '@/services/types'

export default function EndpointsPage() {
    const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null)
    const [inputValue, setInputValue] = useState('')
    const [response, setResponse] = useState<ApiResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [serviceType, setServiceType] = useState<'trpc' | 'curl'>('trpc')
    const [generatedCode, setGeneratedCode] = useState('')

    const trpcService = new TrpcClientService()
    const curlService = new TrpcCurlService()

    useEffect(() => {
        if (selectedEndpoint) {
            setInputValue(selectedEndpoint.sampleInput || '')
            generateCode()
        }
    }, [selectedEndpoint, serviceType])

    useEffect(() => {
        generateCode()
    }, [inputValue])

    const generateCode = () => {
        if (!selectedEndpoint) return
        
        const service = serviceType === 'trpc' ? trpcService : curlService
        const code = service.generateCode(selectedEndpoint, inputValue)
        setGeneratedCode(code)
    }

    const executeEndpoint = async () => {
        if (!selectedEndpoint) return

        setLoading(true)
        setResponse(null)

        const service: ServiceInterface = serviceType === 'trpc' ? trpcService : curlService
        const result = await service.executeEndpoint(selectedEndpoint, inputValue)
        
        setResponse(result)
        setLoading(false)
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backLink}>← Back to Home</Link>
                <h1>Example API Endpoint Explorer</h1>
                <p>Interactive testing interface for example management endpoints</p>
            </header>

            <div className={styles.content}>
                <div className={styles.sidebar}>
                    <h2>Endpoints</h2>
                    <div className={styles.endpointList}>
                        {EXAMPLE_ENDPOINTS.map((endpoint) => (
                            <button
                                key={endpoint.id}
                                className={`${styles.endpointItem} ${
                                    selectedEndpoint?.id === endpoint.id ? styles.active : ''
                                }`}
                                onClick={() => setSelectedEndpoint(endpoint)}
                            >
                                <div className={styles.endpointMethod}>{endpoint.method}</div>
                                <div className={styles.endpointName}>{endpoint.name}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.main}>
                    {selectedEndpoint ? (
                        <>
                            <div className={styles.endpointDetails}>
                                <h2>{selectedEndpoint.name}</h2>
                                <p>{selectedEndpoint.description}</p>
                                <code>{selectedEndpoint.url}</code>
                            </div>

                            <div className={styles.serviceToggle}>
                                <label>
                                    <input
                                        type="radio"
                                        value="trpc"
                                        checked={serviceType === 'trpc'}
                                        onChange={(e) => setServiceType(e.target.value as 'trpc' | 'curl')}
                                    />
                                    tRPC Client
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        value="curl"
                                        checked={serviceType === 'curl'}
                                        onChange={(e) => setServiceType(e.target.value as 'trpc' | 'curl')}
                                    />
                                    HTTP/cURL
                                </label>
                            </div>

                            {selectedEndpoint.inputType && (
                                <div className={styles.inputSection}>
                                    <h3>Input Parameters</h3>
                                    <textarea
                                        className={styles.inputArea}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder="Enter JSON input parameters..."
                                        rows={6}
                                    />
                                </div>
                            )}

                            <div className={styles.actions}>
                                <button 
                                    className="btn-primary" 
                                    onClick={executeEndpoint}
                                    disabled={loading}
                                >
                                    {loading ? 'Executing...' : 'Execute Endpoint'}
                                </button>
                            </div>

                            {generatedCode && (
                                <div className={styles.codeSection}>
                                    <div className={styles.codeHeader}>
                                        <h3>Generated Code</h3>
                                        <button 
                                            className="btn-secondary"
                                            onClick={() => copyToClipboard(generatedCode)}
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <pre className={styles.codeBlock}>{generatedCode}</pre>
                                </div>
                            )}

                            {response && (
                                <div className={styles.responseSection}>
                                    <div className={styles.responseHeader}>
                                        <h3>Response</h3>
                                        <div className={styles.responseStats}>
                                            <span className={`${styles.status} ${response.success ? styles.success : styles.error}`}>
                                                {response.success ? 'SUCCESS' : 'ERROR'}
                                            </span>
                                            <span className={styles.duration}>{response.duration}ms</span>
                                        </div>
                                    </div>
                                    <pre className={styles.responseBody}>
                                        {JSON.stringify(response.data || response.error, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className={styles.placeholder}>
                            <h2>Select an Endpoint</h2>
                            <p>Choose an endpoint from the sidebar to start testing</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}