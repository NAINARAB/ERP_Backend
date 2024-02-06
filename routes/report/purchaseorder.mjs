import express from 'express'
import authenticateToken from '../login-logout/auth.mjs'
import dbconnect from '../../config/otherdb.mjs'
import sql from 'mssql'
import ServerError from '../../config/handleError.mjs'

const purchaseOrederReport = express.Router()

purchaseOrederReport.get('/api/ledgerList', dbconnect, authenticateToken, async (req, res) => {
    try {
        const DynamicDB = new sql.Request(req.db);
        const result = await DynamicDB.execute('Ledger_List');
        if (result && result.recordset.length > 0) {
            res.json({ data: result.recordset, status: 'Success', message: '' })
        } else {
            res.json({ data: [], status: 'Success', message: '' })
        }
    } catch (e) {
        ServerError(e, '/api/ledgerList', 'GET', res)
    }
})

purchaseOrederReport.get('/api/StockItemList', dbconnect, authenticateToken, async (req, res) => {
    try {
        const guid = req.config.Tally_Guid;
        const company_id = req.config.Tally_Company_Id;
        const DynamicDB = new sql.Request(req.db);
        DynamicDB.input('Guid', guid);
        DynamicDB.input('Company_Id', company_id.toString());
        const result = await DynamicDB.execute('Stock_Item_List');
        if (result && result.recordset.length > 0) {
            res.json({ data: result.recordset, status: 'Success', message: '' })
        } else {
            res.json({ data: [], status: 'Success', message: '' })
        }
    } catch (e) {
        ServerError(e, '/api/StockItemList', 'GET', res)
    }
})

purchaseOrederReport.get('/api/PurchaseOrderReportCard', dbconnect, authenticateToken, async (req, res) => {
    try {
        const { Report_Type, Fromdate, Todate } = req.query;
        const guid = req.config.Tally_Guid;

        const DynamicDB = new sql.Request(req.db);
        DynamicDB.input('Report_Type', Report_Type);
        DynamicDB.input('Guid', guid);
        DynamicDB.input('Fromdate', Fromdate)
        DynamicDB.input('Todate', Todate);

        const result = await DynamicDB.execute('Purchase_Order_Online_Report');
        if (Number(Report_Type) !== 3) {
            result.recordset.map(obj => {
                obj.product_details = JSON.parse(obj.product_details)
                obj.product_details.map(o => {
                    o.product_details_1 = JSON.parse(o.product_details_1)
                })
            })
        } else {
            result.recordset.map(o => {
                o.Order_details = JSON.parse(o.Order_details)
            })
        }
        if (result.recordset.length > 0) {
            res.json({ data: result.recordset, status: 'Success', message: '' })
        } else {
            res.json({ data: [], status: 'Success', message: 'No Data' })
        }
    } catch (e) {
        ServerError(e, '/api/PurchaseOrderReportCard', 'GET', res)
    }
})

purchaseOrederReport.get('/api/PurchaseOrderReportTable', dbconnect, authenticateToken, async (req, res) => {
    try {
        const { Report_Type, Fromdate, Todate, Customer_Id, Item_Id, BillNo } = req.query;
        const guid = req.config.Tally_Guid;

        const DynamicDB = new sql.Request(req.db);
        DynamicDB.input('Report_Type', Report_Type);
        DynamicDB.input('Guid', guid);
        DynamicDB.input('Fromdate', Fromdate)
        DynamicDB.input('Todate', Todate);
        DynamicDB.input('Customer_Id', Customer_Id);
        DynamicDB.input('Stock_Group_Id', 0);
        DynamicDB.input('Item_Id', Item_Id);
        DynamicDB.input('BillNo', BillNo);

        const result = await DynamicDB.execute('Purchase_Order_Report_Search');
        if (result.recordset.length > 0) {
            res.json({ data: result.recordset, status: 'Success', message: '' })
        } else {
            res.json({ data: [], status: 'Success', message: 'No Data' })
        }
    } catch (e) {
        ServerError(e, '/api/PurchaseOrderReport', 'GET', res)
    }
})

export default purchaseOrederReport;