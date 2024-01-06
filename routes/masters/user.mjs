import express from 'express';
import authenticateToken from '../login-logout/auth.mjs';
import sql from 'mssql';
import SMTERP from '../../config/erpdb.mjs';
import crypto from 'crypto';
import ServerError from '../../config/handleError.mjs'

const userRoute = express.Router();

function md5Hash(input) {
    return crypto.createHash('md5').update(input).digest('hex');
}

userRoute.get('/api/users', authenticateToken, async (req, res) => {
    const query = `SELECT u.UserId, u.UserTypeId, u.Name, u.UserName AS Mobile, u.Autheticate_Id AS Token, u.Password, u.BranchId, ut.UserType, b.BranchName
                      FROM tbl_Users as u
                      JOIN
                        tbl_User_Type as ut
                        ON u.UserTypeId = ut.id
                      JOIN
                        tbl_Business_Master as b
                        ON u.BranchId = b.BranchId
                      WHERE 
                        UserId != 0
                      AND
                        UDel_Flag = 0`;
    try {
        const result = await SMTERP.query(query);
        res.json({ data: result.recordset, status: 'Success', message: '' });
    } catch (err) {
        console.error('Error executing SQL query:', err);
        res.status(500).json({ message: 'Internal Server Error', data: [], status: 'Failure' });
    }
});

userRoute.post('/api/users', authenticateToken, async (req, res) => {
    const { name, mobile, usertype, password, branch } = req.body;
    const md5Password = md5Hash(password);

    try {
        const checkmobile = `SELECT UserName from tbl_Users WHERE UserName = '${mobile}' AND UDel_Flag = 0`;
        const checkResult = await SMTERP.query(checkmobile);

        if (checkResult.recordset.length > 0) {
            res.status(422).json({ data: [], status: 'Failure', message: 'Mobile Number Already Exists' });
            return;
        }

        const newuser = new sql.Request(SMTERP);
        newuser.input('Mode', sql.TinyInt, 1);
        newuser.input('UserId', sql.Int, 0);
        newuser.input('Name', sql.VarChar, name);
        newuser.input('UserName', sql.VarChar, mobile);
        newuser.input('UserTypeId', sql.BigInt, usertype);
        newuser.input('Password', sql.VarChar, md5Password);
        newuser.input('BranchId', sql.Int, branch);

        const result = await newuser.execute('UsersSP');
        if (result.recordset.length > 0) {
            res.status(200).json({ data: [], status: 'Success', message: 'New User Created' });
        } else {
            res.status(500).json({ data: [], status: 'Failure', message: 'User Creation Failed' });
        }
    } catch (e) {
        console.error(e);
        res.status(422).json({ data: [], status: 'Failure', message: 'User Creation Failed' });
    }
})

userRoute.put('/api/users', authenticateToken, async (req, res) => {
    const { name, mobile, usertype, password, branch, userid } = req.body;
    const isMd5Hash = /^[a-fA-F0-9]{32}$/.test(password);
    const passwordToUse = isMd5Hash ? password : md5Hash(password);

    try {
        const checkmobile = `SELECT UserName from tbl_Users WHERE UserName = '${mobile}' AND UDel_Flag = 0 AND UserId != '${userid}'`;
        const checkResult = await SMTERP.query(checkmobile);

        if (checkResult.recordset.length > 0) {
            res.status(422).json({ data: [], status: 'Failure', message: 'Mobile Number Already Exists' });
            return;
        }

        const newuser = new sql.Request(SMTERP);
        newuser.input('Mode', sql.TinyInt, 2);
        newuser.input('UserId', sql.Int, userid);
        newuser.input('Name', sql.VarChar, name);
        newuser.input('UserName', sql.VarChar, mobile);
        newuser.input('UserTypeId', sql.BigInt, usertype);
        newuser.input('Password', sql.VarChar, passwordToUse);
        newuser.input('BranchId', sql.Int, branch);

        const result = await newuser.execute('UsersSP');
        if (result) {
            res.status(200).json({ data: [], status: 'Success', message: 'Changes Saved' });
        } else {
            res.status(500).json({ data: [], status: 'Failure', message: 'Failed to Save changes' });
        }
    } catch (e) {
        console.error(e);
        res.status(422).json({ data: [], status: 'Failure', message: 'User Creation Failed' });
    }
});

