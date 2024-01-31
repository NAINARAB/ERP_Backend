import express from 'express';
import { createRequire } from 'module';
import Razorpay from 'razorpay';
import ServerError from '../../config/handleError.mjs';
import SMTERP from '../../config/erpdb.mjs';
import crypto from 'crypto';
import authenticateToken from '../login-logout/auth.mjs';

const require = createRequire(import.meta.url);
require('dotenv').config();


const PaymentRoute = express.Router();

const keyId = process.env.razorpaykeyid;
const keySceret = process.env.razorpaysecretkey

const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySceret,
});


PaymentRoute.post('/api/makePayment', async (req, res) => {
    const { amount, bills, UserId, paymentType, TransactionId } = req.body;


    if (!Number.isFinite(amount) || amount <= 0) {
        return res.json({ data: [], status: 'Failure', message: 'Invalid amount. Amount must be a positive number' });
    }

    if (!Array.isArray(bills) || bills.length === 0) {
        return res.json({ data: [], status: 'Failure', message: 'Invalid bills. Bills must be an array with at least one element' });
    }

    if (!UserId) {
        return res.json({ data: [], status: 'Failure', message: 'UserId Required' });
    }

    try {
        const order = await razorpay.orders.create({
            amount: Number(amount * 100),
            currency: 'INR',
            receipt: 'qwsaq1'
        })

        const selectCustomer = `SELECT Cust_Id FROM tbl_Customer_Master WHERE User_Mgt_Id = '${UserId}'`;

        const result = await SMTERP.query(selectCustomer);

        if (result.recordset.length === 0) {
            return res.status(404).json({ data: [], status: 'Failure', message: 'Customer Not Found', isCustomer: false });
        }

        const Cust_Id = result.recordset[0].Cust_Id;

        const PaymentEntry = `INSERT INTO tbl_Payment_Order (Order_Id, Cust_Id, Bill_Count, Total_Amount, Payment_Status, Payment_Type, Comp_Id) 
                      VALUES ('${order.id}', CONVERT(BIGINT, '${Cust_Id}'), '${bills.length}', CONVERT(DECIMAL(10, 2), '${amount}'), '${order.status}', '${paymentType}', '${bills[0].Company_Id}')`;

        const postPayment = await SMTERP.query(PaymentEntry);

        if (postPayment.rowsAffected && postPayment.rowsAffected.length > 0) {
            for (const obj of bills) {
                const Payment_Details_Entry_Query = `INSERT INTO tbl_Payment_Order_Bills (Order_Id, Cust_Id, Ledger_Name, Bal_Amount, Invoice_No, Comp_Id) 
                                        VALUES (@orderId, @custId, @ledgerName, @balAmount, @invoiceNo, @compId)`;
                const request = SMTERP.request();
                request.input('orderId', order.id);
                request.input('custId', Cust_Id);
                request.input('ledgerName', Number(obj.tally_id));
                request.input('balAmount', obj.Bal_Amount);
                request.input('invoiceNo', obj.invoice_no);
                request.input('compId', obj.Company_Id)
                await request.query(Payment_Details_Entry_Query);
            }
            res.json({ data: order, status: 'Success', message: 'Payment details saved' })
        } else {
            res.json({ data: [], status: 'Failure', message: 'Failed to create Order' })
        }

    } catch (e) {
        ServerError(e, '/api/makePayment', 'POST', res)
    }
});

