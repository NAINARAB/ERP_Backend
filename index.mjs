import fetch from 'node-fetch';
import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import bodyParser from 'body-parser';
import crypto from 'crypto';

const app = express();
app.use(cors());
app.use(bodyParser.json());

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
    const requestWithParams = new sql.Request(SMTERP);
    requestWithParams.input('UserName', sql.NVarChar, user);
    requestWithParams.input('Password', sql.NVarChar, md5Password);
    const result = await requestWithParams.execute('Qry_GetUser');
    if (result.recordset.length === 1) {
      res.json({ user: result.recordset[0], status: 'Success', message:'' }).status(200);
    } else {
      res.json({ user: result.recordset, status: 'Failure', message:'Try Again' }).status(200);
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
      res.status(200).json({data: result.recordset, status: "Success", message: ''});
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
      res.json({data: result.recordset, status: "Success", message:''});
    })
    .catch(err => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ message: 'Internal Server Error', data: [], status: "Failure" });
    })
});

app.post('/api/users', async (req, res) => {
  const { name, mobile, usertype, password, branch, userid } = req.body;
  const md5Password = md5Hash(password);
  
  const checkmobile = `SELECT UserName from tbl_Users WHERE UserName = '${mobile}' AND UDel_Flag = 0`;
  SMTERP.query(checkmobile).then(result => {
    if (result.recordset.length > 0) {
      res.status(422).json({ data: [], status: 'Failure', message: "This Mobile Number Already Exists" });
    }
  });
  try {
    const newuser = new sql.Request(SMTERP);
    newuser.input('Mode', sql.TinyInt, 1);
    newuser.input('UserId', sql.Int, userid);
    newuser.input('Name', sql.VarChar, name);
    newuser.input('UserName', sql.VarChar, mobile);
    newuser.input('UserTypeId', sql.BigInt, usertype);
    newuser.input('Password', sql.VarChar, md5Password);
    newuser.input('BranchId', sql.Int, branch);
    const result = await newuser.execute('UsersSP');
    if (result) {
      res.status(200).json({ data: [], status: 'Success', message: "New User Created" });
    } else {
      res.status(500).json({ data: [], status: 'Failure', message: "Failed To Save Changes" });
    }
  } catch (e) {
    console.log(e);
    res.status(422).json({ data: [], status: 'Failure', message: "User Creation Failed" });
  }
});

app.put('/api/users', authenticateToken, async (req, res) => {
  const { name, mobile, usertype, password, branch, userid } = req.body;
  const md5Password = md5Hash(password);
  console.log(name, mobile, usertype, password, md5Password, branch, userid)
  try {
    const updateuser = `UPDATE tbl_Users
                        SET Name = '${name}', 
                            UserName = '${mobile}', 
                            UserTypeId = '${usertype}', 
                            Password = '${md5Password}', 
                            BranchId = '${branch}'
                        WHERE UserId = ${userid}`;
                        console.log(updateuser);
    SMTERP.query(updateuser).then(result => {
      if (result) {
        res.status(200).json({ data: [], status: 'Success', message: "Changes Saved" });
      } else {
        res.status(422).json({ data: [], status: 'Failure', message: "Failed To Save Changes" });
      }
    })
  } catch (e) {
    console.error(e);
    res.status(500).json({ data: [], status: 'Failure', message: "Internal Server Error" });
  }
})

