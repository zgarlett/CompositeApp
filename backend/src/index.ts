import express from 'express';
import billingAccountRoutes from './routes/BillingAccountRoutes.js';
import loginRoutes from './routes/LoginRoutes.js';

const app = express();

app.use(express.json());
app.use('/login', loginRoutes);
app.use('/billing-accounts', billingAccountRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});