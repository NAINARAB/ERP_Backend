import sql from 'mssql';

const ERPSMTCONFIG = {
  server: "103.14.120.9",
  database: "SMT_ERP_DB",
  driver: "SQL Server",
  user: "SMT_ADMIN",
  password: "yvKj3699^",
  stream: false,
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
    enableArithAbort: true,
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
