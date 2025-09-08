import Link from 'next/link'
import styles from './page.module.css'

export default function Home() {
    return (
        &lt;div className={styles.container}&gt;
            &lt;header className={styles.header}&gt;
                &lt;h1&gt;Schedule Manager&lt;/h1&gt;
                &lt;p&gt;Test client for saga-sm API&lt;/p&gt;
            &lt;/header&gt;

            &lt;main className={styles.main}&gt;
                &lt;div className={styles.grid}&gt;
                    &lt;Link href="/api-test" className={styles.card}&gt;
                        &lt;h2&gt;API Testing &lt;span&gt;→&lt;/span&gt;&lt;/h2&gt;
                        &lt;p&gt;Interactive tRPC endpoint testing with form validation and response inspection.&lt;/p&gt;
                    &lt;/Link&gt;

                    &lt;Link href="/schedule-demo" className={styles.card}&gt;
                        &lt;h2&gt;Schedule Demo &lt;span&gt;→&lt;/span&gt;&lt;/h2&gt;
                        &lt;p&gt;Live demonstration of schedule management with real-time updates via PubSub.&lt;/p&gt;
                    &lt;/Link&gt;

                    &lt;Link href="/endpoints" className={styles.card}&gt;
                        &lt;h2&gt;Endpoint Explorer &lt;span&gt;→&lt;/span&gt;&lt;/h2&gt;
                        &lt;p&gt;Browse and test all available schedule management endpoints.&lt;/p&gt;
                    &lt;/Link&gt;

                    &lt;div className={styles.card}&gt;
                        &lt;h2&gt;Documentation &lt;span&gt;📖&lt;/span&gt;&lt;/h2&gt;
                        &lt;p&gt;API reference, schemas, and integration examples.&lt;/p&gt;
                    &lt;/div&gt;
                &lt;/div&gt;
            &lt;/main&gt;

            &lt;footer className={styles.footer}&gt;
                &lt;p&gt;Built with saga-soa infrastructure&lt;/p&gt;
            &lt;/footer&gt;
        &lt;/div&gt;
    )
}