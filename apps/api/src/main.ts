import "reflect-metadata";
import { container } from "./inversify.config.js";
import { ExpressServer } from "@hipponot/soa-api-core/express-server";
import { TRPCServer } from "@hipponot/soa-api-core/trpc-server";
import { ControllerLoader } from "@hipponot/soa-api-core/utils/controller-loader";
import { AbstractTRPCController } from "@hipponot/soa-api-core/abstract-trpc-controller";
import type { ILogger } from "@hipponot/soa-logger";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PubSubService } from "./services/pubsub.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define glob patterns for this API
const GLOB_PATTERNS = {
  TRPC: "./sectors/*/trpc/*-router.js",
} as const;

async function bootstrap() {
  const logger = container.get<ILogger>("ILogger");

  try {
    logger.info("Starting saga-sm service...");

    // Get the ControllerLoader from DI
    const controllerLoader = container.get(ControllerLoader);

    // Initialize servers
    const expressServer = container.get(ExpressServer);
    const trpcServer = container.get(TRPCServer);

    // Initialize Express server with empty REST controllers
    await expressServer.init(container, []);
    const app = expressServer.getApp();

    // Dynamically load all tRPC controllers
    const trpcControllers = await controllerLoader.loadControllers(
      path.resolve(__dirname, GLOB_PATTERNS.TRPC),
      AbstractTRPCController,
    );

    // Initialize the tRPC server with tRPC controllers
    await trpcServer.init(container, trpcControllers);

    // Mount tRPC middleware
    await trpcServer.mountToApp(app);

    // Mount SSE endpoint for real-time pubsub events
    const pubsubService = container.get<PubSubService>("PubSubService");
    app.get("/events", async (req, res) => {
      try {
        await pubsubService.createSSEHandler(req, res);
      } catch (error) {
        logger.error(
          "SSE handler error",
          error instanceof Error ? error : new Error(String(error)),
        );
        res.status(500).json({ error: "SSE connection failed" });
      }
    });

    // Add a simple health check (at root level for easy access)
    app.get("/health", (req, res) => {
      res.json({ status: "ok", service: "saga-sm API" });
    });

    // Start Express server
    expressServer.start();

    logger.info("saga-sm service started successfully");
  } catch (error) {
    logger.error(
      "Failed to start saga-sm service:",
      error instanceof Error ? error : new Error(String(error)),
    );
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  const logger = container.get<ILogger>("ILogger");
  logger.info("Shutting down saga-sm service...");
  process.exit(0);
});

bootstrap().catch(console.error);