userRoute.delete('/api/users/:userid', authenticateToken, async (req, res) => {
    const { userid } = req.params;
    try {
        const newuser = new sql.Request(SMTERP);
        newuser.input('Mode', sql.TinyInt, 3);
        newuser.input('UserId', sql.Int, userid);
        newuser.input('Name', sql.VarChar, '');
        newuser.input('UserName', sql.VarChar, '');
        newuser.input('UserTypeId', sql.BigInt, '');
        newuser.input('Password', sql.VarChar, '');
        newuser.input('BranchId', sql.Int, '');

        const result = await newuser.execute('UsersSP');
        if (result) {
            res.status(200).json({ data: [], status: 'Success', message: 'User Removed' });
        } else {
            res.status(422).json({ data: [], status: 'Failure', message: 'Failed to Delete' });
        }
    } catch (e) {
        console.log(e);
        res.status(500).json({ data: [], status: 'Failure', message: 'Server Error' });
    }
});

// userRoute.get('/api/usertype', authenticateToken, async (req, res) => {
//     const query = 'SELECT * FROM tbl_User_Type';
//     SMTERP.query(query).then(result => {
//         res.status(200).json({ data: result.recordset, status: "Success", message: '' });
//     }).catch(err => {
//         console.error('Error executing SQL query:', err);
//         res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
//     })
// });

userRoute.get('/api/usertype', authenticateToken, async (req, res) => {
    try {
        const getCustomer = `SELECT * FROM tbl_User_Type WHERE IsActive = 1 ORDER BY Id ASC`;
        const result = await SMTERP.query(getCustomer)
        if (result && result.recordset.length > 0) {
            res.json({ data: result.recordset, status: "Success", message: "Found" }).status(200);
        } else {
            res.json({ data: [], status: "Success", message: "Not Found" }).status(200);
        }
    } catch (e) {
        ServerError(e, '/api/customerCategories', 'get', res);
    }
})

userRoute.post('/api/usertype', authenticateToken, async (req, res) => {
    const { name, alias } = req.body;
    
    if (!name) {
        return res.status(400).json({ status: "Failure", message: 'name required', data: [] });
    }

    try {
        const checkQuery = 'SELECT COUNT(*) AS count FROM tbl_User_Type WHERE UserType = @name AND IsActive = 1';
        const checkRequest = new sql.Request(SMTERP);
        checkRequest.input('name', sql.NVarChar, name);
        const checkResult = await checkRequest.query(checkQuery);

        if (checkResult.recordset[0].count > 0) {
            return res.status(400).json({ data: [], status: "Failed", message: "Already exists!" });
        } else {
            const getMaxIdQuery = 'SELECT ISNULL(MAX(Id), 0) AS MaxId FROM tbl_User_Type';
            const maxIdResult = await new sql.Request(SMTERP).query(getMaxIdQuery);
            const newId = parseInt(maxIdResult.recordset[0].MaxId) + 1;

            const insertUserType = 'INSERT INTO tbl_User_Type (Id, UserType, Alias) VALUES (@id, @name, @alias)';
            const insertRequest = new sql.Request(SMTERP);
            insertRequest.input('id', newId);
            insertRequest.input('name', sql.NVarChar, name);
            insertRequest.input('alias', sql.NVarChar, alias);
            
            const result = await insertRequest.query(insertUserType);

            if (result.rowsAffected.length > 0) {
                return res.status(201).json({ data: [], status: "Success", message: "Created" });
            } else {
                return res.status(400).json({ data: [], status: "Failed", message: "Failed" });
            }
        }
    } catch (e) {
        ServerError(e, '/api/usertype', 'post', res);
    }
});


