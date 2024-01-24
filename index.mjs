import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUI from 'swagger-ui-express';
import swaggerDefinition from './config/swager.mjs';

import userRoutes from './routes/masters/user.mjs';
import loginRoute from './routes/login-logout/login.mjs';
import SalesForceAPI from './routes/sales/sfapi.mjs';
import BranchROute from './routes/masters/branch.mjs';
import SidebarRoute from './routes/sidebar.mjs';
import PageRights from './routes/login-logout/pageRights.mjs';
import CompanyRoute from './routes/company.mjs';
import losRoute from './routes/report/los.mjs';
import DesignationRoute from './routes/masters/designation.mjs';
import EmpAttanance from './routes/attanance.mjs';
import purchaseOrederReport from './routes/report/purchaseorder.mjs';
import CustomerRoute from './routes/masters/customer.mjs';
import CustomerReportRoute from './routes/report/customerReport.mjs';
import PaymentRoute from './routes/payments/config.mjs';


import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use(
  userRoutes,
  loginRoute,
  SalesForceAPI,
  BranchROute,
  SidebarRoute,
  PageRights,
  CompanyRoute,
  losRoute,
  DesignationRoute,
  EmpAttanance,
  purchaseOrederReport,
  CustomerRoute,
  CustomerReportRoute,
  PaymentRoute
)

const pathList = [
  './routes/masters/user.mjs',
  './routes/login-logout/login.mjs',
  './routes/sales/sfapi.mjs',
  './routes/masters/branch.mjs',
  './routes/sidebar.mjs',
  './routes/login-logout/pageRights.mjs',
  './routes/company.mjs',
  './routes/report/los.mjs',
  './routes/masters/designation.mjs',
  './config/apis.mjs',
  './routes/attanance.mjs',
];

const options = {
  swaggerDefinition: {
    info: {
      title: 'SMT API\'s',
      version: '1.0.0',
      description: 'Description of your API',
    },
    host: 'localhost:5000',
    basePath: '/',
  },
  apis: pathList,
};

const swaggerSpec = swaggerJSDoc(options);
app.use('/api', swaggerUI.serve, swaggerUI.setup(swaggerSpec));



const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

