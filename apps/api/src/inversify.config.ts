import { Container } from 'inversify'
import 'reflect-metadata'

import { PinoLogger, PinoLoggerSchema } from '@hipponot/logger'
import type { ILogger, PinoLoggerConfig } from '@hipponot/logger'
import { MongoProvider, MongoProviderSchema } from '@hipponot/db'
import type { IMongoConnMgr, MongoProviderConfig } from '@hipponot/db'
import { ExpressServer, ExpressServerSchema } from '@hipponot/api-core/express-server'
import { TRPCServer, TRPCServerSchema } from '@hipponot/api-core/trpc-server'
import { ControllerLoader } from '@hipponot/api-core/utils/controller-loader'
import type { ExpressServerConfig, TRPCServerConfig } from '@hipponot/api-core'
// import { ConfigProvider, IConfigProvider } from '@hipponot/config'

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