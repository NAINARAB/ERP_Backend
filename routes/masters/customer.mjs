import SMTERP from "../../config/erpdb.mjs";
import sql from 'mssql'
import express from 'express'
import authenticateToken from "../login-logout/auth.mjs";
import crypto from 'crypto';
import ServerError from "../../config/handleError.mjs";

const CustomerRoute = express.Router()

function md5Hash(input) {
    return crypto.createHash('md5').update(input).digest('hex');
}

CustomerRoute.get('/api/costCenter', authenticateToken, async (req, res) => {
    try {
        const getCostCenter = `
        SELECT 
	        cc.*,
	        c.UserType AS CategoryGet, case when cc1.Name is null then 'Primary' else cc1.Name end as underGet 
        FROM tbl_Customer_Costcenter AS cc 
	        JOIN tbl_User_Type AS c 
	            ON cc.Category = c.Id 
			LEFT JOIN tbl_Customer_Costcenter cc1
			    ON cc.Under = cc1.Id 
	    WHERE cc.IsActive = 1`;
        const result = await SMTERP.query(getCostCenter)
        if (result && result.recordset.length > 0) {
            res.json({ data: result.recordset, status: "Success", message: "Found" }).status(200);
        } else {
            res.json({ data: [], status: "Success", message: "Not Found" }).status(200);
        }
    } catch (e) {
        ServerError(e, '/api/costCenter', 'get', res);
    }
})

CustomerRoute.post('/api/costCenter', authenticateToken, async (req, res) => {
    const { category, name, alias, under } = req.body;
    if ((!category) || (!name)) {
        return res.status(400).json({ data: [], status: 'Failure', message: 'category, name, under are required fields!' })
    }
    try {
        const checkExistance = `SELECT COUNT(*) AS count FROM tbl_Customer_Costcenter WHERE Name = @name AND Category = @category AND IsActive = 1`;
        const checkRequest = new sql.Request(SMTERP);
        checkRequest.input('name', name);
        checkRequest.input('category', category);
        const checkResult = await checkRequest.query(checkExistance);

        if (checkResult.recordset[0].count > 0) {
            res.status(400).json({ data: [], status: "Failed", message: "Name under this category is already exists!" });
        } else {
            const insertCustCenter = 'INSERT INTO tbl_Customer_Costcenter (Category, Name, Alias, Under, IsActive) VALUES (@category, @name, @alias, @under, @isactive)';

            const insertRequest = new sql.Request(SMTERP);
            insertRequest.input('category', category)
            insertRequest.input('name', name);
            insertRequest.input('alias', alias);
            insertRequest.input('under', under)
            insertRequest.input('isactive', 1)

            const result = await insertRequest.query(insertCustCenter);

            if (result.rowsAffected.length > 0) {
                res.status(201).json({ data: [], status: "Success", message: "Created" });
            } else {
                res.status(400).json({ data: [], status: "Failed", message: "Failed to create" });
            }
        }
    } catch (e) {
        ServerError(e, '/api/costCenter', 'post', res);
    }
})

CustomerRoute.put('/api/costCenter', authenticateToken, async (req, res) => {
    const { id, name, alias, category, under } = req.body;

    if (!id || !name || !category || !under) {
        return res.json({ data: [], status: "Failed", message: "id, name, category, under are required!" });
    }

    try {
        const checkExistance = `
            SELECT COUNT(*) AS count 
            FROM tbl_Customer_Costcenter 
            WHERE Name = @name AND Category = @category AND IsActive = 1 AND Id <> @id`;

        const checkRequest = new sql.Request(SMTERP);
        checkRequest.input('name', name);
        checkRequest.input('category', category);
        checkRequest.input('id', id);
        const checkResult = await checkRequest.query(checkExistance);

        if (checkResult.recordset[0].count > 0) {
            return res.status(400).json({ data: [], status: "Failed", message: "Name under this category already exists!" });
        }

        const updateQuery = `
            UPDATE tbl_Customer_Costcenter 
            SET Category = @category, Name = @name, Alias = @alias, Under = @under 
            WHERE Id = @id`;

        const updateRequest = new sql.Request(SMTERP);
        updateRequest.input('id', id);
        updateRequest.input('category', category);
        updateRequest.input('name', name);
        updateRequest.input('alias', alias);
        updateRequest.input('under', under);

        const result = await updateRequest.query(updateQuery);

        if (result.rowsAffected.length > 0) {
            return res.status(200).json({ data: [], status: "Success", message: "Updated" });
        } else {
            return res.status(400).json({ data: [], status: "Failed", message: "Failed to update" });
        }

    } catch (e) {
        ServerError(e, '/api/costCenter', 'put', res);
    }
});

