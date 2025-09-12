import type { Metadata } from 'next'
import './globals.css'
import { ApiUrlProvider } from '../src/context/api-url-context'
import { GlobalUrlEditor } from '../src/components/global-url-editor'

export const metadata: Metadata = {
    title: 'Schedule Manager',
    description: 'Test client for saga-sm API',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <ApiUrlProvider>
                    {children}
                    <GlobalUrlEditor />
                </ApiUrlProvider>
            </body>
        </html>
    )
}
