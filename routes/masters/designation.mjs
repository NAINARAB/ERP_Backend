import SMTERP from "../../config/erpdb.mjs";
import sql from 'mssql'
import express from 'express'
import authenticateToken from "../login-logout/auth.mjs";
const DesignationRoute = express.Router()

DesignationRoute.get('/api/emp-designation', authenticateToken, async (req, res) => {
    try {
        const selectDesignation = `select Designation_Id as id, Designation from tbl_Employee_Designation where Designation_Id != 0`
        const result = await SMTERP.query(selectDesignation);
        res.json({ data: result.recordset, status: 'Success', message: '' }).status(200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    }
})

export default DesignationRoute;