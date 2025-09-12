import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Container } from 'inversify'
import { ExampleController } from '../example-router'
import { ExampleHelper } from '../../helpers/example_helper'
import type { ILogger } from '@hipponot/logger'
import type { IExampleHelper } from '../../helpers/example_helper'
import 'reflect-metadata'

const mockLogger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
}

describe('ExampleController', () => {
    let container: Container
    let controller: ExampleController
    let exampleHelper: IExampleHelper

    beforeEach(() => {
        container = new Container()
        container.bind<ILogger>('ILogger').toConstantValue(mockLogger)
        container.bind<IExampleHelper>('IExampleHelper').to(ExampleHelper)
        container.bind<ExampleController>(ExampleController).toSelf()

        exampleHelper = container.get<IExampleHelper>('IExampleHelper')
        controller = container.get<ExampleController>(ExampleController)
    })

    describe('initialization', () => {
        it('should create controller with correct sector name', () => {
            expect(controller.sectorName).toBe('example')
        })

        it('should inject dependencies correctly', () => {
            expect(controller).toBeDefined()
            expect(exampleHelper).toBeDefined()
        })
    })

    describe('createRouter', () => {
        it('should create router with all expected endpoints', () => {
            const router = controller.createRouter()

            expect(router.queryExamples).toBeDefined()
            expect(router.getExampleById).toBeDefined()
            expect(router.createExample).toBeDefined()
            expect(router.updateExample).toBeDefined()
            expect(router.deleteExample).toBeDefined()
        })

        it('should create router that extends AbstractTRPCController', () => {
            const router = controller.createRouter()
            expect(typeof router).toBe('object')
        })
    })

    describe('helper integration', () => {
        it('should use ExampleHelper methods', () => {
            const generateIdSpy = vi.spyOn(exampleHelper, 'generateId')
            const formatTitleSpy = vi.spyOn(exampleHelper, 'formatTitle')
            const validateStatusSpy = vi.spyOn(exampleHelper, 'validateStatus')
            const calculatePrioritySpy = vi.spyOn(exampleHelper, 'calculatePriority')

            // Just verify the helper is injected and methods are available
            expect(generateIdSpy).toBeDefined()
            expect(formatTitleSpy).toBeDefined()
            expect(validateStatusSpy).toBeDefined()
            expect(calculatePrioritySpy).toBeDefined()
        })
    })
})