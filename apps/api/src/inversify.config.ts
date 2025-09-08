import { Container } from 'inversify'
import 'reflect-metadata'

import { ILogger, PinoLogger } from '@saga-soa/logger'
import { IMongoConnMgr, MongoProvider } from '@saga-soa/db'
import { ExpressServer, TRPCServer } from '@saga-soa/api-core'
import { PubSubServer } from '@saga-soa/pubsub-core/server'
import { ConfigProvider, IConfigProvider } from '@saga-soa/config'

const container = new Container()

// Core infrastructure
container.bind&lt;ILogger&gt;('ILogger').to(PinoLogger).inSingletonScope()
container.bind&lt;IConfigProvider&gt;('IConfigProvider').to(ConfigProvider).inSingletonScope()
container.bind&lt;IMongoConnMgr&gt;('IMongoConnMgr').to(MongoProvider).inSingletonScope()

// Servers
container.bind(ExpressServer).toSelf().inSingletonScope()
container.bind(TRPCServer).toSelf().inSingletonScope()
container.bind(PubSubServer).toSelf().inSingletonScope()

// Schedule management services will be added here

export { container }