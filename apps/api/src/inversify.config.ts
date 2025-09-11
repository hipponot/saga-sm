import { Container } from 'inversify'
import 'reflect-metadata'

import { PinoLogger } from '@saga-soa/logger'
import type { PinoLoggerConfig } from '@saga-soa/logger'
import { MongoProvider } from '@saga-soa/db'
import type { MongoProviderConfig } from '@saga-soa/db'
import { ExpressServer } from '@saga-soa/api-core/express-server'
import { TRPCServer } from '@saga-soa/api-core/trpc-server'
import { ControllerLoader } from '@saga-soa/api-core/utils/controller-loader'
import type { ExpressServerConfig, TRPCServerConfig } from '@saga-soa/api-core'
// import { ConfigProvider, IConfigProvider } from '@saga-soa/config'

import { PubSubService } from './services/pubsub.service.js'
import { ExampleHelper, type IExampleHelper } from './sectors/example/helpers/example_helper.js'
import { RBVHelper } from './sectors/rbv/rbv_helper.js'

const container = new Container()

// Configuration
const pinoLoggerConfig: PinoLoggerConfig = {
    configType: 'PINO_LOGGER',
    level: 'info',
    isExpressContext: false,
    prettyPrint: false
}

const mongoConfig: MongoProviderConfig = {
    configType: 'MONGO',
    instanceName: 'saga-sm-db',
    host: 'localhost',
    port: 27017,
    database: 'saga-sm'
}

const expressConfig: ExpressServerConfig = {
    configType: 'EXPRESS_SERVER',
    port: 3000,
    logLevel: 'info',
    name: 'saga-sm-api'
}

const trpcConfig: TRPCServerConfig = {
    configType: 'TRPC_SERVER',
    name: 'saga-sm-trpc',
    basePath: '/trpc'
}

container.bind('PinoLoggerConfig').toConstantValue(pinoLoggerConfig)
container.bind('MongoProviderConfig').toConstantValue(mongoConfig)
container.bind('ExpressServerConfig').toConstantValue(expressConfig)
container.bind('TRPCServerConfig').toConstantValue(trpcConfig)

// Core infrastructure
container.bind('ILogger').to(PinoLogger).inSingletonScope()
// container.bind('IConfigProvider').to(ConfigProvider).inSingletonScope()
container.bind('IMongoConnMgr').to(MongoProvider).inSingletonScope()

// Servers
container.bind(ExpressServer).toSelf().inSingletonScope()
container.bind(TRPCServer).toSelf().inSingletonScope()

// Bind ControllerLoader
container.bind(ControllerLoader).toSelf().inSingletonScope()

// Bind PubSub Service
container.bind('PubSubService').to(PubSubService).inSingletonScope()

// Bind Example Helper
container.bind<IExampleHelper>('IExampleHelper').to(ExampleHelper).inSingletonScope()

// Bind RBV Helper
container.bind<RBVHelper>('RBVHelper').to(RBVHelper).inSingletonScope()

export { container }