userRoute.delete('/api/usertype', authenticateToken, async (req, res) => {
    const { id } = req.query;
    if (!id) {
        return res.status(400).json({ data: [], status: 'Failure', message: 'id required' })
    }
    try {
        const deleteCustomer = 'UPDATE tbl_User_Type SET IsActive = 0 WHERE Id = @id';
        const deleteRequest = new sql.Request(SMTERP);
        deleteRequest.input('id', sql.Int, id);
        const result = await deleteRequest.query(deleteCustomer)
        if (result.rowsAffected.length > 0) {
            res.status(200).json({ data: [], status: "Success", message: "Deleted" });
        } else {
            res.status(400).json({ data: [], status: "Failed", message: "Failed" });
        }

    } catch (e) {
        ServerError(e, '/api/usertype', 'delete', res)
    }
})




userRoute.get('/api/userid', (req, res) => {
    const authId = req.header('Authorization');
    const userID = `SELECT UserId FROM tbl_Users WHERE Autheticate_Id = '${authId}'`;
    SMTERP.query(userID).then(result => {
        if (result.recordset.length > 0) {
            res.json({ data: result.recordset, status: 'Success' }).status(200)
        } else {
            res.json({ data: [], status: 'Failure', message: "" }).status(200)
        }
    }).catch(err => {
        console.error('Error executing SQL query:', err);
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    })
})

userRoute.get('/api/employee', authenticateToken, (req, res) => {
    const getEmp = `SELECT e.*, d.Designation AS Designation_Name, b.BranchName, u.Name AS CreaterName
                    FROM tbl_Employee_Master AS e
                    JOIN 
                        tbl_Employee_Designation as d
                        ON e.Designation = d.Designation_Id
                    JOIN 
                        tbl_Users as u
                        ON e.Entry_By = u.UserId
                    JOIN 
                        tbl_Business_Master as b
                        ON e.Branch = b.BranchId
                    ORDER BY e.Emp_Id`;
    SMTERP.query(getEmp).then(result => {
        res.status(200).json({ data: result.recordset, status: "Success", message: '' });
    }).catch(err => {
        console.error('Error executing SQL query:', err);
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    })
})

