import SMTERP from "../../config/erpdb.mjs";
import sql from 'mssql'
import express from 'express'
import authenticateToken from "../login-logout/auth.mjs";
const BranchROute = express.Router()

BranchROute.get('/api/branch', authenticateToken, async (req, res) => {
    try {
        const requestWithParams = new sql.Request(SMTERP);
        requestWithParams.input('User_Id', sql.Int, 0);
        requestWithParams.input('Company_id', sql.Int, 0);

        const result = await requestWithParams.execute('Branch_List');
        if (result.recordset.length > 0){
            res.json({ data: result.recordset, status: "Success", message: "" }).status(200);
        } else {
            res.json({ data: [], status:'Failure', message:"Not Found"}).status(200)
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    }
})

export default BranchROute;