PaymentRoute.post('/api/manualPayment', async (req, res) => {
    const { amount, bills, UserId, paymentType, TransactionId } = req.body;


    if (!Number.isFinite(amount) || amount <= 0) {
        return res.json({ data: [], status: 'Failure', message: 'Invalid amount. Amount must be a positive number' });
    }

    if (!Array.isArray(bills) || bills.length === 0) {
        return res.json({ data: [], status: 'Failure', message: 'Invalid bills. Bills must be an array with at least one element' });
    }

    if (!UserId) {
        return res.json({ data: [], status: 'Failure', message: 'UserId Required' });
    }

    try {
        const selectCustomer = `SELECT Cust_Id FROM tbl_Customer_Master WHERE User_Mgt_Id = '${UserId}'`;

        const result = await SMTERP.query(selectCustomer);

        if (result.recordset.length === 0) {
            return res.status(404).json({ data: [], status: 'Failure', message: 'Customer Not Found', isCustomer: false });
        }

        const Cust_Id = result.recordset[0].Cust_Id;

        const PaymentEntry = `INSERT INTO tbl_Payment_Order (Order_Id, Cust_Id, Bill_Count, Total_Amount, Payment_Status, Payment_Type, Comp_Id) 
                      VALUES ('${TransactionId}', CONVERT(BIGINT, '${Cust_Id}'), '${bills.length}', CONVERT(DECIMAL(10, 2), '${amount}'), 'ManualPay', '${paymentType}', '${bills[0].Company_Id}')`;

        const postPayment = await SMTERP.query(PaymentEntry);

        if (postPayment.rowsAffected && postPayment.rowsAffected[0] > 0) {
            for (const obj of bills) {
                const Payment_Details_Entry_Query = `INSERT INTO tbl_Payment_Order_Bills (Order_Id, Cust_Id, Ledger_Name, Bal_Amount, Invoice_No, Comp_Id) 
                                        VALUES (@orderId, @custId, @ledgerName, @balAmount, @invoiceNo, @compId)`;
                const request = SMTERP.request();
                request.input('orderId', TransactionId);
                request.input('custId', Cust_Id);
                request.input('ledgerName', Number(obj.tally_id));
                request.input('balAmount', obj.Bal_Amount);
                request.input('invoiceNo', obj.invoice_no);
                request.input('compId', obj.Company_Id)
                await request.query(Payment_Details_Entry_Query);
            }
            res.json({ data: [], status: 'Success', message: 'Payment details saved' })
        } else {
            res.json({ data: [], status: 'Failure', message: 'Failed to create Order' })
        }

    } catch (e) {
        ServerError(e, '/api/manualPayment', 'POST', res)
    }
});

PaymentRoute.post('/api/paymentVerify', async (req, res) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    console.log(req.body)

    const bodyData = razorpay_order_id + '|' + razorpay_payment_id;

    const expectedSignature = crypto.createHmac('sha256', keySceret).update(bodyData).digest('hex')

    const isValid = expectedSignature === razorpay_signature;

    const paymentStatus = isValid ? 'PAID' : 'FAILED';

    const updateOrderStatus = `UPDATE tbl_Payment_Order 
                                SET Payment_Status = '${paymentStatus}', 
                                    razorpay_payment_id = '${razorpay_payment_id}', 
                                    razorpay_signature = '${razorpay_signature}' 
                                WHERE Order_Id = '${razorpay_order_id}'`;

    try {
        await SMTERP.query(updateOrderStatus);

        // if (isValid) {
        //     return res.redirect(`${process.env.frontend}/Payment_Success?payment_id=${razorpay_payment_id}`);
        // } else {
        //     return res.redirect(`${process.env.frontend}/Payment_Failure?payment_id=${razorpay_payment_id}`);
        // }

    } catch (error) {
        console.error('Error updating order status:', error);
        // res.status(500).json({ status: 'Failure', message: 'Internal Server Error', data: [] });
    }
    res.status(200)
});

