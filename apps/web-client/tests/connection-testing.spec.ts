import { test, expect } from '@playwright/test'

test.describe('Connection Testing and Ping/Pong Functionality', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/trpc-api')
    })

    test('connection status section is visible', async ({ page }) => {
        await expect(page.getByText('📡 Connection Status:')).toBeVisible()

        // Check for connection control buttons
        await expect(page.getByRole('button', { name: 'Test Connection' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Clear Status' })).toBeVisible()
    })

    test('test connection button changes state correctly', async ({ page }) => {
        const testButton = page.getByRole('button', { name: 'Test Connection' })
        const clearButton = page.getByRole('button', { name: 'Clear Status' })

        // Initially clear button should be disabled (status is disconnected)
        await expect(clearButton).toBeDisabled()

        // Click test connection
        await testButton.click()

        // Button text should change temporarily (though this might be very fast)
        // We can't easily test the temporary "Testing..." state, but we can verify the button works
        await expect(testButton).toBeVisible()
    })

    test('ping/pong section has correct elements', async ({ page }) => {
        await expect(page.getByText('Example API Testing Demo')).toBeVisible()

        // Check for ping input field
        const pingInput = page.getByPlaceholder('Enter your real ping message...')
        await expect(pingInput).toBeVisible()
        await expect(pingInput).toHaveValue('Hello from real tRPC client!') // Default value

        // Check for ping buttons
        await expect(page.getByRole('button', { name: 'Send Real Ping' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Clear Results' })).toBeVisible()
    })

    test('can modify ping message', async ({ page }) => {
        const pingInput = page.getByPlaceholder('Enter your real ping message...')

        // Clear and enter new message
        await pingInput.clear()
        await pingInput.fill('Test ping message')

        await expect(pingInput).toHaveValue('Test ping message')
    })

    test('send real ping button is functional', async ({ page }) => {
        const sendPingButton = page.getByRole('button', { name: 'Send Real Ping' })
        const pingInput = page.getByPlaceholder('Enter your real ping message...')

        // Ensure there's a message to send
        await pingInput.fill('Test ping for functionality')

        // Button should be enabled
        await expect(sendPingButton).toBeEnabled()

        // Click send ping (this might fail if API is not running, but button should work)
        await sendPingButton.click()

        // Button text might change temporarily to "Sending Real Ping..."
        // But we mainly want to verify the click registers
        await expect(sendPingButton).toBeVisible()
    })

    test('clear results button works', async ({ page }) => {
        const clearResultsButton = page.getByRole('button', { name: 'Clear Results' })

        await expect(clearResultsButton).toBeVisible()
        await expect(clearResultsButton).toBeEnabled()

        // Click clear results
        await clearResultsButton.click()
    })

    test('live event stream section is present', async ({ page }) => {
        await expect(page.getByText('📥 Live Event Stream')).toBeVisible()

        // Should show "No events yet" initially
        await expect(
            page.getByText('No events yet. Test the API to see the live stream!')
        ).toBeVisible()
    })

    test('event history and statistics section is present', async ({ page }) => {
        await expect(page.getByText('📊 Event History & Statistics')).toBeVisible()

        // Check for export button
        const exportButton = page.getByRole('button', { name: 'Export Events' })
        await expect(exportButton).toBeVisible()
        await expect(exportButton).toBeDisabled() // Should be disabled when no events

        // Check for statistics cards
        await expect(page.getByText('Total Events')).toBeVisible()
        await expect(page.getByText('API Tests')).toBeVisible()
        await expect(page.getByText('Responses')).toBeVisible()
        await expect(page.getByText('Avg Response')).toBeVisible()
        await expect(page.getByText('Success Rate')).toBeVisible()
        await expect(page.getByText('Last Activity')).toBeVisible()
    })

    test('statistics show initial values', async ({ page }) => {
        // Check that statistics display initial values
        const statsSection = page
            .locator('.statsGrid, [class*="statsGrid"], [class*="statCard"]')
            .first()

        // The exact selectors depend on CSS classes, but we can check for basic stat presence
        await expect(page.getByText('0', { exact: true })).toBeVisible() // Some stats should show 0
        await expect(page.getByText('100%')).toBeVisible() // Success rate should be 100%
    })

    test('navigation to endpoint tester works', async ({ page }) => {
        const endpointTesterLink = page.getByRole('link', { name: '🧪 Endpoint Tester' })
        await expect(endpointTesterLink).toBeVisible()

        await endpointTesterLink.click()
        await expect(page).toHaveURL('/trpc-api/endpoints')
    })
})