CustomerRoute.get('/api/customer', authenticateToken, async (req, res) => {
    try {
        const customerGet = `
            SELECT 
                cus.*, 
                u.Name AS NameGet, 
                ut.UserType AS UserTypeGet, 
                e.Name AS EnteyByGet, 
                case when cus1.Customer_name is null then 'Primary' else cus1.Customer_name end as underGet
            FROM tbl_Customer_Master AS cus 
            JOIN tbl_Users as u
                ON cus.User_Mgt_Id = u.UserId
            JOIN tbl_User_Type as ut
                ON cus.User_Type_Id = ut.Id
            JOIN tbl_Users as e
                ON cus.Entry_By = e.UserId
            LEFT JOIN tbl_Customer_Master cus1
                ON cus.Under_Id = cus1.Cust_Id
            ORDER BY cus.Customer_name ASC`;

        const result = await SMTERP.query(customerGet)
        if (result && result.recordset.length > 0) {
            res.json({ data: result.recordset, status: "Success", message: "Found" }).status(200);
        } else {
            res.json({ data: [], status: "Success", message: "Not Found" }).status(200);
        }
    } catch (e) {
        ServerError(e, '/api/customer', 'get', res);
    }
})

CustomerRoute.post('/api/customer', authenticateToken, async (req, res) => {
    const { data } = req.body;
    const md5Password = md5Hash('123456');

    if (!data || typeof data !== 'object') {
        return res.status(400).json({ data: [], status: 'Failure', message: 'Invalid or missing data object' });
    }

    try {
        const queryCheckGstin = `SELECT COUNT(*) AS count FROM tbl_Customer_Master WHERE Gstin = '${data?.Gstin}'`;
        const GstResult = await SMTERP.query(queryCheckGstin);

        if (GstResult.recordset[0].count > 0) {
            return res.status(400).json({ data: [], status: 'Failure', message: 'Gstin is Already Exists' });
        }

        const checkmobile = `SELECT UserName from tbl_Users WHERE UserName = '${data?.Mobile_no}' AND UDel_Flag = 0`;
        const checkResult = await SMTERP.query(checkmobile);

        if (checkResult.recordset.length > 0) {
            return res.status(422).json({ data: [], status: 'Failure', message: 'Mobile Number Already Exists' });
        }

        const newuser = new sql.Request(SMTERP);
        newuser.input('Mode', 1);
        newuser.input('UserId', 0);
        newuser.input('Name', data.Customer_name);
        newuser.input('UserName', data.Mobile_no);
        newuser.input('UserTypeId', data.User_Type_Id);
        newuser.input('Password', md5Password);
        newuser.input('BranchId', sql.Int, 0);

        const result = await newuser.execute('UsersSP');

        if (result.recordset.length > 0) {
            const createdUserId = result.recordset[0][''];

            const getMaxCustIdQuery = 'SELECT ISNULL(MAX(Cust_Id), 0) + 1 AS NextCustId FROM tbl_Customer_Master';
            const maxCustIdResult = await SMTERP.query(getMaxCustIdQuery);
            const nextCustId = maxCustIdResult.recordset[0].NextCustId;


            let zeros;
            if (createdUserId < 10) {
                zeros = '000';
            } else if (createdUserId < 100) {
                zeros = '00';
            } else if (createdUserId < 1000) {
                zeros = '0';
            }
            const Cust_No = data.Branch_Id + zeros + nextCustId

            const newCustomer = new sql.Request(SMTERP);

            const insertCustomer = `INSERT INTO tbl_Customer_Master 
                    (Cust_Id, Cust_No, Customer_name, Contact_Person, Mobile_no, Email_Id, Address1, 
                    Address2, Address3, Address4, Pincode, State, Country, Gstin, Under_Id, User_Mgt_Id, 
                    User_Type_Id, Entry_By, Entry_Date)
                    VALUES 
                    (@Cust_Id, @Cust_No, @Customer_name, @Contact_Person, @Mobile_no, @Email_Id, @Address1, 
                    @Address2, @Address3, @Address4, @Pincode, @State, @Country, @Gstin, @Under_Id, @User_Mgt_Id, @User_Type_Id, 
                    @Entry_By, GETDATE())`;


            newCustomer.input('Cust_Id', nextCustId);
            newCustomer.input('Cust_No', Cust_No);
            newCustomer.input('Customer_name', data.Customer_name);
            newCustomer.input('Contact_Person', data.Contact_Person);
            newCustomer.input('Mobile_no', data.Mobile_no);
            newCustomer.input('Email_Id', data.Email_Id);
            newCustomer.input('Address1', data.Address1);
            newCustomer.input('Address2', data.Address2);
            newCustomer.input('Address3', data.Address3);
            newCustomer.input('Address4', data.Address4);
            newCustomer.input('Pincode', data.Pincode);
            newCustomer.input('State', data.State);
            newCustomer.input('Country', data.Country);
            newCustomer.input('Gstin', data.Gstin);
            newCustomer.input('Under_Id', data.Under_Id);
            newCustomer.input('User_Mgt_Id', createdUserId);
            newCustomer.input('User_Type_Id', data.User_Type_Id);
            newCustomer.input('Entry_By', data.Entry_By);

            const cuctomerCreateResult = await newCustomer.query(insertCustomer);
            if (cuctomerCreateResult.rowsAffected[0] > 0) {
                res.status(200).json({ data: [], status: 'Success', message: 'Customer created successfully' });
            } else {
                res.status(404).json({ data: [], status: 'Failure', message: 'Customer Creation Failed' })
            }
        } else {
            res.status(422).json({ data: [], status: 'Failure', message: 'User Creation Failed' });
        }
    } catch (e) {
        ServerError(e, '/api/customer', 'post', res);
    }
});

