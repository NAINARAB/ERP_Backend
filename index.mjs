import fetch from 'node-fetch';
import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import bodyParser from 'body-parser';

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
    if(result.recordset.length === 1) {
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
        res.status(500).json({ connection: "Db connection Failed", data: [] });
      }
    }
  } catch (err) {
    console.error('Error connecting to the database:', err);
    res.status(500).json({ connection: "Db connection Failed", data: [] });
  }
};

app.get('/api/login', async (req, res) => {
  const { user, pass } = req.query;
  try {
    const requestWithParams = new sql.Request(SMTERP);
    requestWithParams.input('UserName', sql.NVarChar, user);
    requestWithParams.input('Password', sql.NVarChar, pass);
    const result = await requestWithParams.execute('Qry_GetUser');
    if (result.recordset.length === 1) {
      res.json({ user: result.recordset[0], status: 'Success' }).status(200);
    } else {
      res.json({ user: result.recordset, status: 'Failure' }).status(200);
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
    return res.status(401).json({data:[], message: 'Unauthorized'});
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
      res.status(500).json({ error: 'Internal Server Error', status:'Failed' });
    });
  if (userToken === userDatabaseToken) {
    next();
  } else {
    return res.status(403).json({data:[], message: 'Forbidden'});
  }
};

app.get('/api/usertype', authenticateToken, async (req, res) => {
  const query = 'SELECT * FROM dbo.tbl_User_Type';
  SMTERP.query(query)
    .then(result => {
      res.status(200).json(result.recordset);
    }).catch(err => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    })
});

app.get('/api/users', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM dbo.tbl_Users';
  SMTERP.query(query)
    .then(result => {
      res.json(result.recordset);
    })
    .catch(err => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error', data:[] });
    })
});

app.get('/api/productinfo', authenticateToken, async (req, res) => {
  const date = req.query.date;
  const apiUrl = `https://api.salesjump.in/api/Order/GetPendingSalesOrders?senderID=SHRI&distributorCode=1000&date=${date}`;
  try {
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      res.json(data);
    } else {
      throw new Error(`Request failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
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
        res.status(200).json({ message: 'Sync completed successfully', rowsadded: count, status: "Success" });
      } else {
        res.status(200).json({ message: 'Already Synced', rowsadded: count, status: "Failure" });
      }
    })
    .catch(err => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
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
      res.status(200).json({ status: "Success", data: result.recordset });
    })
    .catch(err => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    })
});

app.get('/api/orderinfo', authenticateToken, (req, res) => {
  const { orderno } = req.query;
  const orders = `SELECT * FROM dbo.tbl_Slaes_Order_SAF WHERE orderNo = '${orderno}'`;
  SMTERP.query(orders)
    .then(result => {
      res.status(200).json({ status: "Success", data: result.recordset });
    })
    .catch(err => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    })
});

app.get('/api/branch', authenticateToken, async (req, res) => {
  try {
    const requestWithParams = new sql.Request(SMTERP);
    requestWithParams.input('User_Id', sql.Int, 0);
    requestWithParams.input('Company_id', sql.Int, 0);

    const result = await requestWithParams.execute('Branch_List');
    res.json(result.recordset).status(200);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error calling the stored procedure');
  }
})

app.get('/api/sidebar', authenticateToken, async (req, res) => {
  const auth = req.header('Authorization'); 
  try {
    const requestWithParams = new sql.Request(SMTERP);
    requestWithParams.input('Autheticate_Id', sql.NVarChar, auth);

    const result = await requestWithParams.execute('User_Rights');
    res.json(result.recordsets).status(200);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error calling the stored procedure');
  }
});

app.post('/api/updatesidemenu', authenticateToken, (req, res) => {
   const {MenuId, MenuType, User, ReadRights, AddRights, EditRights, DeleteRights, PrintRights} = req.body;
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
        res.status(200).json({ message: 'Data updated successfully', status: 'Success' });
       })
       .catch(err => {
        console.error('Error executing SQL query:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      })
    })
});

app.get('/api/pagerights', (req,res) => {
  const {menuid, menutype, user} = req.query;
  const selectPage = `SELECT Read_Rights, Add_Rights, Edit_Rights, Delete_Rights FROM tbl_User_Rights WHERE User_Id = '${user}'
                      AND Menu_Id = '${menuid}'
                      AND Menu_Type = '${menutype}'`;
  SMTERP.query(selectPage)
    .then(result => {
      if(result.recordset.length > 0) {
        res.status(200).json(result.recordset[0]);
      } else {
        res.status(200).json({Read_Rights:0,Add_Rights:0,Edit_Rights:0,Delete_Rights:0})
      }
    })
    .catch(err => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    })
});

app.post('/api/newmenu', authenticateToken, (req, res) => {
  const { menuType, menuName, menuLink, mainMenuId, subMenuId } = req.body;
  let table = '', column ='', insertquery = '';
  if (menuType === 1){
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
  } console.log(insertquery)
  SMTERP.query(insertquery)
    .then(result => {
      if( result.rowsAffected[0] === 1 ) {
        res.status(200).json({ message: 'Data Inserted Successfully', status: 'Success' });
      } else {
        res.status(200).json({ message: 'Menu Creation Failed', status: 'Failure' });
      }
    })
    .catch(err => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    })
})

app.get('/api/userid', (req, res) => {
  const authId = req.header('Authorization');
  const userID = `SELECT UserId FROM tbl_Users WHERE Autheticate_Id = '${authId}'`;
  SMTERP.query(userID).then(result => {
    if(result.recordset.length > 0){
      res.json({User_Id: result.recordset[0].UserId, status: 'available'}).status(200)
    } else {
      res.json({User_Id: "", status: 'not available'}).status(200)
    }
  }).catch(err => {
    console.error('Error executing SQL query:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  })
})

app.get('/api/company', authenticateToken, async (req, res) => {
  try{
    const comp = new sql.Request(SMTERP);
    const result = await comp.execute('Company_List');
    if (result.recordset.length > 0) {
      res.json({data: result.recordset, status: 200})
    }
  } catch (e) {
    console.log(e);
    res.json({data: [], status: 404})
  }
})

app.get('/api/losdropdown', authenticateToken, dbconnect, async (req, res) => {
  try {
    const D_DB = new sql.Request(req.db)
    const Group = await D_DB.execute('ST_Group_List');
    const StockGroup = await D_DB.execute('Stock_Group_List');
    const Bag = await D_DB.execute('Bag_List');
    const Brand = await D_DB.execute('Brand_List');
    const INM = await D_DB.execute('Item_Name_List');
    if (Group, StockGroup, Bag, Brand, INM) {
      res.json(
        { status: 200, 
          group: Group.recordset, 
          stock_group: StockGroup.recordset, 
          bag: Bag.recordset, 
          brand: Brand.recordset, 
          inm: INM.recordset}).status(200)
    }
  } catch (e) {
    console.log(e);
    res.json({data: [], status: 404}).status(404)
  } finally {
    req.db.close();
  }
})

app.get('/api/stockabstract', authenticateToken, dbconnect, async (req, res) => {
  const { Fromdate, Todate, Group_ST, Stock_Group, Bag, Brand, Item_Name } = req.query;
  console.log(Fromdate, Todate, Group_ST, Stock_Group, Bag, Brand, Item_Name)
  const guid = req.config.Tally_Guid;
  const company_id = req.config.Tally_Company_Id;
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
    res.json({ status: 200, data: StockAbstract.recordset}).status(200)
  } catch (e) {
    console.log(e);
    res.json({data: [], status: 404}).status(404)
  } finally {
    req.db.close()
  }
})

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

