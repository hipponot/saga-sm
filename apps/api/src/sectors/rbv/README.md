Development guide:

1. Copy the .env file into your `packages/database` directory (see `saga-sm/ENVIRONMENT_SETUP.md`)

2. Start a locally running instance of postgres. Rooted in `saga-sm`:

```
docker compose postgres up -d
```

3. Install and build `saga-soa` and `saga-sm` (see `saga-sm/README.md`)

4. Migrate and generate from the prisma schema (may require a pnpm install). Rooted in `saga-sm`:

```
turbo run db:migrate;
turbo run db:generate
```

4. (maybe optional) reinstall and rebuild `saga-sm` with the newly generated types

5. Run integration tests. Rooted in `saga-sm/apps/api`:

```
pnpm test:integration
```
