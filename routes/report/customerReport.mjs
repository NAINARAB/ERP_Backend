import express from 'express'
import authenticateToken from '../login-logout/auth.mjs'
import sql from 'mssql'
import ServerError from '../../config/handleError.mjs'
import SMTERP from '../../config/erpdb.mjs'

const CusReportRoute = express.Router()

CusReportRoute.get('/api/getBalance', async (req, res) => {
    const { UserId } = req.query;

    try {
        if (!UserId) {
            return res.status(400).json({ data: [], status: 'Failure', message: 'UserId is required', isCustomer: false });
        }

        const getCustDetails = `SELECT Cust_Id FROM tbl_Customer_Master WHERE User_Mgt_Id = '${UserId}'`;
        const result = await SMTERP.query(getCustDetails);

        if (result.recordset.length === 0) {
            return res.status(404).json({ data: [], status: 'Failure', message: 'Customer Not Found', isCustomer: false });
        }

        const Cust_Id = result.recordset[0].Cust_Id;

        const GetCustDetails = new sql.Request(SMTERP);
        GetCustDetails.input('Cust_Id', Cust_Id);

        const CustInfo = await GetCustDetails.execute('Customer_Deatils_By_Cust_Id');

        if (CustInfo.recordset.length === 0) {
            return res.status(404).json({ data: [], status: 'Failure', message: 'Customer Details Not Found', isCustomer: true });
        }

        const recordsetArray = await Promise.all(CustInfo.recordset.map(async (obj) => {
            const GetBalance = new sql.Request(SMTERP);
            GetBalance.input('Cust_Id', Cust_Id);
            GetBalance.input('Cust_Details_Id', obj.Cust_Details_Id);

            try {
                const ResData = await GetBalance.execute('Online_OS_Debtors_Reort_VW');
                return ResData.recordset;
            } catch (e) {
                console.error(e);
                res.status(422).json({ data: [], status: 'Failure', message: '', isCustomer: true });
                throw e;
            }
        }));

        const flattenedArray = recordsetArray.flat();

        res.status(200).json({ data: flattenedArray, status: 'Success', message: '', isCustomer: true });
    } catch (e) {
        ServerError(e, '/api/getBalance', 'GET', res);
    }
});


CusReportRoute.get('/api/StatementOfAccound', async (req, res) => {
    const { Cust_Id, Acc_Id, Company_Id, Fromdate, Todate } = req.query;
    console.log(Cust_Id, Acc_Id, Company_Id, Fromdate, Todate)

    if ((!Cust_Id) || (!Acc_Id) || (!Company_Id) || (!Fromdate) || (!Todate)) {
        return res.status(400).json({ status: 'Failure', message: 'Cust_Id, Acc_Id, Company_Id, Fromdate, Todate are Required', data: [] });
    }

    const GetStatement = new sql.Request(SMTERP);
    GetStatement.input('Cust_Id', Cust_Id);
    GetStatement.input('Acc_Id', Acc_Id);
    GetStatement.input('Company_Id', Company_Id);
    GetStatement.input('Fromdate', Fromdate);
    GetStatement.input('Todate', Todate);

    try {
        const ResData = await GetStatement.execute('Online_Statement_Of_Accounts_VW');
        if( ResData && ResData.recordset.length > 0 ) {
            res.status(200).json({data: ResData.recordset, status: 'Success', message:'Found'})
        } else {
            res.status(200).json({data: [], status: 'Success', message:'No Rows Selected'})
        }
    } catch (e) {
        ServerError(e, '/api.StatementOfAccount', 'get', res)
    }
})



export default CusReportRoute