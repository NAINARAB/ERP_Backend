import express from "express";
import sql from 'mssql'
import SMTERP from "../config/erpdb.mjs";
import authenticateToken from "./login-logout/auth.mjs";

const CompanyRoute = express.Router()

CompanyRoute.get('/api/company', authenticateToken, async (req, res) => {
    try {
        const comp = new sql.Request(SMTERP);
        const result = await comp.execute('Company_List');
        res.json({ data: result.recordset, status: "Success", message: "" }).status(200);
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    }
})

export default CompanyRoute