import fetch from 'node-fetch';
import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import moment from 'moment';

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

const ERPSMTCONFIG = {
  server: "103.14.120.9",
  database: "SMT_ERP_DB",
  driver: "SQL Server",
  user: "SMT_ADMIN",
  password: "yvKj3699^",
  stream: false,
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  }
}

const SMTERP = new sql.ConnectionPool(ERPSMTCONFIG);


SMTERP.connect().then(() => {
  console.log('Connected to ERPDB');
}).catch((err) => {
  console.error('Error connecting to the first database:', err);
});

function md5Hash(input) {
  return crypto.createHash('md5').update(input).digest('hex');
}

const dbconnect = async (req, res, next) => {
  const Db = req.get('Db');
  let config = {
    driver: "SQL Server",
    stream: false,
    options: {
      trustedConnection: true,
      trustServerCertificate: true,
      enableArithAbort: true,
    }
  };

  try {
    const fetchDbdata = new sql.Request(SMTERP);
    fetchDbdata.input('Id', sql.Int, Db);
    const result = await fetchDbdata.execute('Company_List_By_Id')
    if (result.recordset.length === 1) {
      config.server = result.recordset[0].IP_Address;
      config.database = result.recordset[0].SQL_DB_Name;
      config.user = result.recordset[0].SQL_User_Name;
      config.password = result.recordset[0].SQL_Pass;
      config.Tally_Company_Id = result.recordset[0].Tally_Company_Id;
      config.Tally_Guid = result.recordset[0].Tally_Guid;
      const DYNAMICDB = new sql.ConnectionPool(config);
      try {
        await DYNAMICDB.connect();
        req.db = DYNAMICDB;
        req.dbID = Db;
        req.config = config;
        next();
      } catch (err) {
        console.error('Error connecting to the database:', err);
        res.status(500).json({ message: "Db connection Failed", status: 'Failure', data: [] });
      }
    }
  } catch (err) {
    console.error('Error connecting to the database:', err);
    res.status(500).json({ message: "Db connection Failed", status: 'Failure', data: [] });
  }
};

app.get('/api/login', async (req, res) => {
  const { user, pass } = req.query;
  const md5Password = md5Hash(pass);
  try {
    const loginSP = new sql.Request(SMTERP);
    loginSP.input('UserName', sql.NVarChar, user);
    loginSP.input('Password', sql.NVarChar, md5Password);
    const result = await loginSP.execute('Qry_GetUser');
    if (result.recordset.length === 1) {
      const userInfo = result.recordset[0];
      const ssid = `${Math.floor(100000 + Math.random() * 900000)}${moment().format('DD-MM-YYYY hh:mm:ss')}`;
      const sessionSP = new sql.Request(SMTERP);
      sessionSP.input('Id', sql.Int, 0);
      sessionSP.input('UserId', sql.BigInt, userInfo.UserId);
      sessionSP.input('SessionId', sql.NVarChar, ssid);
      sessionSP.input('LogStatus', sql.Int, 1);
      sessionSP.input('APP_Type', sql.Int, 1);
      const sessionResult = await sessionSP.execute('UserLogSP');
      if (sessionResult.recordset.length === 1) {
        res.status(200).json({ user: userInfo, sessionInfo: sessionResult.recordset[0], status: 'Success', message: '' });
      }
    } else {
      res.status(200).json({ user: [], sessionInfo: {}, status: 'Failure', message: 'Try Again' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error calling the stored procedure');
  }
});

const authenticateToken = async (req, res, next) => {
  let userDatabaseToken = '';
  const userToken = req.header('Authorization');
  if (!userToken) {
    return res.status(401).json({ data: [], message: 'Unauthorized', status: "Failure" });
  }
  const query = 'SELECT Autheticate_Id FROM dbo.tbl_Users WHERE Autheticate_Id = @userToken';
  const request = new sql.Request(SMTERP);
  request.input('userToken', sql.NVarChar, userToken);

  await request.query(query)
    .then((result) => {
      if (result.recordset.length > 0) {
        userDatabaseToken = result.recordset[0].Autheticate_Id;
      }
    })
    .catch((err) => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    });
  if (userToken === userDatabaseToken) {
    next();
  } else {
    return res.status(403).json({ data: [], message: 'Forbidden', status: "Failure" });
  }
};

app.get('/api/usertype', authenticateToken, async (req, res) => {
  const query = 'SELECT * FROM dbo.tbl_User_Type';
  SMTERP.query(query).then(result => {
    res.status(200).json({ data: result.recordset, status: "Success", message: '' });
  }).catch(err => {
    console.error('Error executing SQL query:', err);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  })
});



app.get('/api/users', authenticateToken, (req, res) => {
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

  SMTERP.query(query)
    .then(result => {
      res.json({ data: result.recordset, status: "Success", message: '' });
    })
    .catch(err => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ message: 'Internal Server Error', data: [], status: "Failure" });
    })
});

