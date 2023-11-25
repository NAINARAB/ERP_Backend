import sql from 'mssql'
import SMTERP from '../../config/erpdb.mjs';

const authenticateToken = async (req, res, next) => {
  try {
    let databaseToken = '';
    const clientToken = req.header('Authorization');

    if (!clientToken) {
      return res.status(401).json({ data: [], message: 'Unauthorized', status: 'Failure' });
    }

    const query = 'SELECT Autheticate_Id FROM dbo.tbl_Users WHERE Autheticate_Id = @clientToken';
    const request = new sql.Request(SMTERP);
    request.input('clientToken', sql.NVarChar, clientToken);

    const result = await request.query(query);

    if (result.recordset.length > 0) {
      databaseToken = result.recordset[0].Autheticate_Id;
    }

    if (clientToken === databaseToken) {
      next();
    } else {
      return res.status(403).json({ data: [], message: 'Forbidden', status: 'Failure' });
    }
  } catch (error) {
    console.error('Error during authentication:', error);
    return res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
};

export default authenticateToken
