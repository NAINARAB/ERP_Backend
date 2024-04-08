import SFDB from "../config/sfdb.mjs";
import sql from 'mssql';
import { dataFound, falied, invalidInput, noData, servError, success } from '../sfResFun.mjs'

const sfProductController = () => {

    const getProducts = async (req, res) => {
        
        try {
            const result = await SFDB.query('SELECT * FROM tbl_SF_Products');
            
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
        getProducts,
    }
}

export default sfProductController();