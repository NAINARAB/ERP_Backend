import sql from 'mssql';
import SMTERP from '../../config/erpdb.mjs';
import moment from 'moment';
import express from 'express';
import crypto from 'crypto';

const loginRoute = express.Router();

function md5Hash(input) {
  return crypto.createHash('md5').update(input).digest('hex');
}

loginRoute.get('/api/login', async (req, res) => {
  const { user, pass } = req.query;
  const md5Password = md5Hash(pass);

  try {
    const loginSP = new sql.Request(SMTERP);
    loginSP.input('UserName', sql.NVarChar, user);
    loginSP.input('Password', sql.NVarChar, md5Password);

    const result = await loginSP.execute('Qry_GetUser');

    if (result.recordset.length === 1) {
      const userInfo = result.recordset[0];
      const ssid = `${Math.floor(100000 + Math.random() * 900000)}${moment().format('DD-MM-YYYY hh:mm:ss')}`;
      
      const sessionSP = new sql.Request(SMTERP);
      sessionSP.input('Id', sql.Int, 0);
      sessionSP.input('UserId', sql.BigInt, userInfo.UserId);
      sessionSP.input('SessionId', sql.NVarChar, ssid);
      sessionSP.input('LogStatus', sql.Int, 1);
      sessionSP.input('APP_Type', sql.Int, 1);

      const sessionResult = await sessionSP.execute('UserLogSP');

      if (sessionResult.recordset.length === 1) {
        res.status(200).json({ user: userInfo, sessionInfo: sessionResult.recordset[0], status: 'Success', message: '' });
      }
    } else {
      res.status(200).json({ user: [], sessionInfo: {}, status: 'Failure', message: 'Try Again' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error calling the stored procedure');
  }
});

export default loginRoute;
