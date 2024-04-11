import sql from 'mssql';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();

const ERPSMTCONFIG = {
  server: process.env.server,
  database: process.env.database,
  driver: "SQL Server",
  user: process.env.user,
  password: process.env.password,
  stream: false,
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 60000,
  }
};

const SMTERP = new sql.ConnectionPool(ERPSMTCONFIG);

async function connectToDatabase() {
  try {
    await SMTERP.connect();
    console.log('Connected to ERPDB');
  } catch (err) {
    console.error('Error connecting to the database:', err);
  }
}

connectToDatabase();

export default SMTERP;
