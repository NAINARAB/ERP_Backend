import express from "express";
import sql from 'mssql'
import SMTERP from "../config/erpdb.mjs";
import authenticateToken from "./login-logout/auth.mjs";
import { invalidInput, falied, servError, dataFound, noData, success } from "./res.mjs";

const MultipleAttendance = express.Router();

const addAttendance = async (req, res) => {
    const { UserId, Latitude, Longitude } = req.body;

    try {

        if (!UserId || !Latitude || !Longitude) {
            return invalidInput(res, 'UserId, Latitude, Longitude is required');
        }

        const query = `
            INSERT INTO 
                tbl_Attendance (UserId, Start_Date, Latitude, Longitude, Active_Status)
            VALUES 
                (@user, @date, @latitude, @longitude, @status)`;

        const request = new sql.Request(SMTERP);
        request.input('user', UserId);
        request.input('date', new Date());
        request.input('latitude', Latitude);
        request.input('longitude', Longitude);
        request.input('status', 1);

        const result = await request.query(query);

        if (result.rowsAffected[0] && result.rowsAffected[0] > 0) {
            success(res, 'Attendance Noted!')
        } else {
            falied(res, 'Failed to Add Attendance')
        }
    } catch (e) {
        servError(e, res);
    }
}

const getMyTodayAttendance = async (req, res) => {
    const { UserId } = req.query;

    if (isNaN(UserId)) {
        return invalidInput(res, 'UserId is required')
    }

    try {
        const query = `
            SELECT 
                * 
            FROM 
                tbl_Attendance 
            WHERE 
                UserId = @user
                AND
                CONVERT(DATE, Start_Date) = CONVERT(DATE, GETDATE())`;

        const request = new sql.Request(SMTERP);
        request.input('user', UserId)

        const result = await request.query(query);

        if (result.recordset.length > 0) {
            dataFound(res, result.recordset)
        } else {
            noData(res)
        }
    } catch (e) {
        servError(e, res);
    }
}

const getMyLastAttendanceOfToday = async (req, res) => {
    const { UserId } = req.query;

    if (isNaN(UserId)) {
        return invalidInput(res, 'UserId is required')
    }

    try {
        const query = `
            SELECT 
                TOP (1)
                * 
            FROM 
                tbl_Attendance 
            WHERE 
                UserId = @user
                AND
                CONVERT(DATE, Start_Date) = CONVERT(DATE, GETDATE())
            ORDER BY
                CONVERT(DATETIME, Start_Date) DESC`;

        const request = new sql.Request(SMTERP);
        request.input('user', UserId)

        const result = await request.query(query);

        if (result.recordset.length > 0) {
            dataFound(res, result.recordset)
        } else {
            noData(res)
        }
    } catch (e) {
        servError(e, res);
    }
}

const closeAttendance = async (req, res) => {
    const { Id, Description } = req.body;

    try {

        if (isNaN(Id)) {
            return invalidInput(res, 'Id is required, Description is optional')
        }

        const query = `
            UPDATE 
                tbl_Attendance 
            SET
                End_Date = @enddate,
                Active_Status = @status,
                Description = @desc
            WHERE
                Id = @id`;

        const request = new sql.Request(SMTERP);
        request.input('enddate', new Date())
        request.input('status', 0)
        request.input('id', Id);
        request.input('desc', Description ? Description : '')

        const result = await request.query(query);

        if (result.rowsAffected[0] && result.rowsAffected[0] > 0) {
            success(res, 'Attendance Closed')
        } else {
            falied(res, 'Failed to Close Attendance')
        }

    } catch (e) {
        servError(e, res);
    }
}

