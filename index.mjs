import fetch from 'node-fetch';
import express from 'express';
import bodyParser from 'body-parser';
import sql from 'mssql';
import cors from 'cors';

const config = {
  server: "103.235.104.114",
  database: "SMT_ERP_DB",
  driver: "SQL Server",
  user: "SMT_ADMIN",
  password: "yvKj3699^",
  stream: false,
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
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
app.use(bodyParser.json());
app.use(cors());

const request = new sql.Request();


app.get('/api/usertype', async (req, res) => {
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

app.get('/api/users', (req, res) => {
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

app.get('/api/productinfo', async (req, res) => {
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

app.post('/api/syncsalesorder', (req, res) => {
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


app.get('/api/listsalesorder', (req, res) => {
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

app.get('/api/orderinfo', (req, res) => {
  const { orderno } = req.query;
  const orders = `SELECT *
  FROM
    dbo.tbl_Slaes_Order_SAF
  WHERE
    orderNo = '${orderno}'`;
  sql.query(orders)
    .then(result => {
      res.status(200).json({ status: "Success", data: result.recordset });
    })
    .catch(err => {
      console.error('Error executing SQL query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});


app.get('/api/branch', async (req, res) => {
  try {
    const requestWithParams = new sql.Request();
    requestWithParams.input('User_Id', sql.Int, 0);
    requestWithParams.input('Company_id', sql.Int, 0);

    const result = await requestWithParams.execute('Branch_List');
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error calling the stored procedure');
  }
});


const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