app.delete('/api/users/:userid', authenticateToken, async (req, res) => {
  const { userid } = req.params;
  try {
    const deleteUserQuery = `UPDATE tbl_Users SET UDel_Flag = 1 WHERE UserId = ${userid}`;
    SMTERP.query(deleteUserQuery).then((result) => {
      if (result) {
        res.status(200).json({ data: [], status: 'Success', message: 'User deleted successfully' });
      } else {
        res.status(422).json({ data: [], status: 'Failure', message: 'Failed to delete user' });
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ data: [], status: 'Failure', message: 'Internal Server Error' });
  }
});



app.get('/api/sf/saleorders', authenticateToken, async (req, res) => {
  const from = req.query.from ,to = req.query.to; 
  const apiUrl = `https://api.salesjump.in/api/Order/GetPendingSalesOrders?senderID=shri&distributorCode=1000&Fromdate=${from}&Todate=${to}`;
  try {
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      res.json({data: data, status: "Success", message: ""}).status(200);
    } else {
      throw new Error(`Request failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});

app.get('/api/sf/products', authenticateToken, async (req, res) => {
  const apiUrl = `https://api.salesjump.in/api/MasterData/getProductDetails?senderID=shri`;
  try {
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      res.json({data: data, status: "Success", message: ""}).status(200);
    } else {
      throw new Error(`Request failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});

app.get('/api/sf/retailers', authenticateToken, async (req, res) => {
  const apiUrl = `https://api.salesjump.in/api/MasterData/getRetailerDetails?senderID=shri`;
  try {
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      res.json({data: data, status: "Success", message: ""}).status(200);
    } else {
      throw new Error(`Request failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});

app.get('/api/sf/sfdetails', authenticateToken, async (req, res) => {
  const apiUrl = `https://api.salesjump.in/api/MasterData/getSalesForceDetails?senderID=shri`;
  try {
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      res.json({data: data, status: "Success", message: ""}).status(200);
    } else {
      throw new Error(`Request failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
  }
});

app.post('/api/syncsalesorder', authenticateToken, (req, res) => {
  const { data, date } = req.body;
  const orders = `SELECT orderDate FROM dbo.tbl_Slaes_Order_SAF WHERE docDate = '${date}'`;
  SMTERP.query(orders)
    .then(result => {
      let count = 0;
      if (result.recordset.length == 0) {
        data.map(obj => {
          const actualQty = obj.actualQty !== "" ? parseFloat(obj.actualQty) : 0.00;
          const amount = obj.amount !== "" ? parseFloat(obj.amount) : 0.00;
          const billedQty = obj.billedQty !== "" ? parseFloat(obj.billedQty) : 0.00;
          const orderValue = obj.orderValue !== "" ? parseFloat(obj.orderValue) : 0.00;
          const rate = obj.rate !== "" ? parseFloat(obj.rate) : 0.00;
          const taxAmount = obj.taxAmount !== "" ? parseFloat(obj.taxAmount) : 0.00;
          const taxPer = obj.taxPer !== "" ? parseFloat(obj.taxPer) : 0.00;
          const insertorders = `
          INSERT INTO dbo.tbl_Slaes_Order_SAF 
          (actualQty, amount, billedQty, billingAddress, customerId, customerName, distributorCode, docDate, docNumber, gstinNo, orderDate, orderNo, orderValue, placeofsupply, productCode, productName, rate, shippingAddress, stateName, taxAmount, taxCode, taxPer, transType, uom)
          VALUES 
          (${actualQty}, ${amount}, ${billedQty}, '${obj.billingAddress}', '${obj.customerId}', '${obj.customerName}', '${obj.distributorCode}', '${obj.docDate}', '${obj.docNumber}', '${obj.gstinNo}', '${obj.orderDate}', '${obj.orderNo}', ${orderValue}, '${obj.placeofsupply}', '${obj.productCode}', '${obj.productName}', ${rate}, '${obj.shippingAddress}', '${obj.stateName}', ${taxAmount}, '${obj.taxCode}', ${taxPer}, '${obj.transType}', '${obj.uom}')`;
          ++count
          return sql.query(insertorders);
        });
        res.status(200).json({ message: 'Sync completed successfully', rowsadded: count, status: "Success", data: [] });
      } else {
        res.status(200).json({ message: 'Already Synced', rowsadded: count, status: "Failure", data: [] });
      }
    })
    .catch(err => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    })
});

app.get('/api/listsalesorder', authenticateToken, (req, res) => {
  const { start, end } = req.query;
  const orders = `SELECT DISTINCT
    customerName,
    docDate,
    orderNo,
    orderValue,
    shippingAddress
  FROM
    dbo.tbl_Slaes_Order_SAF
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
  const orders = `SELECT * FROM dbo.tbl_Slaes_Order_SAF WHERE orderNo = '${orderno}'`;
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
    res.json({data: result.recordset, status: "Success", message: ""}).status(200);
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
    const result = await requestWithParams.execute('User_Rights');
    res.json({data: result.recordsets, status: "Success", message: ""}).status(200);
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

app.get('/api/pagerights', authenticateToken, async (req, res) => {
  const { menuid, menutype, user } = req.query;
  const auth = req.header('Authorization');
  try {
    const pageright = new sql.Request(SMTERP);
    pageright.input('Autheticate_Id', sql.NVarChar, auth);
    pageright.input('Menu_Id', sql.Int, menuid);
    pageright.input('Menu_Type_Id', sql.Int, menutype);
    const result = await pageright.execute('User_Rights_By_Page_Id');
    if (result) {
      res.status(200).json({status: "success", 
      data:{
        Read_Rights: result.recordset[0].Read_Rights,
        Add_Rights: result.recordset[0].Add_Rights,
        Edit_Rights: result.recordset[0].Edit_Rights,
        Delete_Rights: result.recordset[0].Delete_Rights
      }, message: ""})
    } else {
      res.status(200).json({data: { Read_Rights: 0, Add_Rights: 0, Edit_Rights: 0, Delete_Rights: 0 }, status: "Success", message: "No Page Rights"})
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
      res.json({ User_Id: "", status: 'not available', message:"" }).status(200)
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
    res.json({data: result.recordset, status: "Success", message: ""}).status(200);
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

    res.json({ data: record, sg: Stock_Group.recordset, g: Group.recordset, bnd: Brand.recordset, bag: Bag.recordset, inm: INM.recordset, status: "Success", message:"" }).status(200)

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
    res.json({ status: "Success", data: StockAbstract.recordset, message:"" }).status(200)
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

