import SFDB from "../config/sfdb.mjs";
import sql from 'mssql';
import { dataFound, falied, invalidInput, noData, servError, success } from '../sfResFun.mjs'

const sfSalesOrder = () => {

    const getSalesOrder = async (req, res) => {

    //     SELECT 
    //     * 
    //     COALESCE(
    //         (
    //             SELECT 
    //                 *
    //             FROM
    //                 tbl_Sales_Order_Product
    //             WHERE
    //                 orderNo = sr.orderNo
    //         ), '[]'
    //     ) AS transDetails
    // FROM 
    //     tbl_Slaes_Order_SAF AS sr
        
        try {
            const result = await SFDB.query('SELECT * FROM tbl_Slaes_Order_SAF');
            
            if (result.recordset.length) {
                dataFound(res, result.recordset);
            } else {
                noData(res)
            }
        } catch (e) {
            servError(e, res)
        }
    } 

    return {
        getSalesOrder,
    }
}

export default sfSalesOrder();