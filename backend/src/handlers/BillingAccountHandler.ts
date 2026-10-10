import type { Request, Response } from 'express';
import {
  searchBillingAccounts,
  updateBillingAccount,
  type BillingAccount,
  type BillingAccountStatus,
} from '../services/BillingAccountService.js';

const allowedStatuses: BillingAccountStatus[] = ['Active', 'Pending', 'On hold', 'Closed'];

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseBillingAccount(accountId: number, body: unknown): BillingAccount | null {
  if (!body || typeof body !== 'object') return null;

  const values = body as Record<string, unknown>;
  const textFields = [
    'accountNumber',
    'accountName',
    'billingContact',
    'billingEmail',
    'billingPhone',
    'billingAddress',
    'paymentTerms',
  ] as const;

  if (!textFields.every((field) => isText(values[field]))) return null;
  if (!allowedStatuses.includes(values.status as BillingAccountStatus)) return null;
  if (!/^\S+@\S+\.\S+$/.test(values.billingEmail as string)) return null;

  return {
    accountId,
    accountNumber: (values.accountNumber as string).trim(),
    accountName: (values.accountName as string).trim(),
    billingContact: (values.billingContact as string).trim(),
    billingEmail: (values.billingEmail as string).trim(),
    billingPhone: (values.billingPhone as string).trim(),
    billingAddress: (values.billingAddress as string).trim(),
    paymentTerms: (values.paymentTerms as string).trim(),
    status: values.status as BillingAccountStatus,
  };
}

function sendUnavailable(res: Response, error: unknown) {
  console.error('Billing account database request failed:', error);
  res.status(503).json({
    error: 'Billing accounts are unavailable. Check the Oracle connection and table setup.',
  });
}

export class BillingAccountHandler {
  public async search(req: Request, res: Response): Promise<void> {
    const searchTerm = typeof req.query.search === 'string' ? req.query.search : '';
    if (searchTerm.length > 100) {
      res.status(400).json({ error: 'Search must be 100 characters or fewer.' });
      return;
    }

    try {
      res.status(200).json(await searchBillingAccounts(searchTerm));
    } catch (error) {
      sendUnavailable(res, error);
    }
  }

  public async update(req: Request, res: Response): Promise<void> {
    const accountId = Number(req.params.accountId);
    if (!Number.isSafeInteger(accountId) || accountId <= 0) {
      res.status(400).json({ error: 'A valid account ID is required.' });
      return;
    }

    const account = parseBillingAccount(accountId, req.body);
    if (!account) {
      res.status(400).json({ error: 'Provide valid values for all billing-account fields.' });
      return;
    }

    try {
      const updated = await updateBillingAccount(account);
      if (!updated) {
        res.status(404).json({ error: 'Billing account not found.' });
        return;
      }
      res.status(200).json(updated);
    } catch (error) {
      sendUnavailable(res, error);
    }
  }
}