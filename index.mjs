import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));


app.get('/', (req, res) => {
  res.json({data:[], status: 'Success', message:''})
})

import userRoutes from './routes/masters/user.mjs';
import loginRoute from './routes/login-logout/login.mjs';
import SalesForceAPI from './routes/sales/sfapi.mjs';
import BranchROute from './routes/masters/branch.mjs';
import SidebarRoute from './routes/sidebar.mjs';
import PageRights from './routes/login-logout/pageRights.mjs';
import CompanyRoute from './routes/company.mjs';
import losRoute from './routes/report/los.mjs';

app.use(userRoutes)
app.use(loginRoute)
app.use(SalesForceAPI)
app.use(BranchROute)
app.use(SidebarRoute)
app.use(PageRights)
app.use(CompanyRoute)
app.use(losRoute)


const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

