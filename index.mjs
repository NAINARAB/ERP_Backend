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
import apiData from './config/apis.mjs';
import EmpAttanance from './routes/attanance.mjs';
import purchaseOrederReport from './routes/report/purchaseorder.mjs';
import CustomerRoute from './routes/masters/customer.mjs';
import CustomerReportRoute from './routes/report/customerReport.mjs'

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));


// app.get('/', (req, res) => {
//   const bg = (method) => {
//     if(method === "GET"){
//       return '#00CDAC'
//     } else if (method === "POST"){
//       return '#DD2476'
//     } else if (method === "PUT"){
//       return '#A890FE'
//     } else {
//       return '#FF61D2'
//     }
//   }
//   const htmlContent = `
//   <html lang="en">
//     <head>
//       <title>SMTERP API</title>
//       <style>
//           table {
//               border: 1px solid black;
//           }
  
//           th {
//               border: 1px solid black;
//               padding: 5px 20px;
//           }
  
//           tr {
//               border: 1px solid black;
//               padding: 2px;
//           }
  
//           td {
//               border: 1px solid black;
//               padding: 10px;
//               text-align: center;
//           }
  
//           @font-face {
//               font-family: 'prosans';
//               font-style: normal;
//               font-weight: 400;
//               src: local('Open Sans'), local('OpenSans'), url(https://fonts.gstatic.com/s/productsans/v5/HYvgU2fE2nRJvZ5JFAumwegdm0LZdjqr5-oayXSOefg.woff2) format('woff2');
//           }
  
//           * {
//               font-family: prosans;
//               box-sizing: border-box;
//           }
  
//           body {
//               margin: 2em;
//               background: linear-gradient(45deg, #EE9CA7, #FFDDE1);
//           }
  
          
//       </style>
//     </head>
  
//     <body>
//       <h2 style="margin-top: 2em;color: white; text-shadow: 0px 4px 4px black">SMT APIs</h2>
//       <table>
//           <thead>
//               <tr>
//                   <th>SNo</th>
//                   <th>Method</th>
//                   <th>API</th>
//                   <th>Authorization</th>
//                   <th>header</th>
//                   <th>query</th>
//                   <th>param</th>
//                   <th>body</th>
//               </tr>
//           </thead>
//           <tbody>
//               ${apiData.map((item, index) => `
//               <tr>
//                   <td>${index + 1}</td><!--sno-->
//                   <td style="background-color: ${bg(item.method)}">${item.method}</td><!--method-->
//                   <td style="text-align: left">${item.api}</td><!--api-->
//                   <td>${item.authorization}</td><!--authorization-->
//                   <td>${item.header}</td><!--header-->
//                   <td>${item.query}</td><!--query-->
//                   <td>${item.param}</td><!--param-->
//                   <td>${item.body}</td><!--body-->
//               </tr>`
//               ).join('')}
//           </tbody>
//       </table>
//     </body>
  
//   </html>
//   `;
//   res.setHeader('Content-Type', 'text/html');
//   res.send(htmlContent);
// });

app.use(userRoutes, loginRoute, SalesForceAPI, BranchROute, SidebarRoute, PageRights, CompanyRoute, losRoute, DesignationRoute,EmpAttanance, purchaseOrederReport, CustomerRoute, CustomerReportRoute)

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
  swaggerDefinition: swaggerDefinition, 
  apis: pathList,
};

const swaggerSpec = swaggerJSDoc(options);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));



const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