userRoute.post('/api/employee', authenticateToken, async (req, res) => {
    const { data, userMGT } = req.body;
    let userId = '';
    let empcode;
    let zeros = 0;
    let maxId = 0;
    if (data.branch == 1) {
        empcode = 'SMT'
    } else if (data.branch == 2) {
        empcode = 'ACC'
    } else {
        empcode = ''
    }

    try {
        const checkmobile = `SELECT UserName FROM tbl_Users WHERE UserName = '${data.mobile}' AND UDel_Flag = 0`;
        const checkResult = await SMTERP.query(checkmobile);

        if (checkResult.recordset.length > 0) {
            return res.status(422).json({ data: [], status: 'Failure', message: 'Mobile Number Already Exists' });
        }

        const getMax = 'SELECT COALESCE(MAX(Emp_Id), 0) AS MaxValue FROM tbl_Employee_Master';
        const result = await SMTERP.query(getMax);
        maxId = result.recordset[0]['MaxValue'] != 0 ? parseInt(result.recordset[0]['MaxValue']) + 1 : 1;

        if (maxId < 10) {
            zeros = '000';
        } else if (maxId < 100) {
            zeros = '00';
        } else if (maxId < 1000) {
            zeros = '0';
        }

        if (userMGT) {
            const newuser = new sql.Request(SMTERP);
            newuser.input('Mode', sql.TinyInt, 1);
            newuser.input('UserId', sql.Int, 0);
            newuser.input('Name', sql.VarChar, data.empname);
            newuser.input('UserName', sql.VarChar, data.mobile);
            newuser.input('UserTypeId', sql.BigInt, 3);
            newuser.input('Password', sql.VarChar, md5Hash('123456'));
            newuser.input('BranchId', sql.Int, parseInt(data.branch));

            const result = await newuser.execute('UsersSP');

            if (result.recordset.length > 0) {
                userId = result.recordset[0][''];
            } else {
                return res.status(422).json({ data: [], status: 'Failure', message: 'Error Creating User' });
            }
        }

        const insertEmployee = `
        INSERT INTO tbl_Employee_Master
        (
            Emp_Id, Branch, Emp_Code, Emp_Name, Designation, DOB, DOJ, Address_1, Address_2, City,
            Country, Pincode, Mobile_No, Education, Fathers_Name, Mothers_Name, Spouse_Name,
            Sex, Emp_Religion, Salary, Total_Loan, Salary_Advance, Due_Loan, User_Mgt_Id, Entry_By, Entry_Date
        )
        VALUES
        (
            '${maxId}', ${data.branch}, '${empcode + zeros + maxId}', '${data.empname}', '${data.designation}',
            ${data.dob ? `CONVERT(DATE, '${data.dob}', 120)` : 'GETDATE()'},
            ${data.doj ? `CONVERT(DATE, '${data.doj}', 120)` : 'GETDATE()'},
            '${data.address1}', '${data.address2}', '${data.city}', 'India', '${data.pincode}',
            '${data.mobile}', '${data.education}', '${data.father}', '${data.mother}', '${data.spouse}',
            '${data.gender}', '${data.religion}', ${data.salary}, ${data.total_loan}, ${data.salary_advance},
            ${data.due_loan}, ${userMGT ? userId : 0}, ${data.enter_by}, GETDATE()
        )`;

        await SMTERP.query(insertEmployee);
        return res.status(200).json({ data: [], status: 'Success', message: 'New Employee Created' });
    } catch (error) {
        console.error('Error in employee creation:', error);
        return res.status(500).json({ data: [], status: 'Failure', message: 'Internal Server Error' });
    }
});

userRoute.put('/api/employee', authenticateToken, async (req, res) => {
    const { data, ID } = req.body;
    console.log(data)
    const dob = data.dob ? data.dob : null;
    const doj = data.doj ? data.doj : null;

    const queryPUT = `
        UPDATE tbl_Employee_Master SET Branch=${data.branch},Emp_Name='${data.empname}',Designation='${data.designation}',
        ${dob ? `DOB=CONVERT(DATE, '${dob}', 120),` : 'GETDATE(),'}
        ${doj ? `DOJ=CONVERT(DATE, '${doj}', 120),` : 'GETDATE(),'}  
        Address_1='${data.address1}', Address_2='${data.address2}', City='${data.city}', Pincode='${data.pincode}',
        Mobile_No='${data.mobile}', Education='${data.education}', Fathers_Name='${data.father}', Mothers_Name='${data.mother}',
        Spouse_Name='${data.spouse}', Sex='${data.gender}', Emp_Religion='${data.religion}', Salary=${data.salary},
        Entry_By=${data.enter_by}
        WHERE Emp_Id=${ID}`;

    const checkmobile = `SELECT Mobile_No FROM tbl_Employee_Master WHERE Mobile_No = '${data.mobile}' AND Emp_Id != '${ID}'`;

    try {
        const mobileResult = await SMTERP.query(checkmobile)
        if (mobileResult.recordset.length > 0) {
            console.log(mobileResult, "mobile")
            return res.json({ data: [], status: 'Failure', message: 'Mobile Number Already Exist' })
        } else {
            try {
                const result = await SMTERP.query(queryPUT)
                if (result && result.rowsAffected && result.rowsAffected[0] > 0) {
                    console.log(result, 'res')
                    res.json({ message: 'Changes Saved', data: [], status: 'Success' });
                } else {
                    res.json({ data: [], status: 'Failure', message: 'No Changes Made or Record Not Found' });
                }
            } catch (e) {
                res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
            }
        }
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    }
});


export default userRoute;