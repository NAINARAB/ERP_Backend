import express from 'express'
import sql from 'mssql'
import SMTERP from '../../config/erpdb.mjs';
import authenticateToken from './auth.mjs';

const PageRights = express.Router()

PageRights.get('/api/pagerights', authenticateToken, async (req, res) => {
    const { menuid, menutype } = req.query;
    const auth = req.header('Authorization');
    try {
        const pageright = new sql.Request(SMTERP);
        pageright.input('Autheticate_Id', sql.NVarChar, auth);
        pageright.input('Menu_Id', sql.Int, menuid);
        pageright.input('Menu_Type_Id', sql.Int, menutype);
        const result = await pageright.execute('User_Rights_By_Page_Id');
        if (result.recordset.length !== 0) {
            res.status(200).json({
                status: "success",
                data: {
                    Read_Rights: result.recordset[0].Read_Rights,
                    Add_Rights: result.recordset[0].Add_Rights,
                    Edit_Rights: result.recordset[0].Edit_Rights,
                    Delete_Rights: result.recordset[0].Delete_Rights
                }, message: ""
            })
        } else {
            res.status(200).json({ data: { Read_Rights: 0, Add_Rights: 0, Edit_Rights: 0, Delete_Rights: 0 }, status: "Success", message: "No Page Rights" })
        }
    }
    catch (err) {
        console.error('Error executing SQL query:', err);
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    }
});

export default PageRights;