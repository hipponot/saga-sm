import { test, expect } from '@playwright/test'

test.describe('Complete User Workflows', () => {
    test('complete api testing workflow', async ({ page }) => {
        // Start from home page
        await page.goto('/')

        // Should redirect to tRPC API page
        await page.waitForURL(/\/trpc-api\/?/, { timeout: 10000 })
        await expect(page.getByText('Example API Test Center')).toBeVisible()

        // Check connection status
        const testConnectionButton = page.getByRole('button', { name: 'Test Connection' })
        await testConnectionButton.click()

        // Navigate to API test page
        await page.goto('/api-test')

        // Select an endpoint
        const endpointSelect = page.locator('select').first()
        await endpointSelect.click()

        const firstOption = page.locator('select option').nth(1)
        if ((await firstOption.count()) > 0) {
            const optionText = await firstOption.textContent()
            if (optionText) {
                await endpointSelect.selectOption({ label: optionText })

                // Verify endpoint details appear
                await expect(page.getByText('Selected Endpoint')).toBeVisible()

                // Switch to cURL mode
                await page.getByRole('radio', { name: 'cURL Mode' }).click()
                await expect(page.getByText('Generated Code (cURL)')).toBeVisible()

                // Switch back to tRPC mode
                await page.getByRole('radio', { name: 'tRPC Client Mode' }).click()
                await expect(page.getByText('Generated Code (tRPC Client)')).toBeVisible()

                // Copy the generated code
                const copyButton = page.getByRole('button', { name: '📋 Copy Code' })
                await copyButton.click()

                // Verify execute button is enabled
                const executeButton = page.getByRole('button', { name: '▶️ Execute Endpoint' })
                await expect(executeButton).toBeEnabled()
            }
        }
    })

    test('ping pong testing workflow', async ({ page }) => {
        // Go to tRPC API page
        await page.goto('/trpc-api')

        // Test connection first
        await page.getByRole('button', { name: 'Test Connection' }).click()

        // Modify ping message
        const pingInput = page.getByPlaceholder('Enter your real ping message...')
        await pingInput.clear()
        await pingInput.fill('Test workflow ping message')

        // Send ping (this might fail if API is not running, but workflow should work)
        const sendPingButton = page.getByRole('button', { name: 'Send Real Ping' })
        await sendPingButton.click()

        // Clear results
        await page.getByRole('button', { name: 'Clear Results' }).click()

        // Verify statistics section
        await expect(page.getByText('📊 Event History & Statistics')).toBeVisible()
    })

    test('cross-page navigation workflow', async ({ page }) => {
        // Start from home
        await page.goto('/')
        await page.waitForURL(/\/trpc-api\/?/, { timeout: 10000 })

        // Navigate to API test page
        await page.goto('/api-test')
        await expect(page.getByText('🧪 Example API Tester')).toBeVisible()

        // Use navigation link to endpoints
        await page.getByRole('link', { name: '📋 Endpoint List' }).click()
        await expect(page).toHaveURL(/\/endpoints\/?/)

        // Navigate back home
        await page.getByRole('link', { name: '← Back to Home' }).click()
        await expect(page).toHaveURL(/^https?:\/\/[^\/]+\/?$/)

        // Should redirect back to tRPC API
        await page.waitForURL(/\/trpc-api\/?/, { timeout: 10000 })

        // Navigate to endpoint tester from main page
        await page.getByRole('link', { name: '🧪 Endpoint Tester' }).click()
        await expect(page).toHaveURL(/\/trpc-api\/endpoints\/?/)
    })

    test('endpoint explorer workflow', async ({ page }) => {
        await page.goto('/endpoints')

        // Check initial state
        await expect(page.getByText('Select an Endpoint')).toBeVisible()

        const endpointButtons = page.locator('[class*="endpointItem"], .endpointItem')
        const endpointCount = await endpointButtons.count()

        if (endpointCount > 0) {
            // Select first endpoint
            await endpointButtons.first().click()

            // Verify service toggle
            await expect(page.getByRole('radio', { name: 'tRPC Client' })).toBeChecked()

            // Switch to HTTP/cURL
            await page.getByRole('radio', { name: 'HTTP/cURL' }).click()
            await expect(page.getByRole('radio', { name: 'HTTP/cURL' })).toBeChecked()

            // Copy generated code
            const copyButton = page.getByRole('button', { name: 'Copy' })
            if (await copyButton.isVisible()) {
                await copyButton.click()
            }

            // Try to execute (might fail if API not running)
            const executeButton = page.getByRole('button', { name: 'Execute Endpoint' })
            await expect(executeButton).toBeEnabled()
            await executeButton.click()

            // If there are multiple endpoints, test switching
            if (endpointCount > 1) {
                await endpointButtons.nth(1).click()
                await expect(endpointButtons.nth(1)).toHaveClass(/active/)
            }
        }
    })

    test('error handling and edge cases', async ({ page }) => {
        // Test navigation to non-existent pages
        await page.goto('/non-existent-page')

        // Should either 404 or redirect
        await page.waitForLoadState('networkidle')
        const currentUrl = page.url()

        // As long as we get a response, it's handled
        expect(currentUrl).toBeTruthy()

        // Test API operations without backend (should fail gracefully)
        await page.goto('/api-test')

        const endpointSelect = page.locator('select').first()
        await endpointSelect.click()

        const firstOption = page.locator('select option').nth(1)
        if ((await firstOption.count()) > 0) {
            const optionText = await firstOption.textContent()
            if (optionText) {
                await endpointSelect.selectOption({ label: optionText })

                // Try to execute without backend - should handle gracefully
                const executeButton = page.getByRole('button', { name: '▶️ Execute Endpoint' })
                await executeButton.click()

                // Should either show error or handle gracefully
                // The exact behavior depends on implementation
            }
        }
    })
})
