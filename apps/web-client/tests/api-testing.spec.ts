import { test, expect } from '@playwright/test';

test.describe('API Testing Functionality', () => {
    test.beforeEach(async ({ page }) => {
        // Go to the api-test page for most tests
        await page.goto('/api-test');
    });

    test('api-test page loads with correct elements', async ({ page }) => {
        // Check main elements
        await expect(page.getByText('🧪 Example API Tester')).toBeVisible();
        await expect(page.getByText('API Configuration')).toBeVisible();
        await expect(page.getByText('API Mode')).toBeVisible();
        await expect(page.getByText('Select Endpoint')).toBeVisible();
    });

    test('can toggle between tRPC and cURL modes', async ({ page }) => {
        // Check default mode (tRPC should be selected)
        const trpcRadio = page.getByRole('radio', { name: 'tRPC Client Mode' });
        const curlRadio = page.getByRole('radio', { name: 'cURL Mode' });

        await expect(trpcRadio).toBeChecked();
        await expect(curlRadio).not.toBeChecked();

        // Switch to cURL mode
        await curlRadio.click();
        await expect(curlRadio).toBeChecked();
        await expect(trpcRadio).not.toBeChecked();

        // Switch back to tRPC mode
        await trpcRadio.click();
        await expect(trpcRadio).toBeChecked();
        await expect(curlRadio).not.toBeChecked();
    });

    test('endpoint selection populates input data', async ({ page }) => {
        // Select an endpoint from the dropdown
        const endpointSelect = page.locator('select').first();
        await endpointSelect.click();

        // Get the first available option (assuming there are endpoints)
        const firstOption = page.locator('select option').nth(1); // Skip "Choose an endpoint..."
        if (await firstOption.count() > 0) {
            const optionText = await firstOption.textContent();
            if (optionText) {
                await endpointSelect.selectOption({ label: optionText });

                // Check that endpoint details appear
                await expect(page.getByText('Selected Endpoint')).toBeVisible();

                // Check that input field becomes enabled
                const inputTextarea = page.getByPlaceholder('Enter JSON input data...');
                await expect(inputTextarea).toBeEnabled();
            }
        }
    });

    test('code generation updates when switching modes', async ({ page }) => {
        // First select an endpoint
        const endpointSelect = page.locator('select').first();
        await endpointSelect.click();

        const firstOption = page.locator('select option').nth(1);
        if (await firstOption.count() > 0) {
            const optionText = await firstOption.textContent();
            if (optionText) {
                await endpointSelect.selectOption({ label: optionText });

                // Wait for code generation
                await expect(page.getByText('Generated Code (tRPC Client)')).toBeVisible();

                // Switch to cURL mode
                await page.getByRole('radio', { name: 'cURL Mode' }).click();

                // Code should update to show cURL
                await expect(page.getByText('Generated Code (cURL)')).toBeVisible();
            }
        }
    });

    test('copy code button is functional', async ({ page }) => {
        // First select an endpoint
        const endpointSelect = page.locator('select').first();
        await endpointSelect.click();

        const firstOption = page.locator('select option').nth(1);
        if (await firstOption.count() > 0) {
            const optionText = await firstOption.textContent();
            if (optionText) {
                await endpointSelect.selectOption({ label: optionText });

                // Wait for copy button to appear
                const copyButton = page.getByRole('button', { name: '📋 Copy Code' });
                await expect(copyButton).toBeVisible();
                await expect(copyButton).toBeEnabled();

                // Click the copy button (we can't easily test clipboard content in Playwright)
                await copyButton.click();
            }
        }
    });

    test('execute endpoint button state changes', async ({ page }) => {
        const executeButton = page.getByRole('button', { name: '▶️ Execute Endpoint' });

        // Initially disabled (no endpoint selected)
        await expect(executeButton).toBeDisabled();

        // Select an endpoint
        const endpointSelect = page.locator('select').first();
        await endpointSelect.click();

        const firstOption = page.locator('select option').nth(1);
        if (await firstOption.count() > 0) {
            const optionText = await firstOption.textContent();
            if (optionText) {
                await endpointSelect.selectOption({ label: optionText });

                // Button should now be enabled
                await expect(executeButton).toBeEnabled();
            }
        }
    });

    test('clear response button works', async ({ page }) => {
        const clearButton = page.getByRole('button', { name: '🗑️ Clear Response' });

        // Initially disabled (no endpoint selected)
        await expect(clearButton).toBeDisabled();

        // Select an endpoint to enable the button
        const endpointSelect = page.locator('select').first();
        await endpointSelect.click();

        const firstOption = page.locator('select option').nth(1);
        if (await firstOption.count() > 0) {
            const optionText = await firstOption.textContent();
            if (optionText) {
                await endpointSelect.selectOption({ label: optionText });

                // Button should now be enabled
                await expect(clearButton).toBeEnabled();

                // Click the clear button
                await clearButton.click();
            }
        }
    });

    test('navigation links work correctly', async ({ page }) => {
        // Test Endpoint List link
        await page.getByRole('link', { name: '📋 Endpoint List' }).click();
        await expect(page).toHaveURL('/endpoints');

        // Go back and test Home link
        await page.goto('/api-test');
        await page.getByRole('link', { name: '🏠 Back to Home' }).click();
        await expect(page).toHaveURL('/');
    });
});
