import express from "express";
import sql from 'mssql'
import SMTERP from "../../config/erpdb.mjs";

function dataFound(res, data, message) {
    return res.status(200).json({ data: data, message: message || 'Data Found', status: 'Success' });
}

function noData(res, message) {
    return res.status(200).json({ data: [], status: 'Success', message: message || 'No data' })
}

function falied(res, message) {
    return res.status(400).json({ data: [], message: message || 'Something Went Wrong! Please Try Again', status: "Failure" })
}

function servError(e, res, message) {
    console.log(e);
    return res.status(500).json({ data: [], status: "Failure", message: message || "Server error" })
}

function invalidInput(res, message) {
    return res.status(400).json({ data: [], status: "Failure", message: message || 'Invalid request' })
}

const TrackingLocation = express.Router();

TrackingLocation.get('/location', async (req, res) => {
    const { Emp_Id, W_Date } = req.query;

    if (!Number(Emp_Id) || !W_Date) {
        return invalidInput(res, 'Emp_Id, W_Date is required')
    }

    try {

        const query = `
        SELECT 
	    	* 
	    FROM 
	    	tbl_Tacking_Test
	    WHERE 
	    	W_Date >= @start
	    	AND 
	    	W_Date <= @end
	    	AND 
	    	Emp_Id = @emp`

        const request = new sql.Request(SMTERP);

        request.input('emp', Emp_Id)
        request.input('start', new Date(W_Date).toISOString().split('T')[0] + ' 00:00:00.000')
        request.input('end', new Date(W_Date).toISOString().split('T')[0] + ' 23:59:59.999')

        const result = await request.query(query);

        if (result.recordset.length > 0) {
            dataFound(res, result.recordset)
        } else {
            noData(res)
        }

    } catch (e) {
        servError(e, res)
    }
})

TrackingLocation.post('/location', async (req, res) => {
    const { Emp_Id, Latitude, Logitude, Web_URL } = req.body;

    if (!Emp_Id || !Latitude || !Logitude || !Web_URL) {
        return invalidInput(res, 'Emp_Id, Latitude, Logitude, Web_URL is required')
    }

    try {
        const postQuery = `
      INSERT INTO tbl_Tacking_Test 
        (Emp_Id, W_Date, Latitude, Logitude, Web_URL) 
      VALUES 
        (@emp, @date, @latitude, @longitude, @url)`

        const request = new sql.Request(SMTERP)
        request.input('emp', Emp_Id)
        request.input('date', new Date())
        request.input('latitude', Latitude)
        request.input('longitude', Logitude)
        request.input('url', Web_URL)

        const result = await request.query(postQuery);

        if (result && result.rowsAffected && result.rowsAffected[0] > 0) {
            dataFound(res, [], "Location Noted")
        } else {
            falied(res, 'Failed to Save Location')
        }
    } catch (e) {
        servError(e, res)
    }
})

export default TrackingLocation