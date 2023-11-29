import express from 'express';
import authenticateToken from '../login-logout/auth.mjs';
import sql from 'mssql';
import SMTERP from '../../config/erpdb.mjs';
import crypto from 'crypto'

const userRoute = express.Router();

function md5Hash(input) {
    return crypto.createHash('md5').update(input).digest('hex');
}

userRoute.get('/api/users', authenticateToken, async (req, res) => {
    const query = `SELECT u.UserId, u.UserTypeId, u.Name, u.UserName AS Mobile, u.Autheticate_Id AS Token, u.Password, u.BranchId, ut.UserType, b.BranchName
                      FROM tbl_Users as u
                      JOIN
                        tbl_User_Type as ut
                        ON u.UserTypeId = ut.id
                      JOIN
                        tbl_Business_Master as b
                        ON u.BranchId = b.BranchId
                      WHERE 
                        UserId != 0
                      AND
                        UDel_Flag = 0`;
    try {
        const result = await SMTERP.query(query);
        res.json({ data: result.recordset, status: 'Success', message: '' });
    } catch (err) {
        console.error('Error executing SQL query:', err);
        res.status(500).json({ message: 'Internal Server Error', data: [], status: 'Failure' });
    }
});

userRoute.post('/api/users', authenticateToken, async (req, res) => {
    const { name, mobile, usertype, password, branch } = req.body;
    const md5Password = md5Hash(password);

    try {
        const checkmobile = `SELECT UserName from tbl_Users WHERE UserName = '${mobile}' AND UDel_Flag = 0`;
        const checkResult = await SMTERP.query(checkmobile);

        if (checkResult.recordset.length > 0) {
            res.status(422).json({ data: [], status: 'Failure', message: 'Mobile Number Already Exists' });
            return;
        }

        const newuser = new sql.Request(SMTERP);
        newuser.input('Mode', sql.TinyInt, 1);
        newuser.input('UserId', sql.Int, 0);
        newuser.input('Name', sql.VarChar, name);
        newuser.input('UserName', sql.VarChar, mobile);
        newuser.input('UserTypeId', sql.BigInt, usertype);
        newuser.input('Password', sql.VarChar, md5Password);
        newuser.input('BranchId', sql.Int, branch);

        const result = await newuser.execute('UsersSP');
        if (result) {
            res.status(200).json({ data: [], status: 'Success', message: 'New User Created' });
        } else {
            res.status(500).json({ data: [], status: 'Failure', message: 'User Creation Failed' });
        }
    } catch (e) {
        console.error(e);
        res.status(422).json({ data: [], status: 'Failure', message: 'User Creation Failed' });
    }
})

userRoute.put('/api/users', authenticateToken, async (req, res) => {
    const { name, mobile, usertype, password, branch, userid } = req.body;
    const isMd5Hash = /^[a-fA-F0-9]{32}$/.test(password);
    const passwordToUse = isMd5Hash ? password : md5Hash(password);

    try {
        const checkmobile = `SELECT UserName from tbl_Users WHERE UserName = '${mobile}' AND UDel_Flag = 0 AND UserId != '${userid}'`;
        const checkResult = await SMTERP.query(checkmobile);

        if (checkResult.recordset.length > 0) {
            res.status(422).json({ data: [], status: 'Failure', message: 'Mobile Number Already Exists' });
            return;
        }

        const newuser = new sql.Request(SMTERP);
        newuser.input('Mode', sql.TinyInt, 2);
        newuser.input('UserId', sql.Int, userid);
        newuser.input('Name', sql.VarChar, name);
        newuser.input('UserName', sql.VarChar, mobile);
        newuser.input('UserTypeId', sql.BigInt, usertype);
        newuser.input('Password', sql.VarChar, passwordToUse);
        newuser.input('BranchId', sql.Int, branch);

        const result = await newuser.execute('UsersSP');
        if (result) {
            res.status(200).json({ data: [], status: 'Success', message: 'Changes Saved' });
        } else {
            res.status(500).json({ data: [], status: 'Failure', message: 'Failed to Save changes' });
        }
    } catch (e) {
        console.error(e);
        res.status(422).json({ data: [], status: 'Failure', message: 'User Creation Failed' });
    }
});

userRoute.delete('/api/users/:userid', authenticateToken, async (req, res) => {
    const { userid } = req.params;
    try {
        const newuser = new sql.Request(SMTERP);
        newuser.input('Mode', sql.TinyInt, 3);
        newuser.input('UserId', sql.Int, userid);
        newuser.input('Name', sql.VarChar, '');
        newuser.input('UserName', sql.VarChar, '');
        newuser.input('UserTypeId', sql.BigInt, '');
        newuser.input('Password', sql.VarChar, '');
        newuser.input('BranchId', sql.Int, '');

        const result = await newuser.execute('UsersSP');
        if (result) {
            res.status(200).json({ data: [], status: 'Success', message: 'User Removed' });
        } else {
            res.status(422).json({ data: [], status: 'Failure', message: 'Failed to Delete' });
        }
    } catch (e) {
        console.log(e);
        res.status(500).json({ data: [], status: 'Failure', message: 'Server Error' });
    }
});

userRoute.get('/api/usertype', authenticateToken, async (req, res) => {
    const query = 'SELECT * FROM dbo.tbl_User_Type';
    SMTERP.query(query).then(result => {
        res.status(200).json({ data: result.recordset, status: "Success", message: '' });
    }).catch(err => {
        console.error('Error executing SQL query:', err);
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    })
});

userRoute.get('/api/userid', (req, res) => {
    const authId = req.header('Authorization');
    const userID = `SELECT UserId FROM tbl_Users WHERE Autheticate_Id = '${authId}'`;
    SMTERP.query(userID).then(result => {
        if (result.recordset.length > 0) {
            res.json({ data: result.recordset, status: 'Success' }).status(200)
        } else {
            res.json({ data: [], status: 'Failure', message: "" }).status(200)
        }
    }).catch(err => {
        console.error('Error executing SQL query:', err);
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    })
})

export default userRoute;