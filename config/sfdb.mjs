import sql from 'mssql';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();

const SFCOFIGSTRING = {
  server: process.env.sfServer,
  database: process.env.sfDb,
  driver: "SQL Server",
  user: process.env.sfUser,
  password: process.env.sfPassword,
  stream: false,
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  }
};

const SFDB = new sql.ConnectionPool(SFCOFIGSTRING);

async function connectToDatabase() {
  try {
    await SFDB.connect();
    console.log('Connected to SFDB');
  } catch (err) {
    console.error('Error connecting to the database:', err);
  }
}

connectToDatabase();

export default SFDB;
