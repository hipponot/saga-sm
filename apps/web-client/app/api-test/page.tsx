'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

export default function ApiTestPage() {
    const [isConnected, setIsConnected] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [lastPing, setLastPing] = useState&lt;string | null&gt;(null)

    const testConnection = async () => {
        setIsLoading(true)
        try {
            // This would connect to the actual API
            const response = await fetch('http://localhost:3000/health', {
                method: 'GET',
            })
            
            if (response.ok) {
                setIsConnected(true)
                setLastPing(new Date().toISOString())
            } else {
                setIsConnected(false)
            }
        } catch (error) {
            setIsConnected(false)
            console.error('Connection test failed:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        &lt;div className={styles.container}&gt;
            &lt;header className={styles.header}&gt;
                &lt;Link href="/" className={styles.backLink}&gt;← Back to Home&lt;/Link&gt;
                &lt;h1&gt;API Connection Test&lt;/h1&gt;
                &lt;p&gt;Test connectivity and basic functionality of the schedule management API&lt;/p&gt;
            &lt;/header&gt;

            &lt;main className={styles.main}&gt;
                &lt;div className={styles.connectionCard}&gt;
                    &lt;h2&gt;Connection Status&lt;/h2&gt;
                    &lt;div className={styles.statusIndicator}&gt;
                        &lt;div 
                            className={`${styles.statusLight} ${isConnected ? styles.connected : styles.disconnected} ${isLoading ? styles.pulsing : ''}`}
                        &gt;&lt;/div&gt;
                        &lt;span className={styles.statusText}&gt;
                            {isLoading ? 'Testing...' : isConnected ? 'Connected' : 'Disconnected'}
                        &lt;/span&gt;
                    &lt;/div&gt;
                    
                    {lastPing && (
                        &lt;p className={styles.lastPing}&gt;
                            Last successful ping: {new Date(lastPing).toLocaleString()}
                        &lt;/p&gt;
                    )}

                    &lt;button 
                        className="btn-primary"
                        onClick={testConnection}
                        disabled={isLoading}
                    &gt;
                        {isLoading ? 'Testing Connection...' : 'Test Connection'}
                    &lt;/button&gt;
                &lt;/div&gt;

                &lt;div className={styles.quickActions}&gt;
                    &lt;h2&gt;Quick Actions&lt;/h2&gt;
                    &lt;div className={styles.actionGrid}&gt;
                        &lt;Link href="/endpoints" className={styles.actionCard}&gt;
                            &lt;h3&gt;Endpoint Explorer&lt;/h3&gt;
                            &lt;p&gt;Interactive testing of all API endpoints&lt;/p&gt;
                        &lt;/Link&gt;
                        
                        &lt;Link href="/schedule-demo" className={styles.actionCard}&gt;
                            &lt;h3&gt;Schedule Demo&lt;/h3&gt;
                            &lt;p&gt;Live schedule management demonstration&lt;/p&gt;
                        &lt;/Link&gt;
                        
                        &lt;div className={styles.actionCard}&gt;
                            &lt;h3&gt;API Documentation&lt;/h3&gt;
                            &lt;p&gt;Complete API reference and examples&lt;/p&gt;
                        &lt;/div&gt;
                    &lt;/div&gt;
                &lt;/div&gt;

                &lt;div className={styles.apiInfo}&gt;
                    &lt;h2&gt;API Information&lt;/h2&gt;
                    &lt;div className={styles.infoGrid}&gt;
                        &lt;div className={styles.infoItem}&gt;
                            &lt;strong&gt;Base URL:&lt;/strong&gt;
                            &lt;code&gt;http://localhost:3000&lt;/code&gt;
                        &lt;/div&gt;
                        &lt;div className={styles.infoItem}&gt;
                            &lt;strong&gt;tRPC Endpoint:&lt;/strong&gt;
                            &lt;code&gt;http://localhost:3000/trpc&lt;/code&gt;
                        &lt;/div&gt;
                        &lt;div className={styles.infoItem}&gt;
                            &lt;strong&gt;PubSub Port:&lt;/strong&gt;
                            &lt;code&gt;3002&lt;/code&gt;
                        &lt;/div&gt;
                        &lt;div className={styles.infoItem}&gt;
                            &lt;strong&gt;Version:&lt;/strong&gt;
                            &lt;code&gt;v1.0.0&lt;/code&gt;
                        &lt;/div&gt;
                    &lt;/div&gt;
                &lt;/div&gt;
            &lt;/main&gt;
        &lt;/div&gt;
    )
}