CustomerRoute.put('/api/customer', authenticateToken, async (req, res) => {
    const { data } = req.body;

    if (!data || typeof data !== 'object') {
        return res.status(400).json({ data: [], status: 'Failure', message: 'Invalid or missing data object' });
    }

    try {
        const queryCheckGstin = `SELECT COUNT(*) AS count FROM tbl_Customer_Master WHERE Gstin = '${data?.Gstin}' AND Cust_Id != '${data.User_Mgt_Id}'`;
        const GstResult = await SMTERP.query(queryCheckGstin);

        if (GstResult.recordset[0].count > 0) {
            return res.status(400).json({ data: [], status: 'Failure', message: 'Gstin is already exists for other customer' });
        }

        const checkmobile = `SELECT UserName from tbl_Users WHERE UserName = '${data?.Mobile_no}' AND UDel_Flag = 0 AND UserId != '${data.User_Mgt_Id}'`;
        const checkResult = await SMTERP.query(checkmobile);

        if (checkResult.recordset.length > 0) {
            return res.status(422).json({ data: [], status: 'Failure', message: 'Mobile Number Already Exists' });
        }

        const selectPassword = `SELECT Password from tbl_Users WHERE UserId = '${data.User_Mgt_Id}'`;
        const passwordResult = await SMTERP.query(selectPassword);
        const Password = passwordResult.recordset[0].Password;

        const newuser = new sql.Request(SMTERP);
        newuser.input('Mode', 2);
        newuser.input('UserId', data.User_Mgt_Id);
        newuser.input('Name', data.Customer_name);
        newuser.input('UserName', data.Mobile_no);
        newuser.input('UserTypeId', data.User_Type_Id);
        newuser.input('Password', Password);
        newuser.input('BranchId', sql.Int, 0);

        const result = await newuser.execute('UsersSP');

        if (result.recordset.length > 0) {

            const updateCustomerQuery = `
                UPDATE tbl_Customer_Master 
                SET 
                    Customer_name = @Customer_name,
                    Mobile_no = @Mobile_no,
                    User_Type_Id = @UserTypeId,
                    Contact_Person = @Contact_Person,
                    Email_Id = @Email_Id,
                    Gstin = @Gstin,
                    Under_Id = @UnderId,
                    Pincode = @Pincode,
                    State = @State,
                    Address1 = @Address1,
                    Address2 = @Address2,
                    Address3 = @Address3,
                    Address4 = @Address4
                WHERE Cust_Id = @Cust_Id`;

            const newCustomer = new sql.Request(SMTERP);
            newCustomer.input('Customer_name', data.Customer_name);
            newCustomer.input('Mobile_no', data.Mobile_no);
            newCustomer.input('UserTypeId', data.User_Type_Id);
            newCustomer.input('Contact_Person', data.Contact_Person);
            newCustomer.input('Email_Id', data.Email_Id);
            newCustomer.input('Gstin', data.Gstin);
            newCustomer.input('UnderId', data.Under_Id);
            newCustomer.input('Pincode', data.Pincode);
            newCustomer.input('State', data.State);
            newCustomer.input('Address1', data.Address1);
            newCustomer.input('Address2', data.Address2);
            newCustomer.input('Address3', data.Address3);
            newCustomer.input('Address4', data.Address4);
            newCustomer.input('Cust_Id', data.Cust_Id);

            const cuctomerUpdateResult = await newCustomer.query(updateCustomerQuery);
            if (cuctomerUpdateResult.rowsAffected[0] > 0) {
                res.status(200).json({ data: [], status: 'Success', message: 'Changes Saved' });
            } else {
                res.status(404).json({ data: [], status: 'Failure', message: 'Failed to Save' });
            }

        } else {
            res.status(422).json({ data: [], status: 'Failure', message: 'User Update Failed' });
        }
    } catch (e) {
        ServerError(e, '/api/customer', 'put', res);
    }
});



export default CustomerRoute;