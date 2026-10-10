# Backend setup

## Oracle connection

The billing-account API uses `node-oracledb` in Thin mode. Provide these environment variables to the backend process:

```text
ORACLE_USER=your_schema_user
ORACLE_PASSWORD=your_schema_password
ORACLE_CONNECT_STRING=your-host:1521/your-service
PORT=3000
```

Run [sql/billing_accounts.sql](sql/billing_accounts.sql) in the target Oracle schema before starting the API. The database user needs `SELECT` and `UPDATE` privileges on `BILLING_ACCOUNTS`.

Start the development API from the repository root with `bun run dev:backend`. For production, supply the same variables through the process manager or deployment secret store before running the built backend.

## Billing-account API

- `GET /billing-accounts?search=term` searches account number, name, billing contact, and email. An empty search returns up to 100 accounts.
- `PUT /billing-accounts/:accountId` updates all editable fields for one account and returns the saved record.

The Vite development proxy exposes these routes to the frontend under `/api`; for example, `GET /api/billing-accounts?search=North`.