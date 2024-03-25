import express from "express";
import sql from 'mssql'
import SMTERP from "../config/erpdb.mjs";
import authenticateToken from "./login-logout/auth.mjs";
import ServerError from '../config/handleError.mjs'

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
        if (Emp_Id === 0) {
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
        ServerError(e, ' /api/attendance ', 'GET', res)
    }
})

EmpAttanance.post('/api/attendance', authenticateToken, async (req, res) => {
    const { UserId, Latitude, Longitude, Start_Date, InTime, Creater } = req.body;
    let emp;

    if (Creater === "Admin" && (!UserId || UserId === '') && (!Start_Date || !Start_Date === '') && (!InTime || !InTime === '')) {
        return res.json({ data: [], status: 'Failure', message: 'UserId, Start_Date, InTime is Required!' }).status(422)
    }
    if (Creater === "Employee" && (!UserId || UserId === '') && (!Latitude || Latitude === '') && (!Longitude && Longitude === '')) {
        return res.json({ data: [], status: 'Failure', message: 'UserId, Latitude, Longitude is Required!' }).status(422)
    }

    try {
        if (Creater === 'Admin') {
            emp = UserId
        } else {
            emp = await getEmpId(UserId)
        }
        const Emp_Id = emp
        if (Emp_Id === 0) {
            return res.json({ data: [], status: 'Failure', message: 'Not An Employee' })
        }

        const CheckPreviousDays = `SELECT Current_St FROM tbl_Employee_Attanance 
                                   WHERE Emp_Id = ${Emp_Id} 
                                    AND CONVERT(DATE, Start_Date) != CONVERT(DATE, GETDATE()) 
                                    AND Current_St = 0`;

        const PreviousDayResult = await SMTERP.query(CheckPreviousDays)
        if (PreviousDayResult.recordset.length > 0) {
            return res.json({ data: [], status: 'Failure', message: 'Contact Admin!, Attendance Not Closed For Previous Working Day' })
        }

        const CheckAttanance = `SELECT * FROM tbl_Employee_Attanance 
                                WHERE Emp_Id = ${Emp_Id} 
                                  AND CONVERT(DATE, Start_Date) = CONVERT(DATE, GETDATE()) 
                                  AND (Current_St = 0 OR Current_St = 1)`

        const TodayResult = await SMTERP.query(CheckAttanance)
        if (TodayResult.recordset.length > 0) {
            return res.json({ data: [], status: 'Failure', message: 'Attendance already recorded for the Date' })
        }

        if (Creater === "Employee") {
            const insertAttanance = `INSERT INTO tbl_Employee_Attanance 
            (Emp_Id, Entry_Date, Start_Date, InTime, Latitude, Longitude, Current_St)
            VALUES 
            ('${Emp_Id}', GETDATE(), GETDATE(), CONVERT(TIME, GETDATE()), '${Latitude}', '${Longitude}', '0')`;

            const result = await SMTERP.query(insertAttanance)
            if (result && result.rowsAffected && result.rowsAffected[0] > 0) {
                return res.json({ data: [], status: 'Success', message: 'Attendance Noted!' })
            } else {
                return res.json({ data: [], status: 'Failure', message: 'Failed To Add Attendance' })
            }
        }

        if (Creater === 'Admin') {
            const insertAttanance = `INSERT INTO tbl_Employee_Attanance 
            (Emp_Id, Entry_Date, Start_Date, InTime, Current_St)
            VALUES 
            ('${Emp_Id}', CONVERT(DATE, '${Start_Date}'), CONVERT(DATE, '${Start_Date}'), CONVERT(TIME, '${InTime}'), '0')`;

            const result = await SMTERP.query(insertAttanance)
            if (result && result.rowsAffected && result.rowsAffected[0] > 0) {
                return res.json({ data: [], status: 'Success', message: 'Attendance Noted!' })
            } else {
                return res.json({ data: [], status: 'Failure', message: 'Failed To Add Attendance' })
            }
        }
    } catch (e) {
        ServerError(e, ' /api/attendance ', 'POST', res)
    }
})

EmpAttanance.put('/api/attendance', authenticateToken, async (req, res) => {
    const { UserId, Work_Summary } = req.body;
    try {
        const Emp_Id = await getEmpId(UserId)
        if (Emp_Id === 0) {
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
            if (result && result.rowsAffected && result.rowsAffected[0] > 0) {
                res.json({ data: [], status: 'Success', message: 'Attendance Closed!' })
            } else {
                res.json({ data: [], status: 'Failure', message: 'Failed To Close Attendance' })
            }
        } else {
            res.json({ data: [], status: 'Success', message: 'No Attandance Entry Found For Today' })
        }
    } catch (e) {
        ServerError(e, ' /api/attendance ', 'PUT', res)
    }
})

