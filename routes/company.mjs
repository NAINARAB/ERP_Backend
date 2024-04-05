import express from "express";
import sql from 'mssql'
import SMTERP from "../config/erpdb.mjs";
import authenticateToken from "./login-logout/auth.mjs";
import { dataFound, falied, invalidInput, servError } from "./res.mjs";

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

CompanyRoute.get('/api/myCompanys', async (req, res) => {
    const { Auth } = req.query;

    if (!Auth) {
        return invalidInput(res, 'Auth is required');
    }

    try {
        const request = new sql.Request(SMTERP);
        request.input('Autheticate_Id', Auth);

        const result = await request.execute('DB_Name_Rights');

        if (result.recordset.length) {
            return dataFound(res, result.recordset)
        } else {
            return falied(res, 'No permission to access the company')
        }
    } catch (e) {
        servError(e, res)
    }
});

CompanyRoute.post('/api/companyAuthorization', authenticateToken, async (req, res) => {
    const { UserId, Company_Id, View_Rights } = req.body;

    if (!UserId || !Company_Id || isNaN(View_Rights)) {
        return invalidInput(res, 'UserId, Company_Id, View_Rights is required')
    }

    try {
        const deleteQuery = `DELETE FROM tbl_DB_Name_Rights WHERE User_Id = '${UserId}' AND Company_Id = '${Company_Id}'`;
        await SMTERP.query(deleteQuery);
        const insertQuery = `INSERT INTO tbl_DB_Name_Rights (User_Id, Company_Id, View_Rights) VALUES ('${UserId}', '${Company_Id}', '${View_Rights}')`;
        const result = await SMTERP.query(insertQuery)

        if (result.rowsAffected[0] && result.rowsAffected[0] > 0) {
            return dataFound(res, [], 'Changes saved')
        } else {
            return falied(res, 'Failed to save changes')
        }
        
    } catch (e) {
        servError(e, res)
    }
})

export default CompanyRoute