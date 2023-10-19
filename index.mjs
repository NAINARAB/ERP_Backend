import fetch from 'node-fetch';
import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import bodyParser from 'body-parser';

const config = {
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
  },
};

sql.connect(config, function (err) {
  if (err) {
    console.error("Error connecting to the database:", err);
  } else {
    console.log("Connected to the database successfully");
  }
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/api/login', async (req, res) => {
  const { user, pass } = req.query;
  try {
    const requestWithParams = new sql.Request();
    requestWithParams.input('UserName', sql.NVarChar, user);
    requestWithParams.input('Password', sql.NVarChar, pass);
    const result = await requestWithParams.execute('Qry_GetUser');
    res.json(result.recordset).status(200);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error calling the stored procedure');
  }
});

const authenticateToken = async (req, res, next) => {
  let userDatabaseToken = '';
  const userToken = req.header('Authorization');
  if (!userToken) {
    return res.status(401).json({data:[]});
  }
  const query = 'SELECT Autheticate_Id FROM dbo.tbl_Users WHERE Autheticate_Id = @userToken';
  const request = new sql.Request();
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
    return res.status(403).json([]);
  }
};

app.get('/api/usertype', authenticateToken, async (req, res) => {
  const query = 'SELECT * FROM dbo.tbl_User_Type';
  sql.query(query)
    .then(result => {
      res.status(200).json(result.recordset);
    })
    .catch(err => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});

app.get('/api/users', authenticateToken, (req, res) => {
  const query = 'SELECT * FROM dbo.tbl_Users';
  sql.query(query)
    .then(result => {
      res.json(result.recordset);
    })
    .catch(err => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    });
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
  const formattedDate = date.split('-').reverse().join('-');
  const orders = `SELECT orderDate FROM dbo.tbl_Slaes_Order_SAF WHERE docDate = '${date}'`;
  sql.query(orders)
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
    });
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
  sql.query(orders)
    .then(result => {
      res.status(200).json({ status: "Success", data: result.recordset });
    })
    .catch(err => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});

app.get('/api/orderinfo', authenticateToken, (req, res) => {
  const { orderno } = req.query;
  const orders = `SELECT * FROM dbo.tbl_Slaes_Order_SAF WHERE orderNo = '${orderno}'`;
  sql.query(orders)
    .then(result => {
      res.status(200).json({ status: "Success", data: result.recordset });
    })
    .catch(err => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});

app.get('/api/branch', authenticateToken, async (req, res) => {
  try {
    const requestWithParams = new sql.Request();
    requestWithParams.input('User_Id', sql.Int, 0);
    requestWithParams.input('Company_id', sql.Int, 0);

    const result = await requestWithParams.execute('Branch_List');
    res.json(result.recordset).status(200);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error calling the stored procedure');
  }
});

app.get('/api/sidebar', authenticateToken, async (req, res) => {
  const auth = req.header('Authorization'); 
  try {
    const requestWithParams = new sql.Request();
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
   sql.query(deleteRow)
    .then(result => {
      const insertRow = `INSERT INTO dbo.tbl_User_Rights 
      (User_Id, Menu_Id, Menu_Type, Read_Rights, Add_Rights, Edit_Rights, Delete_Rights, Print_Rights)
      VALUES 
      (${User}, ${MenuId}, ${MenuType}, ${ReadRights}, ${AddRights}, ${EditRights}, ${DeleteRights}, ${PrintRights})`;
      sql.query(insertRow)
       .then(insertResult => {
        res.status(200).json({ message: 'Data updated successfully', status: 'Success' });
       })
       .catch(err => {
        console.error('Error executing SQL query:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      });
    })
});

app.get('/api/pagerights', (req,res) => {
  const {menuid, menutype, user} = req.query;
  const selectPage = `SELECT Read_Rights, Add_Rights, Edit_Rights, Delete_Rights FROM tbl_User_Rights WHERE User_Id = '${user}'
                      AND Menu_Id = '${menuid}'
                      AND Menu_Type = '${menutype}'`;
  sql.query(selectPage)
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
    });
});

app.post('/api/newmenu', authenticateToken, (req, res) => {
  const { menuType, menuName, menuLink, mainMenuId, subMenuId } = req.body;console.log(req.body)
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
  sql.query(insertquery)
    .then(result => {
      res.status(200).json({ message: 'Data Inserted Successfully', status: 'Success' });
    })
    .catch(err => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    });
})

app.get('/api/userid', (req, res) => {
  const authId = req.header('Authorization');
  const userID = `SELECT UserId FROM tbl_Users WHERE Autheticate_Id = '${authId}'`;
  sql.query(userID).then(result => {
    if(result.recordset.length > 0){
      res.json({User_Id: result.recordset[0].UserId, status: 'available'}).status(200)
    } else {
      res.json({User_Id: "", status: 'not available'}).status(200)
    }
  }).catch(err => {
    console.error('Error executing SQL query:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });
})

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

