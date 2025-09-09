'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

export default function ApiTestPage() {
    const [isConnected, setIsConnected] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [lastPing, setLastPing] = useState<string | null>(null)

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
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backLink}>← Back to Home</Link>
                <h1>API Connection Test</h1>
                <p>Test connectivity and basic functionality of the schedule management API</p>
            </header>

            <main className={styles.main}>
                <div className={styles.connectionCard}>
                    <h2>Connection Status</h2>
                    <div className={styles.statusIndicator}>
                        <div
                            className={`${styles.statusLight} ${isConnected ? styles.connected : styles.disconnected} ${isLoading ? styles.pulsing : ''}`}
                        ></div>
                        <span className={styles.statusText}>
                            {isLoading ? 'Testing...' : isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>

                    {lastPing && (
                        <p className={styles.lastPing}>
                            Last successful ping: {new Date(lastPing).toLocaleString()}
                        </p>
                    )}

                    <button
                        className="btn-primary"
                        onClick={testConnection}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Testing Connection...' : 'Test Connection'}
                    </button>
                </div>

                <div className={styles.quickActions}>
                    <h2>Quick Actions</h2>
                    <div className={styles.actionGrid}>
                        <Link href="/endpoints" className={styles.actionCard}>
                            <h3>Endpoint Explorer</h3>
                            <p>Interactive testing of all API endpoints</p>
                        </Link>

                        <Link href="/schedule-demo" className={styles.actionCard}>
                            <h3>Schedule Demo</h3>
                            <p>Live schedule management demonstration</p>
                        </Link>

                        <div className={styles.actionCard}>
                            <h3>API Documentation</h3>
                            <p>Complete API reference and examples</p>
                        </div>
                    </div>
                </div>

                <div className={styles.apiInfo}>
                    <h2>API Information</h2>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <strong>Base URL:</strong>
                            <code>http://localhost:3000</code>
                        </div>
                        <div className={styles.infoItem}>
                            <strong>tRPC Endpoint:</strong>
                            <code>http://localhost:3000/trpc</code>
                        </div>
                        <div className={styles.infoItem}>
                            <strong>PubSub Port:</strong>
                            <code>3002</code>
                        </div>
                        <div className={styles.infoItem}>
                            <strong>Version:</strong>
                            <code>v1.0.0</code>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}