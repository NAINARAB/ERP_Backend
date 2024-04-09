import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();
import apiData from './config/apis.mjs';
import path from 'path';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


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
import TrackingLocation from './routes/tracking/liveLocation.mjs';
import SfRouter from './SFRoutes/routes.mjs';



const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  const bg = (method) => {
    if(method === "GET"){
      return '#00CDAC'
    } else if (method === "POST"){
      return '#DD2476'
    } else if (method === "PUT"){
      return '#A890FE'
    } else {
      return '#FF61D2'
    }
  }
  const htmlContent = `
  <html lang="en">
    <head>
      <title>SMTERP API</title>
      <style>
          table {
              border: 1px solid black;
          }
  
          th {
              border: 1px solid black;
              padding: 5px 20px;
          }
  
          tr {
              border: 1px solid black;
              padding: 2px;
          }
  
          td {
              border: 1px solid black;
              padding: 10px;
              text-align: center;
          }
  
          @font-face {
              font-family: 'prosans';
              font-style: normal;
              font-weight: 400;
              src: local('Open Sans'), local('OpenSans'), url(https://fonts.gstatic.com/s/productsans/v5/HYvgU2fE2nRJvZ5JFAumwegdm0LZdjqr5-oayXSOefg.woff2) format('woff2');
          }
  
          * {
              font-family: prosans;
              box-sizing: border-box;
          }
  
          body {
              margin: 2em;
              background: linear-gradient(45deg, #EE9CA7, #FFDDE1);
          }

          .tble-hed-stick {
            position:sticky;
            top: 0 ;
          }
          
      </style>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet"
        ntegrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" crossorigin="anonymous">
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL"
        crossorigin="anonymous"></script>
    </head>
  
    <body class="p-3">
      <h2 class=" text-dark">SMT APIs</h2>
      <table class="table border">
        <thead>
            <tr>
              <th class="text-center border tble-hed-stick">SNo</th>
              <th class="text-center border tble-hed-stick">Method</th>
              <th class="text-center border tble-hed-stick">API</th>
              <th class="text-center border tble-hed-stick">Authorization</th>
              <th class="text-center border tble-hed-stick">header</th>
              <th class="text-center border tble-hed-stick">query</th>
              <th class="text-center border tble-hed-stick">param</th>
              <th class="text-center border tble-hed-stick">body</th>
            </tr>
        </thead>
        <tbody>
          ${apiData.map((item, index) => `
            <tr>
              <td class="border">${index + 1}</td><!--sno-->
              <td class="border" style="background-color: ${bg(item.method)}">${item.method}</td><!--method-->
              <td class="border" style="text-align: left">${item.api}</td><!--api-->
              <td class="border">${item.authorization}</td><!--authorization-->
              <td class="border">${item.header}</td><!--header-->
              <td class="border">${item.query}</td><!--query-->
              <td class="border">${item.param}</td><!--param-->
              <td class="border">${item.body}</td><!--body-->
            </tr>`
          ).join('')}
        </tbody>
      </table>
    </body>
  
  </html>
  `;
  res.setHeader('Content-Type', 'text/html');
  res.send(htmlContent);
});

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
  PaymentRoute,
  TrackingLocation,
  SfRouter
)

const productsStaticPath = path.join(__dirname, 'uploads', 'products');
app.use('/imageURL/products', express.static(productsStaticPath));

const retailersStaticPath = path.join(__dirname, 'uploads', 'retailers');
app.use('/imageURL/retailers', express.static(retailersStaticPath));

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

