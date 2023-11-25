import SMTERP from "../../config/erpdb.mjs";
import express from "express";
import fetch from "node-fetch";
const SalesForceAPI = express.Router()
import authenticateToken from "../login-logout/auth.mjs";

SalesForceAPI.get('/api/sf/products', authenticateToken, async (req, res) => {
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

SalesForceAPI.post('/api/sf/products', authenticateToken, async (req, res) => {
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

SalesForceAPI.get('/api/sf/retailers', authenticateToken, async (req, res) => {
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

SalesForceAPI.post('/api/sf/retailers', authenticateToken, async (req, res) => {
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

SalesForceAPI.get('/api/sf/sfdetails', authenticateToken, async (req, res) => {
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

SalesForceAPI.post('/api/sf/sfdetails', authenticateToken, async (req, res) => {
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

SalesForceAPI.get('/api/sf/routes', authenticateToken, async (req, res) => {
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

SalesForceAPI.post('/api/sf/routes', authenticateToken, async (req, res) => {
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

SalesForceAPI.get('/api/sf/distributors', authenticateToken, async (req, res) => {
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

SalesForceAPI.post('/api/sf/distributors', authenticateToken, async (req, res) => {
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

SalesForceAPI.get('/api/sf/saleorders', authenticateToken, async (req, res) => {
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

SalesForceAPI.get('/api/SaleOrder', authenticateToken, async (req, res) => {
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

SalesForceAPI.post('/api/syncsalesorder', authenticateToken, async (req, res) => {
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

SalesForceAPI.get('/api/listsalesorder', authenticateToken, (req, res) => {
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

SalesForceAPI.get('/api/orderinfo', authenticateToken, (req, res) => {
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



export default SalesForceAPI