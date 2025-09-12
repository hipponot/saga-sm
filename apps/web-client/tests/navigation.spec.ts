import { test, expect } from '@playwright/test'

test.describe('Navigation and Basic Functionality', () => {
    test('home page redirects to trpc-api', async ({ page }) => {
        await page.goto('/')

        // Wait for the redirect to complete (allow trailing slash)
        await page.waitForURL(/\/trpc-api\/?/, { timeout: 10000 })

        // Verify we're on the correct page
        await expect(page).toHaveURL(/\/trpc-api\/?/)
        await expect(page.getByText('Example API Test Center')).toBeVisible()
    })

    test('main layout has API configuration visible', async ({ page }) => {
        await page.goto('/trpc-api')

        // Check that the main layout elements are present
        await expect(page.getByText('Example API Test Center')).toBeVisible()
        await expect(page.getByText('Current API Configuration')).toBeVisible()
        await expect(page.getByText('API URL:')).toBeVisible()
        await expect(page.getByText('tRPC Path:')).toBeVisible()
    })

    test('can navigate to endpoint tester', async ({ page }) => {
        await page.goto('/trpc-api')

        // Click on the endpoint tester link
        await page.getByRole('link', { name: '🧪 Endpoint Tester' }).click()

        // Verify navigation to endpoints page
        await expect(page).toHaveURL(/\/trpc-api\/endpoints\/?/)
    })

    test('can navigate to api-test page', async ({ page }) => {
        await page.goto('/api-test')

        // Verify we're on the API test page
        await expect(page.getByText('🧪 Example API Tester')).toBeVisible()
        await expect(page.getByText('Interactive endpoint testing')).toBeVisible()
    })

    test('can navigate to endpoints page', async ({ page }) => {
        await page.goto('/endpoints')

        // Verify we're on the endpoints page
        await expect(page.getByText('Example API Endpoint Explorer')).toBeVisible()
        await expect(page.getByText('Interactive testing interface')).toBeVisible()
    })

    test('all pages load successfully', async ({ page }) => {
        const pages = ['/trpc-api', '/api-test', '/endpoints']

        for (const pagePath of pages) {
            await page.goto(pagePath)
            
            // Wait for page to fully load
            await page.waitForLoadState('networkidle')
            
            // Verify page loaded successfully (has a title and body content)
            const title = await page.title()
            const bodyText = await page.textContent('body')
            
            expect(title).toBeTruthy()
            expect(bodyText).toBeTruthy()
            expect(bodyText.length).toBeGreaterThan(100) // Should have substantial content
        }
    })
})