const getAttendanceHistory = async (req, res) => {
    const { From, To, UserId } = req.query;

    if (!From || !To) {
        return invalidInput(res, 'From and To is required')
    }

    try {
        let query = `
            SELECT
            	a.*,
            	u.Name AS User_Name
            FROM
            	tbl_Attendance AS a
            	LEFT JOIN tbl_Users AS u
            	ON u.UserId = a.UserId
            WHERE
            	CONVERT(DATE, a.Start_Date) >= CONVERT(DATE, @from)
            	AND
            	CONVERT(DATE, a.Start_Date) <= CONVERT(DATE, @to)`;
        if (Number(UserId)) {
            query += `
                AND
                a.UserId = @userid`;
        }

        const request = new sql.Request(SMTERP);
        request.input('from', From);
        request.input('to', To);
        request.input('userid', UserId);

        const result = await request.query(query);

        if (result.recordset.length > 0) {
            dataFound(res, result.recordset)
        } else {
            noData(res)
        }
    } catch (e) {
        servError(e, res);
    }
}

const getLeaveDays = async (req, res) => {
    const { Fromdate, Todate } = req.query;

    try {
        let query =`
        SELECT 
            l.*,
            u.Name
        FROM 
            tbl_Leave_Master AS l
            
            LEFT JOIN tbl_Users AS u
            ON u.UserId = l.UserId `
        
        if (Fromdate && Todate) {
            query += ` 
            WHERE 
                CONVERT(DATE, l.LeaveDate) >= CONVERT(DATE, @from)
                AND
                CONVERT(DATE, l.LeaveDate) <= CONVERT(DATE, @TO)
            `
        }

        query += `
        ORDER BY
            CONVERT(DATE, l.LeaveDate)`;

        const request = new sql.Request(SMTERP);
        request.input('from', Fromdate);
        request.input('to', Todate);

        const result = await request.query(query);
        if (result.recordset.length > 0) {
            dataFound(res, result.recordset);
        } else {
            noData(res)
        }
    } catch (e) {
        servError(e, res);
    }
}

const createLeaveDay = async (req, res) => {
    const { LeaveDate, LeaveInfo, UserId } = req.body;

    if (!LeaveDate || isNaN(UserId)) {
        return invalidInput(res, 'LeaveDate, UserId is required');
    }

    try {
        const checkIfAlreadyExists = await SMTERP.query(
            `SELECT COUNT(LeaveDate) AS LeaveCount FROM tbl_Leave_Master WHERE CONVERT(DATE, LeaveDate) = CONVERT(DATE, '${new Date(LeaveDate)}')`
        )

        if (checkIfAlreadyExists.recordset[0]?.LeaveCount > 0) {
            return falied(res, 'Already Exists')
        }

        const query = `
        INSERT INTO tbl_Leave_Master 
            (LeaveDate, LeaveInfo, CreatedBy, CreatedAt) 
        VALUES
            (@date, @info, @creat, @at)`;
        
        const request = new sql.Request(SMTERP);
        request.input('date', LeaveDate);
        request.input('info', LeaveInfo);
        request.input('creat', UserId);
        request.input('at', new Date());

        const result = await request.query(query);

        if (result.recordset.length > 0) {
            success(res, 'Leave Day Created');
        } else {
            falied(res, 'Failed to create leave day')
        }
    } catch (e) {
        servError(e, res);
    }
}

MultipleAttendance.post('/api/newAttendance', authenticateToken, addAttendance);
MultipleAttendance.put('/api/newAttendance', authenticateToken, closeAttendance);
MultipleAttendance.delete('/api/newAttendance', authenticateToken, closeAttendance);

MultipleAttendance.get('/api/myTodayAttendance', authenticateToken, getMyTodayAttendance);
MultipleAttendance.get('/api/myAttendanceHistory', authenticateToken, getAttendanceHistory);
MultipleAttendance.get('/api/getMyLastAttendance', authenticateToken, getMyLastAttendanceOfToday);

//leave management

MultipleAttendance.get('/api/leaveDays', authenticateToken, getLeaveDays);
MultipleAttendance.post('/api/leaveDays', authenticateToken, createLeaveDay);

export default MultipleAttendance
