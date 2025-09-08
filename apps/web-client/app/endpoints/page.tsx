'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { TrpcClientService } from '@/services/trpc-client-service'
import { TrpcCurlService } from '@/services/trpc-curl-service'
import { SCHEDULE_ENDPOINTS } from '@/services/endpoints'
import { Endpoint, ApiResponse, ServiceInterface } from '@/services/types'

export default function EndpointsPage() {
    const [selectedEndpoint, setSelectedEndpoint] = useState&lt;Endpoint | null&gt;(null)
    const [inputValue, setInputValue] = useState('')
    const [response, setResponse] = useState&lt;ApiResponse | null&gt;(null)
    const [loading, setLoading] = useState(false)
    const [serviceType, setServiceType] = useState&lt;'trpc' | 'curl'&gt;('trpc')
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
        &lt;div className={styles.container}&gt;
            &lt;header className={styles.header}&gt;
                &lt;Link href="/" className={styles.backLink}&gt;← Back to Home&lt;/Link&gt;
                &lt;h1&gt;Schedule API Endpoint Explorer&lt;/h1&gt;
                &lt;p&gt;Interactive testing interface for schedule management endpoints&lt;/p&gt;
            &lt;/header&gt;

            &lt;div className={styles.content}&gt;
                &lt;div className={styles.sidebar}&gt;
                    &lt;h2&gt;Endpoints&lt;/h2&gt;
                    &lt;div className={styles.endpointList}&gt;
                        {SCHEDULE_ENDPOINTS.map((endpoint) =&gt; (
                            &lt;button
                                key={endpoint.id}
                                className={`${styles.endpointItem} ${
                                    selectedEndpoint?.id === endpoint.id ? styles.active : ''
                                }`}
                                onClick={() =&gt; setSelectedEndpoint(endpoint)}
                            &gt;
                                &lt;div className={styles.endpointMethod}&gt;{endpoint.method}&lt;/div&gt;
                                &lt;div className={styles.endpointName}&gt;{endpoint.name}&lt;/div&gt;
                            &lt;/button&gt;
                        ))}
                    &lt;/div&gt;
                &lt;/div&gt;

                &lt;div className={styles.main}&gt;
                    {selectedEndpoint ? (
                        &lt;&gt;
                            &lt;div className={styles.endpointDetails}&gt;
                                &lt;h2&gt;{selectedEndpoint.name}&lt;/h2&gt;
                                &lt;p&gt;{selectedEndpoint.description}&lt;/p&gt;
                                &lt;code&gt;{selectedEndpoint.url}&lt;/code&gt;
                            &lt;/div&gt;

                            &lt;div className={styles.serviceToggle}&gt;
                                &lt;label&gt;
                                    &lt;input
                                        type="radio"
                                        value="trpc"
                                        checked={serviceType === 'trpc'}
                                        onChange={(e) =&gt; setServiceType(e.target.value as 'trpc' | 'curl')}
                                    /&gt;
                                    tRPC Client
                                &lt;/label&gt;
                                &lt;label&gt;
                                    &lt;input
                                        type="radio"
                                        value="curl"
                                        checked={serviceType === 'curl'}
                                        onChange={(e) =&gt; setServiceType(e.target.value as 'trpc' | 'curl')}
                                    /&gt;
                                    HTTP/cURL
                                &lt;/label&gt;
                            &lt;/div&gt;

                            {selectedEndpoint.inputType && (
                                &lt;div className={styles.inputSection}&gt;
                                    &lt;h3&gt;Input Parameters&lt;/h3&gt;
                                    &lt;textarea
                                        className={styles.inputArea}
                                        value={inputValue}
                                        onChange={(e) =&gt; setInputValue(e.target.value)}
                                        placeholder="Enter JSON input parameters..."
                                        rows={6}
                                    /&gt;
                                &lt;/div&gt;
                            )}

                            &lt;div className={styles.actions}&gt;
                                &lt;button 
                                    className="btn-primary" 
                                    onClick={executeEndpoint}
                                    disabled={loading}
                                &gt;
                                    {loading ? 'Executing...' : 'Execute Endpoint'}
                                &lt;/button&gt;
                            &lt;/div&gt;

                            {generatedCode && (
                                &lt;div className={styles.codeSection}&gt;
                                    &lt;div className={styles.codeHeader}&gt;
                                        &lt;h3&gt;Generated Code&lt;/h3&gt;
                                        &lt;button 
                                            className="btn-secondary"
                                            onClick={() =&gt; copyToClipboard(generatedCode)}
                                        &gt;
                                            Copy
                                        &lt;/button&gt;
                                    &lt;/div&gt;
                                    &lt;pre className={styles.codeBlock}&gt;{generatedCode}&lt;/pre&gt;
                                &lt;/div&gt;
                            )}

                            {response && (
                                &lt;div className={styles.responseSection}&gt;
                                    &lt;div className={styles.responseHeader}&gt;
                                        &lt;h3&gt;Response&lt;/h3&gt;
                                        &lt;div className={styles.responseStats}&gt;
                                            &lt;span className={`${styles.status} ${response.success ? styles.success : styles.error}`}&gt;
                                                {response.success ? 'SUCCESS' : 'ERROR'}
                                            &lt;/span&gt;
                                            &lt;span className={styles.duration}&gt;{response.duration}ms&lt;/span&gt;
                                        &lt;/div&gt;
                                    &lt;/div&gt;
                                    &lt;pre className={styles.responseBody}&gt;
                                        {JSON.stringify(response.data || response.error, null, 2)}
                                    &lt;/pre&gt;
                                &lt;/div&gt;
                            )}
                        &lt;/&gt;
                    ) : (
                        &lt;div className={styles.placeholder}&gt;
                            &lt;h2&gt;Select an Endpoint&lt;/h2&gt;
                            &lt;p&gt;Choose an endpoint from the sidebar to start testing&lt;/p&gt;
                        &lt;/div&gt;
                    )}
                &lt;/div&gt;
            &lt;/div&gt;
        &lt;/div&gt;
    )
}