import sql from 'mssql'
import SMTERP from './erpdb.mjs';

const dbconnect = async (req, res, next) => {
    const Db = req.get('Db');
    let config = {
      driver: "SQL Server",
      stream: false,
      options: {
        trustedConnection: true,
        trustServerCertificate: true,
        enableArithAbort: true,
      }
    };
  
    try {
      const fetchDbdata = new sql.Request(SMTERP);
      fetchDbdata.input('Id', sql.Int, Db);
      const result = await fetchDbdata.execute('Company_List_By_Id')
      if (result.recordset.length === 1) {
        config.server = result.recordset[0].IP_Address;
        config.database = result.recordset[0].SQL_DB_Name;
        config.user = result.recordset[0].SQL_User_Name;
        config.password = result.recordset[0].SQL_Pass;
        config.Tally_Company_Id = result.recordset[0].Tally_Company_Id;
        config.Tally_Guid = result.recordset[0].Tally_Guid;
        const DYNAMICDB = new sql.ConnectionPool(config);
        try {
          await DYNAMICDB.connect();
          req.db = DYNAMICDB;
          req.dbID = Db;
          req.config = config;
          next();
        } catch (err) {
          console.error('Error connecting to the database:', err);
          res.status(500).json({ message: "Db connection Failed", status: 'Failure', data: [] });
        }
      }
    } catch (err) {
      console.error('Error connecting to the database:', err);
      res.status(500).json({ message: "Db connection Failed", status: 'Failure', data: [] });
    }
  };

  export default dbconnect