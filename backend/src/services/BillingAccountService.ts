import oracledb, { type Connection, type Pool } from 'oracledb';

export type BillingAccountStatus = 'Active' | 'Pending' | 'On hold' | 'Closed';

export type BillingAccount = {
  accountId: number;
  accountNumber: string;
  accountName: string;
  billingContact: string;
  billingEmail: string;
  billingPhone: string;
  billingAddress: string;
  paymentTerms: string;
  status: BillingAccountStatus;
};

type BillingAccountRow = {
  ACCOUNT_ID: number;
  ACCOUNT_NUMBER: string;
  ACCOUNT_NAME: string;
  BILLING_CONTACT: string;
  BILLING_EMAIL: string;
  BILLING_PHONE: string;
  BILLING_ADDRESS: string;
  PAYMENT_TERMS: string;
  STATUS: BillingAccountStatus;
};

let poolPromise: Promise<Pool> | undefined;

async function getPool() {
  const { ORACLE_USER, ORACLE_PASSWORD, ORACLE_CONNECT_STRING } = process.env;
  if (!ORACLE_USER || !ORACLE_PASSWORD || !ORACLE_CONNECT_STRING) {
    throw new Error('Oracle connection environment variables are missing.');
  }

  const pendingPool = poolPromise ?? oracledb.createPool({
    user: ORACLE_USER,
    password: ORACLE_PASSWORD,
    connectString: ORACLE_CONNECT_STRING,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1,
  });
  poolPromise = pendingPool;

  try {
    return await pendingPool;
  } catch (error) {
    poolPromise = undefined;
    throw error;
  }
}

async function withConnection<T>(operation: (connection: Connection) => Promise<T>) {
  const pool = await getPool();
  const connection = await pool.getConnection();
  try {
    return await operation(connection);
  } finally {
    await connection.close();
  }
}

function toBillingAccount(row: BillingAccountRow): BillingAccount {
  return {
    accountId: Number(row.ACCOUNT_ID),
    accountNumber: row.ACCOUNT_NUMBER,
    accountName: row.ACCOUNT_NAME,
    billingContact: row.BILLING_CONTACT,
    billingEmail: row.BILLING_EMAIL,
    billingPhone: row.BILLING_PHONE,
    billingAddress: row.BILLING_ADDRESS,
    paymentTerms: row.PAYMENT_TERMS,
    status: row.STATUS,
  };
}

const accountColumns = `
  ACCOUNT_ID,
  ACCOUNT_NUMBER,
  ACCOUNT_NAME,
  BILLING_CONTACT,
  BILLING_EMAIL,
  BILLING_PHONE,
  BILLING_ADDRESS,
  PAYMENT_TERMS,
  STATUS`;

export async function searchBillingAccounts(searchTerm: string) {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `SELECT ${accountColumns}
         FROM BILLING_ACCOUNTS
        WHERE :search IS NULL
           OR INSTR(LOWER(ACCOUNT_NUMBER), LOWER(:search)) > 0
           OR INSTR(LOWER(ACCOUNT_NAME), LOWER(:search)) > 0
           OR INSTR(LOWER(BILLING_CONTACT), LOWER(:search)) > 0
           OR INSTR(LOWER(BILLING_EMAIL), LOWER(:search)) > 0
        ORDER BY ACCOUNT_NAME
        FETCH FIRST 100 ROWS ONLY`,
      { search: searchTerm.trim() || null },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );

    return ((result.rows ?? []) as BillingAccountRow[]).map(toBillingAccount);
  });
}

export async function updateBillingAccount(account: BillingAccount) {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `UPDATE BILLING_ACCOUNTS
          SET ACCOUNT_NUMBER = :accountNumber,
              ACCOUNT_NAME = :accountName,
              BILLING_CONTACT = :billingContact,
              BILLING_EMAIL = :billingEmail,
              BILLING_PHONE = :billingPhone,
              BILLING_ADDRESS = :billingAddress,
              PAYMENT_TERMS = :paymentTerms,
              STATUS = :status
        WHERE ACCOUNT_ID = :accountId`,
      account,
    );

    if (result.rowsAffected === 0) return null;

    const updated = await connection.execute(
      `SELECT ${accountColumns}
         FROM BILLING_ACCOUNTS
        WHERE ACCOUNT_ID = :accountId`,
      { accountId: account.accountId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    const row = updated.rows?.[0] as BillingAccountRow | undefined;
    await connection.commit();
    return row ? toBillingAccount(row) : null;
  });
}