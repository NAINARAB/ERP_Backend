import SFDB from "../config/sfdb.mjs";
import sql from 'mssql';
import { dataFound, falied, invalidInput, noData, servError, success } from '../sfResFun.mjs'


const sfMasters = () => {

    const getStates = async (req, res) => {
        try {
            const result = await SFDB.query('SELECT * FROM tbl_State_Master WHERE State_Id != 0');

            if (result.recordset.length) {
                dataFound(res, result.recordset)
            } else {
                noData(res)
            }
        } catch (e) {
            servError(e, res)
        }
    }

    const getDistricts = async (req, res) => {
        const { District_Id } = req.query;

        try {
            let query = `
            SELECT 
            	dm.*,
            	COALESCE(sm.State_Name, 'State not found') AS State_Name
            FROM 
            	tbl_Distict_Master AS dm
            LEFT JOIN
            	tbl_State_Master AS sm
            	ON dm.District_Id = sm.State_Id
            `;
            if (District_Id) {
                query += `
                WHERE District_Id = '${District_Id}'
                `;
            }

            const result = await SFDB.query(query);

            if (result.recordset.length) {
                dataFound(res, result.recordset);
            } else {
                noData(res)
            }
        } catch (e) {
            servError(e, res)
        }
    }

    const getAreas = async (req, res) => {
        const { Area_Id } = req.query;

        try {
            let query = `
            SELECT 
            	am.*,
            	COALESCE(dm.District_Name, 'District not found') AS District_Name,
            	COALESCE(sm.State_Id, 0) AS State_Id,
            	COALESCE(sm.State_Name, 'State not found') AS State_Name
            FROM 
            	tbl_Area_Master AS am
            LEFT JOIN
            	tbl_Distict_Master AS dm
            	ON dm.District_Id = am.District_Id
            LEFT JOIN
            	tbl_State_Master AS sm
            	ON dm.District_Id = sm.State_Id
            `;
            if (Area_Id) {
                query += `
                WHERE Area_Id = '${Area_Id}'
                `
            }

            const result = await SFDB.query(query);

            if (result.recordset.length) {
                dataFound(res, result.recordset)
            } else {
                noData(res)
            }
        } catch (e) {
            servError(e, res)
        }
    }

    const getOutlet = async (req, res) => {
        try {
            const result = await SFDB.query('SELECT * FROM tbl_Outlet_Master');

            if (result.recordset.length) {
                dataFound(res, result.recordset)
            } else {
                noData(res)
            }
        } catch (e) {
            servError(e, res)
        }
    }

    return {
        getStates,
        getDistricts,
        getAreas,
        getOutlet,
    }
}

export default sfMasters()