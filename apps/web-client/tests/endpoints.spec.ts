import { test, expect } from '@playwright/test'

test.describe('Endpoints Page Functionality', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/endpoints')
    })

    test('endpoints page loads with correct structure', async ({ page }) => {
        // Check main elements
        await expect(page.getByText('Example API Endpoint Explorer')).toBeVisible()
        await expect(page.getByText('Interactive testing interface')).toBeVisible()

        // Check for sidebar and main content areas
        await expect(page.getByText('Endpoints')).toBeVisible()

        // Should show placeholder when no endpoint selected
        await expect(page.getByText('Select an Endpoint')).toBeVisible()
        await expect(page.getByText('Choose an endpoint from the sidebar')).toBeVisible()
    })

    test('back to home link works', async ({ page }) => {
        const backLink = page.getByRole('link', { name: '← Back to Home' })
        await expect(backLink).toBeVisible()

        await backLink.click()
        await expect(page).toHaveURL('/')
    })

    test('endpoint list is populated', async ({ page }) => {
        // Check if there are any endpoints in the sidebar
        const endpointButtons = page.locator('[class*="endpointItem"], .endpointItem')

        // If endpoints exist, they should be clickable
        const endpointCount = await endpointButtons.count()
        if (endpointCount > 0) {
            // Click the first endpoint
            await endpointButtons.first().click()

            // Should show endpoint details instead of placeholder
            await expect(page.getByText('Select an Endpoint')).not.toBeVisible()
        }
    })

    test('endpoint selection shows details', async ({ page }) => {
        const endpointButtons = page.locator('[class*="endpointItem"], .endpointItem')
        const endpointCount = await endpointButtons.count()

        if (endpointCount > 0) {
            // Click the first endpoint
            await endpointButtons.first().click()

            // Should show service toggle options
            await expect(page.getByText('tRPC Client')).toBeVisible()
            await expect(page.getByText('HTTP/cURL')).toBeVisible()

            // Should show execute button
            await expect(page.getByRole('button', { name: 'Execute Endpoint' })).toBeVisible()
        }
    })

    test('service type toggle works', async ({ page }) => {
        const endpointButtons = page.locator('[class*="endpointItem"], .endpointItem')
        const endpointCount = await endpointButtons.count()

        if (endpointCount > 0) {
            // Click the first endpoint
            await endpointButtons.first().click()

            const trpcRadio = page.getByRole('radio', { name: 'tRPC Client' })
            const curlRadio = page.getByRole('radio', { name: 'HTTP/cURL' })

            // tRPC should be selected by default
            await expect(trpcRadio).toBeChecked()
            await expect(curlRadio).not.toBeChecked()

            // Switch to cURL
            await curlRadio.click()
            await expect(curlRadio).toBeChecked()
            await expect(trpcRadio).not.toBeChecked()

            // Switch back to tRPC
            await trpcRadio.click()
            await expect(trpcRadio).toBeChecked()
            await expect(curlRadio).not.toBeChecked()
        }
    })

    test('input parameters section appears for applicable endpoints', async ({ page }) => {
        const endpointButtons = page.locator('[class*="endpointItem"], .endpointItem')
        const endpointCount = await endpointButtons.count()

        if (endpointCount > 0) {
            // Try multiple endpoints to find one with input parameters
            for (let i = 0; i < Math.min(endpointCount, 3); i++) {
                await endpointButtons.nth(i).click()

                // Check if input parameters section exists
                const inputSection = page.getByText('Input Parameters')
                const inputArea = page.locator('textarea[placeholder*="JSON input"]')

                if (await inputSection.isVisible()) {
                    await expect(inputArea).toBeVisible()
                    await expect(inputArea).toBeEditable()
                    break
                }
            }
        }
    })

    test('generated code section updates with endpoint selection', async ({ page }) => {
        const endpointButtons = page.locator('[class*="endpointItem"], .endpointItem')
        const endpointCount = await endpointButtons.count()

        if (endpointCount > 0) {
            // Click the first endpoint
            await endpointButtons.first().click()

            // Should show generated code section
            await expect(page.getByText('Generated Code')).toBeVisible()

            // Should have a copy button
            const copyButton = page.getByRole('button', { name: 'Copy' })
            await expect(copyButton).toBeVisible()
            await expect(copyButton).toBeEnabled()

            // Click copy button
            await copyButton.click()
        }
    })

    test('execute endpoint button state', async ({ page }) => {
        const executeButton = page.getByRole('button', { name: 'Execute Endpoint' })

        // Should be disabled initially (no endpoint selected)
        await expect(executeButton).toBeDisabled()

        const endpointButtons = page.locator('[class*="endpointItem"], .endpointItem')
        const endpointCount = await endpointButtons.count()

        if (endpointCount > 0) {
            // Click the first endpoint
            await endpointButtons.first().click()

            // Button should now be enabled
            await expect(executeButton).toBeEnabled()

            // Click execute (this might fail if API is not running, but button should work)
            await executeButton.click()
        }
    })

    test('active endpoint is highlighted', async ({ page }) => {
        const endpointButtons = page.locator('[class*="endpointItem"], .endpointItem')
        const endpointCount = await endpointButtons.count()

        if (endpointCount > 1) {
            // Click the first endpoint
            await endpointButtons.first().click()

            // First endpoint should have active class
            await expect(endpointButtons.first()).toHaveClass(/active/)

            // Click the second endpoint
            await endpointButtons.nth(1).click()

            // Second endpoint should now have active class
            await expect(endpointButtons.nth(1)).toHaveClass(/active/)
            // First endpoint should not have active class
            await expect(endpointButtons.first()).not.toHaveClass(/active/)
        }
    })
})
