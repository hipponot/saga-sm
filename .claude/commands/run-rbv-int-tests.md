Run the RBV integration tests with full setup

Please execute the following command to run the RBV integration test suite with complete setup:

```bash
cd /home/skelly/dev/saga-sm
./apps/api/scripts/run-rbv-int-tests.sh
```

This script will:
1. Check and setup .env file in packages/database if needed
2. Start PostgreSQL if not running
3. Install dependencies if needed
4. Build saga-soa and saga-sm
5. Generate Prisma client
6. Reset and migrate database for clean state
7. Run the RBV integration tests