app.post('/api/users', authenticateToken, async (req, res) => {
  const { name, mobile, usertype, password, branch } = req.body;
  const md5Password = md5Hash(password);
  try {
    const checkmobile = `SELECT UserName from tbl_Users WHERE UserName = '${mobile}' AND UDel_Flag = 0`;
    const checkResult = await SMTERP.query(checkmobile);

    if (checkResult.recordset.length > 0) {
      res.status(422).json({ data: [], status: 'Failure', message: "Mobile Number Already Exists" });
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
    if (result) {
      res.status(200).json({ data: [], status: 'Success', message: "New User Created" });
    } else {
      res.status(500).json({ data: [], status: 'Failure', message: "User Creation Failed" });
    }
  } catch (e) {
    console.error(e);
    res.status(422).json({ data: [], status: 'Failure', message: "User Creation Failed" });
  }
});

app.put('/api/users', authenticateToken, async (req, res) => {
  const { name, mobile, usertype, password, branch, userid } = req.body;
  const isMd5Hash = /^[a-fA-F0-9]{32}$/.test(password);
  const passwordToUse = isMd5Hash ? password : md5Hash(password);
  try {
    const checkmobile = `SELECT UserName from tbl_Users WHERE UserName = '${mobile}' AND UDel_Flag = 0 AND UserId != '${userid}'`;
    const checkResult = await SMTERP.query(checkmobile);
    if (checkResult.recordset.length > 0) {
      res.status(422).json({ data: [], status: 'Failure', message: "Mobile Number Already Exists" });
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
      res.status(200).json({ data: [], status: 'Success', message: "Changes Saved" });
    } else {
      res.status(500).json({ data: [], status: 'Failure', message: "Failed to Save changes" });
    }
  } catch (e) {
    console.error(e);
    res.status(422).json({ data: [], status: 'Failure', message: "User Creation Failed" });
  }
});

app.delete('/api/users/:userid', authenticateToken, async (req, res) => {
  const { userid } = req.params;
  try {
    const newuser = new sql.Request(SMTERP);
    newuser.input('Mode', sql.TinyInt, 3);
    newuser.input('UserId', sql.Int, userid);
    newuser.input('Name', sql.VarChar, "");
    newuser.input('UserName', sql.VarChar, "");
    newuser.input('UserTypeId', sql.BigInt, "");
    newuser.input('Password', sql.VarChar, "");
    newuser.input('BranchId', sql.Int, "");
    const result = await newuser.execute('UsersSP');
    if (result) {
      res.status(200).json({ data: [], status: 'Success', message: "User Removed" });
    } else {
      res.status(422).json({ data: [], status: 'Failure', message: "Failed to Delete " });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ data: [], status: 'Failure', message: "Server Error" });
  }
  // try {
  //   const deleteUserQuery = `UPDATE tbl_Users SET UDel_Flag = 1 WHERE UserId = ${userid}`;
  //   SMTERP.query(deleteUserQuery).then((result) => {
  //     if (result) {
  //       res.status(200).json({ data: [], status: 'Success', message: 'User deleted successfully' });
  //     } else {
  //       res.status(422).json({ data: [], status: 'Failure', message: 'Failed to delete user' });
  //     }
  //   });
  // } catch (e) {
  //   console.error(e);
  //   res.status(500).json({ data: [], status: 'Failure', message: 'Internal Server Error' });
  // }
});




