import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        
        // Setup files for mocking and global configuration
        setupFiles: ['./src/__tests__/setup/vitest.setup.ts'],
        
        include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
        exclude: [
            'node_modules', 
            'dist',
            'src/**/*.integration.{test,spec}.ts', // Exclude integration tests
        ],
        
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.test.ts',
                'src/**/*.spec.ts',
                'src/**/__tests__/**',
                'src/**/*.d.ts',
                'src/main.ts',
                'src/index.ts',
            ],
        },
        
        // Timeout settings
        testTimeout: 10000,
        hookTimeout: 10000,
        
        // Mock configuration
        clearMocks: true,
        restoreMocks: true,
    },
    
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@tests': path.resolve(__dirname, './src/__tests__'),
        },
    },
})
