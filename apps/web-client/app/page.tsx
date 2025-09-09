import Link from 'next/link'
import styles from './page.module.css'

export default function Home() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Schedule Manager</h1>
                <p>Test client for saga-sm API</p>
            </header>

            <main className={styles.main}>
                <div className={styles.grid}>
                    <Link href="/api-test" className={styles.card}>
                        <h2>API Testing <span>→</span></h2>
                        <p>Interactive tRPC endpoint testing with form validation and response inspection.</p>
                    </Link>

                    <Link href="/schedule-demo" className={styles.card}>
                        <h2>Schedule Demo <span>→</span></h2>
                        <p>Live demonstration of schedule management with real-time updates via PubSub.</p>
                    </Link>

                    <Link href="/endpoints" className={styles.card}>
                        <h2>Endpoint Explorer <span>→</span></h2>
                        <p>Browse and test all available schedule management endpoints.</p>
                    </Link>

                    <div className={styles.card}>
                        <h2>Documentation <span>📖</span></h2>
                        <p>API reference, schemas, and integration examples.</p>
                    </div>
                </div>
            </main>

            <footer className={styles.footer}>
                <p>Built with saga-soa infrastructure</p>
            </footer>
        </div>
    )
}