app.get('/api/sf/products', authenticateToken, async (req, res) => {
  const apiUrl = `https://api.salesjump.in/api/MasterData/getProductDetails?senderID=shri`;
  try {
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      res.json({ data: data, status: "Success", message: "" }).status(200);
    } else {
      throw new Error(`Request failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});

app.post('/api/sf/products', authenticateToken, async (req, res) => {
  const { data } = req.body;
  try {
    const deleteProducts = `DELETE FROM tbl_SF_Products`;
    await SMTERP.query(deleteProducts);

    for (const obj of data) {
      const insertProduct = `
        INSERT INTO tbl_SF_Products
        (productCode, productName, short_Name, productDescription, conversionFactor, grossweight, netweight, uom, base_UOM, sub_Division_Name, erP_Code, brand, product_Cat_Name) 
        VALUES 
        (@productCode, @productName, @short_Name, @productDescription, @conversionFactor, @grossweight, @netweight, @uom, @base_UOM, @sub_Division_Name, @erP_Code, @brand, @product_Cat_Name)
      `;
      const request = SMTERP.request();
      request.input('productCode', obj.productCode);
      request.input('productName', obj.productName);
      request.input('short_Name', obj.short_Name);
      request.input('productDescription', obj.productDescription);
      request.input('conversionFactor', obj.conversionFactor);
      request.input('grossweight', obj.grossweight);
      request.input('netweight', obj.netweight);
      request.input('uom', obj.uom);
      request.input('base_UOM', obj.base_UOM);
      request.input('sub_Division_Name', obj.sub_Division_Name);
      request.input('erP_Code', obj.erP_Code);
      request.input('brand', obj.brand);
      request.input('product_Cat_Name', obj.product_Cat_Name);
      await request.query(insertProduct);
    }
    res.status(200).json({ message: 'Sync Completed', status: 'Success', data: [] });
  } catch (e) {
    console.error('Error:', e);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});




app.get('/api/sf/retailers', authenticateToken, async (req, res) => {
  const apiUrl = `https://api.salesjump.in/api/MasterData/getRetailerDetails?senderID=shri`;
  try {
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      res.json({ data: data, status: "Success", message: "" }).status(200);
    } else {
      throw new Error(`Request failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});

app.post('/api/sf/retailers', authenticateToken, async (req, res) => {
  const { data } = req.body;
  try {
    const deleteRetailers = `DELETE FROM tbl_SF_Retailers`;
    await SMTERP.query(deleteRetailers);
    for (const obj of data) {
      const insertRetailer = `
        INSERT INTO tbl_SF_Retailers
        (created_Date, retailer_code, retailer_Name, contactPerson, mobile_No, doa, dob, retailer_Channel, retailer_Class, route_Name, territory_Name, areaName, address, city, pinCode, stateName, filedForce, hq, designation, distributorName, gstno, erP_Code, latitude, longitude, profilepic) 
        VALUES 
        (@created_Date, @retailer_code, @retailer_Name, @contactPerson, @mobile_No, @doa, @dob, @retailer_Channel, @retailer_Class, @route_Name, @territory_Name, @areaName, @address, @city, @pinCode, @stateName, @filedForce, @hq, @designation, @distributorName, @gstno, @erP_Code, @latitude, @longitude, @profilepic)
      `;
      const request = SMTERP.request();
      request.input('created_Date', obj.created_Date);
      request.input('retailer_code', obj.retailer_code);
      request.input('retailer_Name', obj.retailer_Name);
      request.input('contactPerson', obj.contactPerson);
      request.input('mobile_No', obj.mobile_No);
      request.input('doa', obj.doa);
      request.input('dob', obj.dob);
      request.input('retailer_Channel', obj.retailer_Channel);
      request.input('retailer_Class', obj.retailer_Class);
      request.input('route_Name', obj.route_Name);
      request.input('territory_Name', obj.territory_Name);
      request.input('areaName', obj.areaName);
      request.input('address', obj.address);
      request.input('city', obj.city);
      request.input('pinCode', obj.pinCode);
      request.input('stateName', obj.stateName);
      request.input('filedForce', obj.filedForce);
      request.input('hq', obj.hq);
      request.input('designation', obj.designation);
      request.input('distributorName', obj.distributorName);
      request.input('gstno', obj.gstno);
      request.input('erP_Code', obj.erP_Code);
      request.input('latitude', obj.latitude);
      request.input('longitude', obj.longitude);
      request.input('profilepic', obj.profilepic);
      await request.query(insertRetailer);
    }
    res.status(200).json({ message: 'Sync Completed', status: 'Success', data: [] });
  } catch (e) {
    console.error('Error:', e);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});






app.get('/api/sf/sfdetails', authenticateToken, async (req, res) => {
  const apiUrl = `https://api.salesjump.in/api/MasterData/getSalesForceDetails?senderID=shri`;
  try {
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      res.json({ data: data, status: "Success", message: "" }).status(200);
    } else {
      throw new Error(`Request failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});

app.post('/api/sf/sfdetails', authenticateToken, async (req, res) => {
  const { data } = req.body;
  try {
    const deleteSFDetails = `DELETE FROM tbl_SF_SFDetails`;
    await SMTERP.query(deleteSFDetails);
    for (const obj of data) {
      const insertSFDetails = `
        INSERT INTO tbl_SF_SFDetails
        (employee_Id, employee_Name, designation, sf_HQ, stateName, mobileNumber, manager_Name, territory, dob, total_Beats, doj, email, address, status, appversion) 
        VALUES 
        (@employee_Id, @employee_Name, @designation, @sf_HQ, @stateName, @mobileNumber, @manager_Name, @territory, @dob, @total_Beats, @doj, @email, @address, @status, @appversion)
      `;
      const request = SMTERP.request();
      request.input('employee_Id', obj.employee_Id);
      request.input('employee_Name', obj.employee_Name);
      request.input('designation', obj.designation);
      request.input('sf_HQ', obj.sf_HQ);
      request.input('stateName', obj.stateName);
      request.input('mobileNumber', obj.mobileNumber);
      request.input('manager_Name', obj.manager_Name);
      request.input('territory', obj.territory);
      request.input('dob', obj.dob);
      request.input('total_Beats', obj.total_Beats);
      request.input('doj', obj.doj);
      request.input('email', obj.email);
      request.input('address', obj.address);
      request.input('status', obj.status);
      request.input('appversion', obj.appversion);
      await request.query(insertSFDetails);
    }
    res.status(200).json({ message: 'Sync Completed', status: 'Success', data: [] });
  } catch (e) {
    console.error('Error:', e);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});




app.get('/api/sf/routes', authenticateToken, async (req, res) => {
  const apiUrl = `https://api.salesjump.in/api/MasterData/getRouteDetails?senderID=shri`;
  try {
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      res.json({ data: data, status: "Success", message: "" }).status(200);
    } else {
      throw new Error(`Request failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});

app.post('/api/sf/routes', authenticateToken, async (req, res) => {
  const { data } = req.body;
  try {
    const deleteRoutes = `DELETE FROM tbl_SF_Routes`;
    await SMTERP.query(deleteRoutes);
    for (const obj of data) {
      const insertRoute = `
        INSERT INTO tbl_SF_Routes
        (territory_Code, route_Code, route_Name, target, territory_name, create_Date, stateName, sF_Name, emp_Id, distributor_Name) 
        VALUES 
        (@territory_Code, @route_Code, @route_Name, @target, @territory_name, @create_Date, @stateName, @sF_Name, @emp_Id, @distributor_Name)
      `;
      const request = SMTERP.request();
      request.input('territory_Code', obj.territory_Code);
      request.input('route_Code', obj.route_Code);
      request.input('route_Name', obj.route_Name);
      request.input('target', obj.target);
      request.input('territory_name', obj.territory_name);
      request.input('create_Date', obj.create_Date);
      request.input('stateName', obj.stateName);
      request.input('sF_Name', obj.sF_Name);
      request.input('emp_Id', obj.emp_Id);
      request.input('distributor_Name', obj.distributor_Name);
      await request.query(insertRoute);
    }
    res.status(200).json({ message: 'Sync Completed', status: 'Success', data: [] });
  } catch (e) {
    console.error('Error:', e);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});




app.get('/api/sf/distributors', authenticateToken, async (req, res) => {
  const apiUrl = `https://api.salesjump.in/api/MasterData/getDistributorDetails?senderID=shri`;
  try {
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      res.json({ data: data, status: "Success", message: "" }).status(200);
    } else {
      throw new Error(`Request failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});

app.post('/api/sf/distributors', authenticateToken, async (req, res) => {
  const { data } = req.body;
  try {
    const deleteDistributors = `DELETE FROM tbl_SF_Distributors`;
    await SMTERP.query(deleteDistributors);
    for (const obj of data) {
      const insertDistributor = `
        INSERT INTO tbl_SF_Distributors
        (distributor_Code, erP_Code, distributor_Name, contactPerson, address, mobile, fieldForce_Name, territory, dist_Name, taluk_Name, stateName, categoryName, type, emailID, gstn, vendor_Code, username) 
        VALUES 
        (@distributor_Code, @erP_Code, @distributor_Name, @contactPerson, @address, @mobile, @fieldForce_Name, @territory, @dist_Name, @taluk_Name, @stateName, @categoryName, @type, @emailID, @gstn, @vendor_Code, @username)
      `;
      const request = SMTERP.request();
      request.input('distributor_Code', obj.distributor_Code);
      request.input('erP_Code', obj.erP_Code);
      request.input('distributor_Name', obj.distributor_Name);
      request.input('contactPerson', obj.contactPerson);
      request.input('address', obj.address);
      request.input('mobile', obj.mobile);
      request.input('fieldForce_Name', obj.fieldForce_Name);
      request.input('territory', obj.territory);
      request.input('dist_Name', obj.dist_Name);
      request.input('taluk_Name', obj.taluk_Name);
      request.input('stateName', obj.stateName);
      request.input('categoryName', obj.categoryName);
      request.input('type', obj.type);
      request.input('emailID', obj.emailID);
      request.input('gstn', obj.gstn);
      request.input('vendor_Code', obj.vendor_Code);
      request.input('username', obj.username);
      await request.query(insertDistributor);
    }
    res.status(200).json({ message: 'Sync Completed', status: 'Success', data: [] });
  } catch (e) {
    console.error('Error:', e);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});




app.get('/api/sf/saleorders', authenticateToken, async (req, res) => {
  const from = req.query.from, to = req.query.to;
  const apiUrl = `https://api.salesjump.in/api/Order/GetPendingSalesOrders?senderID=shri&distributorCode=1000&Fromdate=${from}&Todate=${to}`;
  try {
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      res.json({ data: data, status: "Success", message: "" }).status(200);
    } else {
      throw new Error(`Request failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});

app.get('/api/SaleOrder', authenticateToken, async (req, res) => {
  const { from, to } = req.query;

  try {
    const getSaleOrder = `
      SELECT p.*, o.*
      FROM tbl_Sales_Order_Product as p
      JOIN tbl_Slaes_Order_SAF as o
      ON p.orderNo = o.orderNo
      WHERE docDate >= '${from} 00:00:00.000' AND docDate <= '${to} 00:00:00.000'
    `;
    const result = await SMTERP.query(getSaleOrder);
    if (result) {
      res.json({ data: result.recordset, status: 'Success', message: '' });
    } else {
      res.status(422).json({ data: [], status: 'Failure', message: 'Error' });
    }
  } catch (e) {
    console.error('Error:', e);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});



app.post('/api/syncsalesorder', authenticateToken, async (req, res) => {
  const { data } = req.body;
  try {
    for (const obj of data) {
      const deleteOrders = `DELETE FROM tbl_Slaes_Order_SAF WHERE orderNo = @orderNo`;
      const deleteOrderedProduct = `DELETE FROM tbl_Sales_Order_Product WHERE orderNo = @orderNo`;
      await SMTERP.request()
        .input('orderNo', obj.orderNo)
        .query(deleteOrders);
      await SMTERP.request()
        .input('orderNo', obj.orderNo)
        .query(deleteOrderedProduct);
    }
    for (const obj of data) {
      const insertOrder = `
        INSERT INTO tbl_Slaes_Order_SAF 
        (billingAddress, customerId, customerName, distributorCode, docDate, docNumber, gstinNo, orderDate, orderNo, orderValue, placeofsupply, shippingAddress, stateName, transType, orderTakenBy)
        VALUES 
        (@billingAddress, @customerId, @customerName, @distributorCode, @docDate, @docNumber, @gstinNo, @orderDate, @orderNo, @orderValue, @placeofsupply, @shippingAddress, @stateName, @transType, @orderTakenBy)
      `;
      const insertOrderResult = await SMTERP.request()
        .input('billingAddress', obj.billingAddress)
        .input('customerId', obj.customerId)
        .input('customerName', obj.customerName)
        .input('distributorCode', obj.distributorCode)
        .input('docDate', obj.docDate)
        .input('docNumber', obj.docNumber)
        .input('gstinNo', obj.gstinNo)
        .input('orderDate', obj.orderDate)
        .input('orderNo', obj.orderNo)
        .input('orderValue', obj.orderValue)
        .input('placeofsupply', obj.placeofsupply)
        .input('shippingAddress', obj.shippingAddress)
        .input('stateName', obj.stateName)
        .input('transType', obj.transType)
        .input('orderTakenBy', obj.orderTakenBy)
        .query(insertOrder);
      if (insertOrderResult) {
        for (const transobj of obj.transDetails) {
          const insertProducts = `
            INSERT INTO tbl_Sales_Order_Product
            (actualQty, amount, billedQty, closeingStock, productCode, productName, rate, taxAmount, taxCode, taxPer, uom, orderNo)
            VALUES
            (@actualQty, @amount, @billedQty, @closeingStock, @productCode, @productName, @rate, @taxAmount, @taxCode, @taxPer, @uom, @orderNo)
          `;
          await SMTERP.request()
            .input('actualQty', transobj.actualQty)
            .input('amount', transobj.amount)
            .input('billedQty', transobj.billedQty)
            .input('closeingStock', transobj.closeingStock)
            .input('productCode', transobj.productCode)
            .input('productName', transobj.productName)
            .input('rate', transobj.rate)
            .input('taxAmount', transobj.taxAmount)
            .input('taxCode', transobj.taxCode)
            .input('taxPer', transobj.taxPer)
            .input('uom', transobj.uom)
            .input('orderNo', obj.orderNo)
            .query(insertProducts);
        }
      }
    }
    res.status(200).json({ message: 'Sync successful', status: 'Success', data: [] });
  } catch (e) {
    console.error('Error executing SQL query:', e);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});






app.get('/api/listsalesorder', authenticateToken, (req, res) => {
  const { start, end } = req.query;
  const orders = `SELECT 
    customerName,
    docDate,
    orderNo,
    orderValue,
    shippingAddress
  FROM
    tbl_Slaes_Order_SAF
  WHERE
    docDate >= '${start}' AND docDate <= '${end}'`;
  SMTERP.query(orders)
    .then(result => {
      res.status(200).json({ status: "Success", data: result.recordset, message: "" });
    })
    .catch(err => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    })
});

app.get('/api/orderinfo', authenticateToken, (req, res) => {
  const { orderno } = req.query;
  const orders = `SELECT * FROM tbl_Sales_Order_Product WHERE orderNo = '${orderno}'`;
  SMTERP.query(orders)
    .then(result => {
      res.status(200).json({ status: "Success", data: result.recordset, message: "" });
    })
    .catch(err => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    })
});



app.get('/api/branch', authenticateToken, async (req, res) => {
  try {
    const requestWithParams = new sql.Request(SMTERP);
    requestWithParams.input('User_Id', sql.Int, 0);
    requestWithParams.input('Company_id', sql.Int, 0);

    const result = await requestWithParams.execute('Branch_List');
    res.json({ data: result.recordset, status: "Success", message: "" }).status(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
})

app.get('/api/sidebar', authenticateToken, async (req, res) => {
  const auth = req.header('Authorization');
  try {
    const requestWithParams = new sql.Request(SMTERP);
    requestWithParams.input('Autheticate_Id', sql.NVarChar, auth);
    const result = await requestWithParams.execute('User_Rights_Side');
    res.json({ data: result.recordsets, status: "Success", message: "" }).status(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});

app.get('/api/side', authenticateToken, async (req, res) => {
  const auth = req.header('Authorization');
  try {
    const requestWithParams = new sql.Request(SMTERP);
    requestWithParams.input('Autheticate_Id', sql.NVarChar, auth);
    const result = await requestWithParams.execute('User_Rights');
    res.json({ data: result.recordsets, status: "Success", message: "" }).status(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});

app.post('/api/updatesidemenu', authenticateToken, (req, res) => {
  const { MenuId, MenuType, User, ReadRights, AddRights, EditRights, DeleteRights, PrintRights } = req.body;
  const deleteRow = `DELETE FROM tbl_User_Rights WHERE User_Id = ${User}
                    AND Menu_Id = ${MenuId}
                    AND Menu_Type = ${MenuType}`;
  SMTERP.query(deleteRow)
    .then(result => {
      const insertRow = `INSERT INTO dbo.tbl_User_Rights 
      (User_Id, Menu_Id, Menu_Type, Read_Rights, Add_Rights, Edit_Rights, Delete_Rights, Print_Rights)
      VALUES 
      (${User}, ${MenuId}, ${MenuType}, ${ReadRights}, ${AddRights}, ${EditRights}, ${DeleteRights}, ${PrintRights})`;
      SMTERP.query(insertRow)
        .then(insertResult => {
          res.status(200).json({ message: 'Data updated successfully', status: 'Success', data: [] });
        })
        .catch(err => {
          console.error('Error executing SQL query:', err);
          res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
        })
    })
});

app.get('/api/usertypeauth', authenticateToken, async (req, res) => {
  const { usertype } = req.query;
  console.log(req.query)
  try {
    const requestWithParams = new sql.Request(SMTERP);
    requestWithParams.input('UserTypeId', sql.Int, usertype);
    const result = await requestWithParams.execute('User_Rights_By_User_Type');
    res.json({ data: result.recordsets, status: "Success", message: "" }).status(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});

app.post('/api/usertypeauth', authenticateToken, (req, res) => {
  const { MenuId, MenuType, UserType, ReadRights, AddRights, EditRights, DeleteRights, PrintRights } = req.body;
  const deleteRow = `DELETE FROM tbl_User_Type_Rights WHERE User_Type_Id = ${UserType}
                    AND Menu_Id = ${MenuId}
                    AND Menu_Type = ${MenuType}`;
  SMTERP.query(deleteRow)
    .then(result => {
      const insertRow = `INSERT INTO tbl_User_Type_Rights 
      (User_Type_Id, Menu_Id, Menu_Type, Read_Rights, Add_Rights, Edit_Rights, Delete_Rights, Print_Rights)
      VALUES 
      (${UserType}, ${MenuId}, ${MenuType}, ${ReadRights}, ${AddRights}, ${EditRights}, ${DeleteRights}, ${PrintRights})`;
      SMTERP.query(insertRow)
        .then(insertResult => {
          res.status(200).json({ message: 'Data updated successfully', status: 'Success', data: [] });
        })
        .catch(err => {
          console.error('Error executing SQL query:', err);
          res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
        })
    })
});

app.get('/api/pagerights', authenticateToken, async (req, res) => {
  const { menuid, menutype } = req.query;
  const auth = req.header('Authorization');
  try {
    const pageright = new sql.Request(SMTERP);
    pageright.input('Autheticate_Id', sql.NVarChar, auth);
    pageright.input('Menu_Id', sql.Int, menuid);
    pageright.input('Menu_Type_Id', sql.Int, menutype);
    const result = await pageright.execute('User_Rights_By_Page_Id');
    if (result.recordset.length !== 0) {
      res.status(200).json({
        status: "success",
        data: {
          Read_Rights: result.recordset[0].Read_Rights,
          Add_Rights: result.recordset[0].Add_Rights,
          Edit_Rights: result.recordset[0].Edit_Rights,
          Delete_Rights: result.recordset[0].Delete_Rights
        }, message: ""
      })
    } else {
      res.status(200).json({ data: { Read_Rights: 0, Add_Rights: 0, Edit_Rights: 0, Delete_Rights: 0 }, status: "Success", message: "No Page Rights" })
    }
  }
  catch (err) {
    console.error('Error executing SQL query:', err);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});


app.post('/api/newmenu', authenticateToken, (req, res) => {
  const { menuType, menuName, menuLink, mainMenuId, subMenuId } = req.body;
  let table = '', column = '', insertquery = '';
  if (menuType === 1) {
    table = 'tbl_Master_Menu';
    column = 'MenuName';
    insertquery = `INSERT INTO ${table} (${column}, PageUrl, Active) VALUES ('${menuName}', '${menuLink}', '1')`;
  } else if (menuType === 2) {
    table = 'tbl_Sub_Menu';
    column = 'SubMenuName';
    insertquery = `INSERT INTO ${table} (MenuId, ${column}, PageUrl, Active) VALUES ('${mainMenuId}', '${menuName}', '${menuLink}', '1')`;
  } else {
    table = 'tbl_Child_Menu';
    column = 'ChildMenuName';
    insertquery = `INSERT INTO ${table} (SubMenuId, ${column}, PageUrl, Active) VALUES ('${subMenuId}', '${menuName}', '${menuLink}', '1')`;
  }
  SMTERP.query(insertquery)
    .then(result => {
      if (result.rowsAffected[0] === 1) {
        res.status(200).json({ message: 'Data Inserted Successfully', status: 'Success', data: [] });
      } else {
        res.status(200).json({ message: 'Menu Creation Failed', status: 'Failure', data: [] });
      }
    })
    .catch(err => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    })
})

app.get('/api/userid', (req, res) => {
  const authId = req.header('Authorization');
  const userID = `SELECT UserId FROM tbl_Users WHERE Autheticate_Id = '${authId}'`;
  SMTERP.query(userID).then(result => {
    if (result.recordset.length > 0) {
      res.json({ User_Id: result.recordset[0].UserId, status: 'available' }).status(200)
    } else {
      res.json({ User_Id: "", status: 'not available', message: "" }).status(200)
    }
  }).catch(err => {
    console.error('Error executing SQL query:', err);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  })
})

app.get('/api/company', authenticateToken, async (req, res) => {
  try {
    const comp = new sql.Request(SMTERP);
    const result = await comp.execute('Company_List');
    res.json({ data: result.recordset, status: "Success", message: "" }).status(200);
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
})

app.get('/api/losdropdown', authenticateToken, dbconnect, async (req, res) => {
  try {
    const D_DB = new sql.Request(req.db)
    const StockGroup = await D_DB.execute('Stock_Group_List');
    const Group = await D_DB.execute('ST_Group_List');
    const Brand = await D_DB.execute('Brand_List');
    const Bag = await D_DB.execute('Bag_List');
    const INM = await D_DB.execute('Item_Name_List');
    if (Group, StockGroup, Bag, Brand, INM) {
      res.json(
        {
          status: 200,
          group: Group.recordset,
          stock_group: StockGroup.recordset,
          bag: Bag.recordset,
          brand: Brand.recordset,
          inm: INM.recordset,
          message: ""
        }).status(200)
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  } finally {
    req.db.close();
  }
})

app.get('/api/listlos', authenticateToken, dbconnect, async (req, res) => {
  try {
    const Stock_Group = await req.db.query('SELECT DISTINCT Stock_Group FROM tbl_Stock_LOS');
    const Group = await req.db.query('SELECT DISTINCT Group_ST FROM tbl_Stock_LOS')
    const Brand = await req.db.query('SELECT DISTINCT Brand FROM tbl_Stock_LOS')
    const Bag = await req.db.query('SELECT DISTINCT Bag FROM tbl_Stock_LOS')
    const INM = await req.db.query('SELECT DISTINCT Item_Name_Modified FROM tbl_Stock_LOS')

    const AllRow = await req.db.query('SELECT * FROM tbl_Stock_LOS')
    const record = AllRow.recordset

    record.map((item, index) => {
      Stock_Group.recordset.map((item1, index1) => {
        if (item.Stock_Group === item1.Stock_Group) {
          item.sg_id = index1
        }
      })
      Group.recordset.map((item2, index2) => {
        if (item.Group_ST === item2.Group_ST) {
          item.g_id = index2
        }
      })
      Brand.recordset.map((item3, index3) => {
        if (item.Brand === item3.Brand) {
          item.bnd_id = index3
        }
      })
      Bag.recordset.map((item4, index4) => {
        if (item.Bag === item4.Bag) {
          item.bag_id = index4
        }
      })
      INM.recordset.map((item5, index5) => {
        if (item.Item_Name_Modified === item5.Item_Name_Modified) {
          item.inm_id = index5
        }
      })
    })

    res.json({ data: [record, Stock_Group.recordset, Group.recordset, Brand.recordset, Bag.recordset, INM.recordset], status: "Success", message: "" }).status(200)

  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  } finally {
    req.db.close();
  }
})

app.get('/api/stockabstract', authenticateToken, dbconnect, async (req, res) => {
  const { Fromdate, Todate, Group_ST, Stock_Group, Bag, Brand, Item_Name } = req.query;
  const guid = req.config.Tally_Guid;
  const company_id = req.config.Tally_Company_Id;
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  try {
    const DynamicDB = new sql.Request(req.db);
    DynamicDB.input('guid', sql.NVarChar, guid);
    DynamicDB.input('company_id', sql.VarChar, company_id.toString());
    DynamicDB.input('Fromdate', sql.VarChar, Fromdate);
    DynamicDB.input('Todate', sql.VarChar, Todate);
    DynamicDB.input('Group_ST', sql.VarChar, Group_ST);
    DynamicDB.input('Stock_Group', sql.VarChar, Stock_Group);
    DynamicDB.input('Bag', sql.VarChar, Bag);
    DynamicDB.input('Brand', sql.VarChar, Brand);
    DynamicDB.input('Item_Name', sql.VarChar, Item_Name);
    const StockAbstract = await DynamicDB.execute('Stouck_Abstract_Oinline_Search');
    StockAbstract.recordset.map((obj, index) => {
      let date = new Date(obj.Trans_Date)
      obj.Trans_Date = date.toISOString().split('T')[0];
      const monthIndex = date.getMonth();
      obj.month = monthNames[monthIndex];
      obj.id = index + 1;
    })
    res.json({ status: "Success", data: StockAbstract.recordset, message: "" }).status(200)
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  } finally {
    req.db.close()
  }
})

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