PaymentRoute.get('/api/PaymentHistory', async (req, res) => {
    const { paymentType, customerId, payStatus } = req.query;
    try {
        const queryType1 = `
        SELECT 
	        c.Customer_name,
	        c.Mobile_no,
	        c.Email_Id,
	        c.Contact_Person,
	        c.Gstin,
	        po.*,
			comp.Company_Name,
	        ( 
	        	SELECT pob.* 
	        		FROM tbl_Payment_Order_Bills AS pob 
	        	WHERE po.Order_Id = pob.Order_Id 
	        		FOR JSON PATH
	        ) AS PaymentDetails
        FROM tbl_Payment_Order AS po
	        JOIN tbl_Customer_Master AS c
	        ON c.Cust_Id = po.Cust_Id
			JOIN tbl_DB_Name AS comp 
			ON po.Comp_Id = comp.Id
        WHERE po.Payment_Type = ${paymentType} 
            AND po.Verified_Status = ${payStatus}`;

        const queryType2 = `
        SELECT 
	        c.Customer_name,
	        c.Mobile_no,
	        c.Email_Id,
	        c.Contact_Person,
	        c.Gstin,
	        po.*,
			comp.Company_Name,
	        ( 
	        	SELECT pob.* 
	        		FROM tbl_Payment_Order_Bills AS pob 
	        	WHERE po.Order_Id = pob.Order_Id 
	        		FOR JSON PATH
	        ) AS PaymentDetails
        FROM tbl_Payment_Order AS po
	        JOIN tbl_Customer_Master AS c
	        ON c.Cust_Id = po.Cust_Id
			JOIN tbl_DB_Name AS comp 
			ON po.Comp_Id = comp.Id`;

        const queryType3 = `SELECT 
                                c.Customer_name,
                                c.Mobile_no,
                                c.Email_Id,
                                c.Contact_Person,
                                c.Gstin,
                                po.*,
                                comp.Company_Name,
                                ( 
                                    SELECT pob.* 
                                        FROM tbl_Payment_Order_Bills AS pob 
                                    WHERE po.Order_Id = pob.Order_Id 
                                        FOR JSON PATH
                                ) AS PaymentDetails
                            FROM tbl_Payment_Order AS po
                                JOIN tbl_Customer_Master AS c
                                ON c.Cust_Id = po.Cust_Id
                                JOIN tbl_DB_Name AS comp 
                                ON po.Comp_Id = comp.Id
                            WHERE po.Payment_Type = '${paymentType}' 
                                AND po.Verified_Status = '${payStatus}'
                                AND po.Cust_Id = '${customerId}'`;

        let exequey;

        if (customerId && paymentType && payStatus) {
            exequey = queryType3;
        } else if (paymentType && payStatus) {
            exequey = queryType1
        }  else  {
            exequey = queryType2
        }

        const result = await SMTERP.query(exequey);

        if (result.recordset.length > 0) {
            const parsedData = result.recordset.map(record => {
                record.PaymentDetails = JSON.parse(record.PaymentDetails);
                return record;
            });

            res.json({ data: parsedData, status: 'Success', message: 'data available' });
        } else {
            res.json({ data: [], status: 'Success', message: 'data not available' });
        }

    } catch (e) {
        ServerError(e, '/api/PaymentHistory', 'GET', res)
    }
})

PaymentRoute.post('/api/manualPaymentVerification', authenticateToken, async (req, res) => {
    const { orderId, description, verifiedDate, verifyStatus } = req.body;

    if (!orderId || !verifiedDate || !verifyStatus) {
        return res.status(400).json({ data: [], status: 'Failure', message: 'orderId, verifiedDate, and verifyStatus are required' });
    }

    try {
        const query = `
            UPDATE tbl_Payment_Order
            SET Verified_Status = @verifyStatus,
                Description = @description,
                Verified_Date = @verifiedDate
            WHERE Order_Id = @orderId
        `;

        const request = SMTERP.request();
        request.input('orderId', orderId);
        request.input('verifyStatus', verifyStatus);
        request.input('description', description);
        request.input('verifiedDate', verifiedDate);

        const result = await request.query(query);

        if (result && result.rowsAffected[0] > 0) {
            return res.status(200).json({ data: [], status: 'Success', message: 'Status Verification Saved!' });
        } else {
            return res.status(422).json({ data: [], status: 'Failure', message: 'Unable to Save!' });
        }

    } catch (e) {
        ServerError(e, '/manualPaymentVerification', 'Post', res);
    }
});

export default PaymentRoute;
