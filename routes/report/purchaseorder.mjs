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
        if(result && result.recordset.length > 0){
            res.json({data: result.recordset, status: 'Success', message: ''})
        } else {
            res.json({data: [], status: 'Success', message: ''})
        }
    } catch (e){
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
        if(result && result.recordset.length > 0){
            res.json({data: result.recordset, status: 'Success', message: ''})
        } else {
            res.json({data: [], status: 'Success', message: ''})
        }
    } catch (e){
        ServerError(e, '/api/StockItemList', 'GET', res)
    }
})

purchaseOrederReport.get('/api/PurchaseOrderReport', dbconnect, authenticateToken, async (req, res) => {
    try {
        const { Report_Type, Fromdate, Todate, Customer_Id, Item_Id, BillNo } = req.query;
        const guid = req.config.Tally_Guid;

        const DynamicDB = new sql.Request(req.db);
        DynamicDB.input('Report_Type', Report_Type);
        DynamicDB.input('Guid', guid);
        DynamicDB.input('Fromdate', Fromdate)
        DynamicDB.input('Todate', Todate);
        // DynamicDB.input('Customer_Id', Customer_Id);
        // DynamicDB.input('Stock_Group_Id', 0);
        // DynamicDB.input('Item_Id', Item_Id);
        // DynamicDB.input('BillNo', BillNo);

        const result = await DynamicDB.execute('Purchase_Order_Online_Report');
        if(result.recordset.length > 0){
            res.json({data: result.recordset, status: 'Success', message: ''})
        } else {
            res.json({data: [], status: 'Success', message: 'No Data'})
        }
    } catch (e){
        ServerError(e, '/api/PurchaseOrderReport', 'GET', res)
    }
}) 

export default purchaseOrederReport;