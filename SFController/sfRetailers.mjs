import SFDB from "../config/sfdb.mjs";
import sql from 'mssql';
import { dataFound, falied, invalidInput, noData, servError, success } from '../sfResFun.mjs'


const RetailerControll = () => {

    const getSFCustomers = async (req, res) => {
        try {
            const getQuery = `
            SELECT 
            	*,
            	COALESCE(
            		(
            		SELECT 
            		    TOP (1) *
            		FROM 
            			tbl_SF_Retailers_Locations
            		WHERE
            			retailer_code = sfr.retailer_code
                        AND
            			isActiveLocation = 1
                    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
                    ), '{}'
            	) AS VERIFIED_LOCATION
            FROM 
            	tbl_SF_Retailers AS sfr`;
            
            const request = new sql.Request(SFDB);
            const result = await request.query(getQuery);
    
            if (result.recordset.length) {
                dataFound(res, result.recordset)
            } else {
                noData(res)
            }
        } catch (e) {
            servError(e, res)
        }
    }

    const putLocationForCustomer = async (req, res) => {
        const { Latitude, Longitude, retailer_code, EntryBy } = req.body;

        if (!Latitude || !Longitude || !retailer_code || !EntryBy) {
            return invalidInput(res, 'Latitude, Longitude, retailer_code, EntryBy is required');
        }

        try {
            const query = `
            INSERT INTO 
                tbl_SF_Retailers_Locations 
                (retailer_code, latitude, longitude, isActiveLocation, EntryBy, EntryAt)
            VALUES 
                (@code, @lati, @long, @active, @entry, @at)`;
            const request = new sql.Request(SFDB);
            request.input('code', retailer_code);
            request.input('lati', Latitude);
            request.input('long', Longitude);
            request.input('active', 0);
            request.input('entry', EntryBy);
            request.input('at', new Date());

            const result = await request.query(query);

            if (result.rowsAffected[0] && result.rowsAffected[0] > 0) {
                success(res, 'Location Updated');
            } else {
                falied(res, 'Changes Not Saved');
            }
        } catch (e) {
            servError(e, res)
        }
    }

    const verifyLocation = async (req, res) => {
        const { Id } = req.body;

        if (!Id) {
            return invalidInput(res, 'location Id is required')
        }

        try {
            const getRetailer = await SFDB.query(`SELECT retailer_code FROM tbl_SF_Retailers_Locations WHERE Id = '${Id}'`);

            if (getRetailer.recordset[0]?.retailer_code) {
                await SFDB.query(`
                UPDATE 
                    tbl_SF_Retailers_Locations
                SET 
                    isActiveLocation = 0
                WHERE 
                    retailer_code = '${getRetailer.recordset[0]?.retailer_code}'
                `)
            }

            const result = await SFDB.query(`
            UPDATE 
                tbl_SF_Retailers_Locations
            SET 
                isActiveLocation = 1
            WHERE 
                Id = '${Id}'
            `)

            if (result.rowsAffected[0] && result.rowsAffected[0] > 0) {
                success(res, 'Location Verified');
            } else {
                falied(res, 'Failed Verify Location')
            }

        } catch (e) {
            servError(e, res)
        }
    }

    return {
        getSFCustomers,
        putLocationForCustomer,
        verifyLocation
    }
}


export default RetailerControll()