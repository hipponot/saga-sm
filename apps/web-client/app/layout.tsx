import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'Schedule Manager',
    description: 'Test client for saga-sm API',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        &lt;html lang="en"&gt;
            &lt;body&gt;{children}&lt;/body&gt;
        &lt;/html&gt;
    )
}