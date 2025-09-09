'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to trpc-api page
        router.replace('/trpc-api');
    }, [router]);

    // Show loading state while redirecting
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontFamily: 'var(--font-geist-sans)'
        }}>
            <div>Redirecting to Schedule API Test Center...</div>
        </div>
    );
}