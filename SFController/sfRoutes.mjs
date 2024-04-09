import SFDB from "../config/sfdb.mjs";
import sql from 'mssql';
import { dataFound, falied, invalidInput, noData, servError, success } from '../sfResFun.mjs'

const sfRoutes = () => {

    const getRoutes = async (req, res) => {
        
        try {
            const result = await SFDB.query('SELECT * FROM tbl_Route_Master');
            
            if (result.recordset.length) {
                dataFound(res, result.recordset);
            } else {
                noData(res)
            }
        } catch (e) {
            servError(e, res)
        }
    } 

    const addRoutes = async (req, res) => {
        const { Route_Name } = req.body;

        if (!Route_Name) {
            return invalidInput(res, 'Route_Name is required')
        }

        try {
            const query = `
            INSERT INTO tbl_Route_Master
                (Route_Name)
            VALUES
                (@route)`;
            const request = new sql.Request(SFDB);
            request.input('route', Route_Name);

            const result = await request.query(query);

            if(result.rowsAffected[0] && result.rowsAffected[0] > 0) {
                success(res, 'new Route Created')
            } else {
                falied(res, 'Failed to create Route')
            }
            
        } catch (e) {
            servError(e, res)
        }
    }

    return {
        getRoutes,
        addRoutes
    }
}

export default sfRoutes();