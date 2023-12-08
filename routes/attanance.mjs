import express from "express";
import sql from 'mssql'
import SMTERP from "../config/erpdb.mjs";
import authenticateToken from "./login-logout/auth.mjs";

const EmpAttanance = express.Router()

async function getEmpId(id) {
    try {
        const EMP = `SELECT COALESCE((SELECT Emp_Id FROM tbl_Employee_Master WHERE User_Mgt_Id = ${id}), 0) AS Emp_Id`;
        const getEmp = await SMTERP.query(EMP)
        const Emp_Id = getEmp.recordset[0]['Emp_Id']
        return Emp_Id
    } catch (e) {
        console.log(e);
    }
}

EmpAttanance.get('/api/attendance', authenticateToken, async (req, res) => {
    const { id } = req.query;
    try {
        const Emp_Id = await getEmpId(id)
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

EmpAttanance.post('/api/attendance', authenticateToken, async (req, res) => {
    const { UserId, Latitude, Longitude } = req.body;

    if(!UserId && !Latitude && !Longitude){
        return res.json({data: [], status: 'Failure', message: 'UserId, Latitude, Longitude is Required!'}).status(422)
    }

    try {
        const Emp_Id = await getEmpId(UserId)
        if(Emp_Id === 0){
            return res.json({ data: [], status: 'Failure', message: 'Not An Employee' })
        }

        const CheckAttanance = `SELECT * FROM tbl_Employee_Attanance 
                                WHERE Emp_Id = ${Emp_Id} 
                                  AND CONVERT(DATE, Start_Date) = CONVERT(DATE, GETDATE()) 
                                  AND (Current_St = 0 OR Current_St = 1)`

        const CheckPreviousDays = `SELECT Current_St FROM tbl_Employee_Attanance 
                                   WHERE Emp_Id = ${Emp_Id} 
                                    AND CONVERT(DATE, Start_Date) != CONVERT(DATE, GETDATE()) 
                                    AND Current_St = 0`;

        const PreviousDayResult = await SMTERP.query(CheckPreviousDays)
        if(PreviousDayResult.recordset.length > 0){
            return res.json({ data: [], status: 'Failure', message: 'Contact Admin!, Attendance Not Closed For Previous Working Day'})
        }

        const TodayResult = await SMTERP.query(CheckAttanance)
        if (TodayResult.recordset.length > 0) {
            return res.json({ data: [], status: 'Failure', message: 'Today Attendance Already Added'})
        } else {
            const insertAttanance = `INSERT INTO tbl_Employee_Attanance 
            (Emp_Id, Entry_Date, Start_Date, InTime, Latitude, Longitude, Current_St)
            VALUES 
            ('${Emp_Id}', GETDATE(), GETDATE(), CONVERT(TIME, GETDATE()), '${Latitude}', '${Longitude}', '0')`;

            const result = await SMTERP.query(insertAttanance)
            if(result && result.rowsAffected && result.rowsAffected[0] > 0) {
                return res.json({data: [], status: 'Success', message: 'Attendance Noted!'})
            } else {
                return res.json({data: [], status: 'Failure', message: 'Failed To Add Attendance'})
            }
        }
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    }
})

EmpAttanance.put('/api/attendance', authenticateToken, async (req, res) => {
    const { UserId, Work_Summary } = req.body;
    try {
        const Emp_Id = await getEmpId(UserId)
        if(Emp_Id === 0){
            return res.json({ data: [], status: 'Failure', message: 'Not An Employee' })
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

EmpAttanance.get('/api/UserAttendanceHistory', authenticateToken, async (req, res) => {
    const {UserId} = req.query;
    try{
        const Emp_Id = await getEmpId(UserId)
        if(Emp_Id === 0){
            return res.json({ data: [], status: 'Failure', message: 'Not An Employee' })
        }
        const getAttendance = `SELECT * FROM tbl_Employee_Attanance WHERE Emp_Id = ${Emp_Id}`;
        const result = await SMTERP.query(getAttendance)
        if(result.recordset.length > 0){
            res.json({data: result.recordset, message:'Available', status: 'Success'})
        } else {
            res.json({data: [], message:'Not Available', status: 'Success'})
        }
    } catch (e){
        console.log(e)
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    }
})

EmpAttanance.get('/api/ActiveEmployee', authenticateToken, async (req,res) => {
    try{
        const getActiveEmp = `SELECT 
                                a.Id, 
                                a.Emp_Id, 
                                e.Emp_Code, 
                                e.Emp_Name, 
                                a.Entry_Date, 
                                a.Start_Date, 
                                a.InTime 
                            FROM tbl_Employee_Attanance AS a 
                            JOIN tbl_Employee_Master as e 
                            ON a.Emp_Id = e.Emp_Id 
                            WHERE a.Current_St = 0`;
        const result = await SMTERP.query(getActiveEmp);
        if (result.recordset.length > 0) {
            res.json({data: result.recordset, status: "Success", message: 'Available'})
        } else {
            res.json({data: [], status: "Success", message: 'Not Available'})
        }
    } catch (e){
        console.log(e);
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    }
})

EmpAttanance.put('/api/ActiveEmployee', authenticateToken, async (req, res) => {
    const { Id, OutDate, OutTime } = req.body;
    try {
        const CloseAttendance = `
            UPDATE tbl_Employee_Attanance 
            SET OutTime = CONVERT(TIME, @OutTime), OutDate = CONVERT(DATE, @OutDate), Work_Summary = @WorkSummary, Current_St = @CurrentSt
            WHERE Id = @Id`;

        const result = await SMTERP.request()
            .input('OutTime', OutTime)
            .input('OutDate', OutDate)
            .input('WorkSummary', 'Attendance Closed By Admin') 
            .input('CurrentSt', 1) 
            .input('Id', Id)
            .query(CloseAttendance);

        if (result && result.rowsAffected && result.rowsAffected[0] > 0) {
            res.json({ data: [], status: 'Success', message: 'Attendance Closed!' });
        } else {
            res.json({ data: [], status: 'Failure', message: 'Failed To Close Attendance' });
        }
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    }
});

EmpAttanance.get('/api/TaskList', authenticateToken, async (req, res) => {
    const {UserId, Fromdate} = req.query;
    if(!UserId && !Fromdate){
        return res.json({data: [], status: 'Failure', message: 'UserId, Fromdate is Required!'}).status(422)
    }
    try {
        const getTask = new sql.Request(SMTERP)
        getTask.input('Fromdate', sql.VarChar, Fromdate);
        getTask.input('Emp_Id', sql.Int, UserId);

        const result = await getTask.execute("Task_Work_Search")
        if(result.recordset.length > 0){
            res.json({data: result.recordset, status:"Success", message: 'Records Found'})
        } else {
            res.json({data: [], status: "Success", message: 'No Records'})
        }
    } catch(e){
        console.log(e);
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    }
})



export default EmpAttanance