import express from "express";
import sql from 'mssql'
import SMTERP from "../config/erpdb.mjs";
import authenticateToken from "./login-logout/auth.mjs";

const EmpAttanance = express.Router()

EmpAttanance.get('/api/attanance', async (req, res) => {
    const { id } = req.query;
    try {
        const EMP = `SELECT COALESCE((SELECT Emp_Id FROM tbl_Employee_Master WHERE User_Mgt_Id = ${id}), 0) AS Emp_Id`;
        const getEmp = await SMTERP.query(EMP)
        const Emp_Id = getEmp.recordset[0]['Emp_Id']
        if(Emp_Id === 0){
            return res.json({ data: [], status: 'Failure', message: 'Not An Employee' })
        }

        const CheckAttanance = `SELECT * FROM tbl_Employee_Attanance 
        WHERE Emp_Id = ${Emp_Id} 
          AND CONVERT(DATE, Start_Date) = CONVERT(DATE, GETDATE()) 
          AND (Current_St = 0 OR Current_St = 1)`

        const TodayResult = await SMTERP.query(CheckAttanance)
        if (TodayResult.recordset.length > 0) {
            res.json({ data: TodayResult.recordset, status: 'Success', message: 'true' })
        } else {
            res.json({ data: [], status: 'Success', message: 'false' })
        }
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    }
})

EmpAttanance.post('/api/attanance', async (req, res) => {
    const { UserId, Latitude, Longitude } = req.body;
    console.log( UserId, Latitude, Longitude)

    try {
        const EMP = `SELECT COALESCE((SELECT Emp_Id FROM tbl_Employee_Master WHERE User_Mgt_Id = ${UserId}), 0) AS Emp_Id`;
        const getEmp = await SMTERP.query(EMP)
        const Emp_Id = getEmp.recordset[0]['Emp_Id']
        if(Emp_Id === 0){
            return res.json({ data: [], status: 'Failure', message: 'You are not an Employee' })
        }

        const CheckAttanance = `SELECT * FROM tbl_Employee_Attanance 
        WHERE Emp_Id = ${Emp_Id} 
          AND CONVERT(DATE, Start_Date) = CONVERT(DATE, GETDATE()) 
          AND (Current_St = 0 OR Current_St = 1)`

        const TodayResult = await SMTERP.query(CheckAttanance)
        if (TodayResult.recordset.length > 0) {
            res.json({ data: [], status: 'Success', message: 'Today Attendance Already Added'})
        } else {
            const insertAttanance = `INSERT INTO tbl_Employee_Attanance 
            (Emp_Id, Entry_Date, Start_Date, InTime, Latitude, Longitude, Current_St)
            VALUES 
            ('${Emp_Id}', GETDATE(), GETDATE(), CONVERT(TIME, GETDATE()), '${Latitude}', '${Longitude}', '0')`;

            const result = await SMTERP.query(insertAttanance)
            if(result && result.rowsAffected && result.rowsAffected[0] > 0) {
                res.json({data: [], status: 'Success', message: 'Attendance Noted!'})
            } else {
                res.json({data: [], status: 'Failure', message: 'Failed To Add Attendance'})
            }
        }
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    }
})

EmpAttanance.put('/api/attanance', async (req, res) => {
    const { UserId, Work_Summary } = req.body;
    try {
        const EMP = `SELECT COALESCE((SELECT Emp_Id FROM tbl_Employee_Master WHERE User_Mgt_Id = ${UserId}), 0) AS Emp_Id`;
        const getEmp = await SMTERP.query(EMP)
        const Emp_Id = getEmp.recordset[0]['Emp_Id']
        if(Emp_Id === 0){
            return res.json({ data: [], status: 'Failure', message: 'You are not an Employee' })
        }

        const CheckAttanance = `SELECT * FROM tbl_Employee_Attanance 
        WHERE Emp_Id = ${Emp_Id} 
          AND CONVERT(DATE, Start_Date) = CONVERT(DATE, GETDATE()) 
          AND Current_St = 0`

        const TodayResult = await SMTERP.query(CheckAttanance)
        if (TodayResult.recordset.length > 0 && TodayResult.recordset[0]['Current_St'] == '0') {
            const insertAttanance = `UPDATE tbl_Employee_Attanance SET 
            OutTime = CONVERT(TIME, GETDATE()), OutDate = CONVERT(DATE, GETDATE()),
            Work_Summary = '${Work_Summary}', Current_St = 1 WHERE Emp_Id = ${Emp_Id} AND CONVERT(DATE, Start_Date) = CONVERT(DATE, GETDATE())`;

            const result = await SMTERP.query(insertAttanance)
            if(result && result.rowsAffected && result.rowsAffected[0] > 0) {
                res.json({data: [], status: 'Success', message: 'Attendance Closed!'})
            } else {
                res.json({data: [], status: 'Failure', message: 'Failed To Close Attendance'})
            }
        } else {
            res.json({ data: [], status: 'Success', message: 'No Attandance Entry Found For Today'})
        }
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    }
})

export default EmpAttanance