import sql from 'mssql';
import SMTERP from '../../config/erpdb.mjs';
import moment from 'moment';
import express from 'express';
import crypto from 'crypto';
import { invalidInput, dataFound, falied, servError } from '../res.mjs';

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
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});

loginRoute.put('/api/logout', async (req, res) => {
  const { userid, sessionId } = req.query;
  try {
    const sessionSP = new sql.Request(SMTERP)
    sessionSP.input('Id', sql.Int, 0);
    sessionSP.input('UserId', sql.BigInt, userid);
    sessionSP.input('SessionId', sql.NVarChar, sessionId);
    sessionSP.input('LogStatus', sql.Int, 0);
    sessionSP.input('APP_Type', sql.Int, 1);
    const sessionResult = await sessionSP.execute('UserLogSP');

    if (sessionResult.recordset.length > 0) {
      res.status(200).json({ data: [], status: 'Success', message: 'Session Ended' });
    } else {
      res.status(404).json({ data: [], status: 'Failure', message: '' })
    }
  }
  catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
})

loginRoute.get('/api/getUserByAuth', async (req, res) => {
  const { Auth } = req.query;

  if (!Auth) {
    return invalidInput(res, 'Auth required');
  }

  try {
    const query = `
    SELECT
      u.*,
      COALESCE(
        ut.UserType,
        'UnKnown UserType'
      ) AS UserType,
      COALESCE(
        b.BranchName,
        'Unknown Branch'
      ) AS BranchName,
      COALESCE(
        c.Company_id,
        '0'
      ) AS Company_id,
      
      (
        SELECT 
          TOP (1)
          UserId,
          SessionId,
          InTime
        FROM
          UserLog
        WHERE
          UserId = u.UserId
        ORDER BY
          InTime DESC
          FOR JSON PATH
      ) AS session
      
    FROM 
      tbl_Users AS u
    LEFT JOIN
      tbl_User_Type AS ut
      ON ut.Id = u.UserTypeId
    LEFT JOIN
      tbl_Business_Master AS b
      ON b.BranchId = u.BranchId
    LEFT JOIN
      tbl_Company_Master AS c
      ON c.Company_id = b.Company_id
      
    WHERE
      Autheticate_Id = '${Auth}'`;

    const request = new sql.Request(SMTERP)

    const result = await request.query(query);

    if (result.recordset.length > 0) {
      result.recordset[0].session = JSON.parse(result.recordset[0].session)
      return dataFound(res, result.recordset)
    } else {
      return falied(res, 'User Not Found')
    }
  } catch (e) {
    servError(e, res);
  }
})

export default loginRoute;
