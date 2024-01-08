import express from 'express'
import authenticateToken from '../login-logout/auth.mjs'
import sql from 'mssql'
import ServerError from '../../config/handleError.mjs'
import SMTERP from '../../config/erpdb.mjs'

const CusReportRoute = express.Router() 

CusReportRoute.get('/api/getBalance',  async (req, res) => {
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
        console.log(CustInfo.recordset, 'cus record')

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



export default CusReportRoute