import SFDB from "../config/sfdb.mjs";
import sql from 'mssql';
import { dataFound, falied, invalidInput, noData, servError, success } from '../sfResFun.mjs'

const sfDistributors = () => {

    const getDistributors = async (req, res) => {
        
        try {
            const result = await SFDB.query('SELECT * FROM tbl_SF_Distributors');
            
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
        getDistributors,
    }
}

export default sfDistributors();