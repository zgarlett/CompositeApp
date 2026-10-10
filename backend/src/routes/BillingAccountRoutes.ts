import express, { type Router } from 'express';
import { BillingAccountHandler } from '../handlers/BillingAccountHandler.js';

const billingAccountHandler = new BillingAccountHandler();
const billingAccountRoutes: Router = express.Router();

billingAccountRoutes.get('/', (req, res) => billingAccountHandler.search(req, res));
billingAccountRoutes.put('/:accountId', (req, res) => billingAccountHandler.update(req, res));

export default billingAccountRoutes;