EmpAttanance.get('/api/UserAttendanceHistory', authenticateToken, async (req, res) => {
    const { UserId, Mode } = req.query;

    if (!UserId || !Mode) {
        return res.status(400).json({ data: [], message: 'UserId, Mode is required', status: 'Failure' })
    }

    try {
        const withId = `SELECT 
                            a.*,  
                            e.Emp_Name, 
                            e.User_Mgt_Id
                        FROM 
                            tbl_Employee_Attanance as a
                        JOIN tbl_Employee_Master as e 
                            ON a.Emp_Id = e.Emp_Id
                        WHERE a.Emp_Id = ${UserId} ORDER BY a.Start_Date DEC`;
        const withoutId = `SELECT 
                                a.*,  
                                e.Emp_Name, 
                                e.User_Mgt_Id
                            FROM 
                                tbl_Employee_Attanance as a
                            JOIN tbl_Employee_Master as e 
                                ON a.Emp_Id = e.Emp_Id
                            ORDER BY 
                            a.Start_Date ASC,
                            e.Emp_Name ASC`
        const exeQruey = Number(Mode) === 1 ? withId : withoutId
        console.log(exeQruey)
        const result = await SMTERP.query(exeQruey)
        if (result.recordset.length > 0) {
            res.json({ data: result.recordset, message: 'Available', status: 'Success' })
        } else {
            res.json({ data: [], message: 'Not Available', status: 'Success' })
        }
    } catch (e) {
        ServerError(e, ' /api/attendance ', 'GET', res)
    }
})

EmpAttanance.get('/api/attendance/MyAttendance', authenticateToken, async (req, res) => {
    const { UserId } = req.query;

    if (!UserId) {
        return res.status(400).json({ status: 'Failure', data: [], message: 'UserId is required' })
    }

    try {
        const Emp_ID = await getEmpId(UserId)
        const query = `SELECT 
                            a.*,  
                            e.Emp_Name, 
                            e.User_Mgt_Id
                        FROM 
                            tbl_Employee_Attanance as a
                        JOIN tbl_Employee_Master as e 
                            ON a.Emp_Id = e.Emp_Id
                        WHERE a.Emp_Id = ${Emp_ID} ORDER BY a.Start_Date DESC`;
        const result = await SMTERP.query(query)
        if (result.recordset.length > 0) {
            return res.json({ data: result.recordset, message: 'Available', status: 'Success' })
        } else {
            return res.json({ data: [], message: 'Not Available', status: 'Success' })
        }
    } catch (e) {
        ServerError(e, '/api/attendance/MyAttendance', 'Get', res)
    }
})

// EmpAttanance.get('/api/UserAttendanceHistory', async (req, res) => {
//     console.log('i caleld')
//     try {
//         const getActiveEmp = `SELECT 
//                                 a.Id, 
//                                 a.Emp_Id, 
//                                 e.Emp_Code, 
//                                 e.Emp_Name, 
//                                 a.Entry_Date, 
//                                 a.Start_Date, 
//                                 a.InTime 
//                             FROM tbl_Employee_Attanance AS a 
//                             JOIN tbl_Employee_Master as e 
//                             ON a.Emp_Id = e.Emp_Id 
//                             WHERE a.Current_St = 0`;
//         const result = await SMTERP.query(getActiveEmp);
//         if (result.recordset.length > 0) {
//             res.json({ data: result.recordset, status: "Success", message: 'Available' })
//         } else {
//             res.json({ data: [], status: "Success", message: 'Not Available' })
//         }
//     } catch (e) {
//         ServerError(e, ' /api/UserAttendanceHistory ', 'GET', res)
//     }
// })

EmpAttanance.get('/api/ActiveEmployee', authenticateToken, async (req, res) => {
    try {
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
            res.json({ data: result.recordset, status: "Success", message: 'Available' })
        } else {
            res.json({ data: [], status: "Success", message: 'Not Available' })
        }
    } catch (e) {
        ServerError(e, '/api/ActiveEmployee', 'GET', res)
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
        ServerError(e, '/api/ActiveEmployee', 'PUT', res)
    }
});

EmpAttanance.get('/api/TaskList', authenticateToken, async (req, res) => {
    const { UserId, Fromdate } = req.query;
    if (!UserId && !Fromdate) {
        return res.json({ data: [], status: 'Failure', message: 'UserId, Fromdate is Required!' }).status(422)
    }
    try {
        const getTask = new sql.Request(SMTERP)
        getTask.input('Fromdate', sql.VarChar, Fromdate);
        getTask.input('Emp_Id', sql.Int, UserId);

        const result = await getTask.execute("Task_Work_Search")
        if (result.recordset.length > 0) {
            res.json({ data: result.recordset, status: "Success", message: 'Records Found' })
        } else {
            res.json({ data: [], status: "Success", message: 'No Records' })
        }
    } catch (e) {
        ServerError(e, '/api/TaskList', 'GET', res)
    }
})

EmpAttanance.get('/api/employeeDropDown', authenticateToken, async (req, res) => {
    try {
        const selectEmp = `SELECT Emp_Id, Emp_Name, User_Mgt_Id FROM tbl_Employee_Master`
        const result = await SMTERP.query(selectEmp)
        if (result.recordset.length > 0) {
            res.json({ data: result.recordset, status: 'Success', message: 'Available' })
        } else {
            res.json({ data: [], status: 'Success', message: 'Not Available' })
        }
    } catch (e) {
        ServerError(e, ' /api/employee-without-attendance ', 'GET', res);
    }
})



export default EmpAttanance