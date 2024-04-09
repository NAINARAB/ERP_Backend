import SFDB from "../config/sfdb.mjs";
import sql from 'mssql';
import { dataFound, falied, invalidInput, noData, servError, success } from '../sfResFun.mjs'
import uploadFile from "../uploads/uploadMiddleware.mjs";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();
import path from "path";
import fs from 'fs'
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



const RetailerControll = () => {
    const domain = process.env.domain

    const getSFCustomers = async (req, res) => {
        try {
            const getQuery = `
            SELECT 
            	rm.*,
            	COALESCE(rom.Route_Name, '') AS RouteGet,
            	COALESCE(am.Area_Id, '') AS AreaGet,
            	COALESCE(sm.State_Name, '') AS StateGet,
                    
            	COALESCE(
            		(
                        SELECT 
            				TOP (1) *
            			FROM 
            				tbl_Retailers_Locations
            			WHERE
                        	Retailer_Id = rm.Retailer_Id
                            AND
            				isActiveLocation = 1
            			FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            		), '{}'
            	) AS VERIFIED_LOCATION
            
            FROM
            	tbl_Retailers_Master AS rm
            LEFT JOIN
            	tbl_Route_Master AS rom
            	ON rom.Route_Id = rm.Route_Id
            LEFT JOIN
            	tbl_Area_Master AS am
            	ON am.Area_Id = rm.Area_Id
            LEFT JOIN
            	tbl_State_Master AS sm
            	ON sm.State_Id = rm.State_Id`;

            const request = new sql.Request(SFDB);
            const result = await request.query(getQuery);

            if (result.recordset.length) {
                const parsed = result.recordset.map(o => {
                    const imageUrl = domain + '/imageURL/retailers/' + o.ImageName;
                    const defaultImageUrl = domain + '/imageURL/retailers/imageNotFound.jpg'; 
                    const imagePath = path.join(__dirname, '..', 'uploads', 'retailers', o.ImageName);
                    return {
                        ...o,
                        VERIFIED_LOCATION: JSON.parse(o.VERIFIED_LOCATION),
                        imageUrl:
                            o.ImageName
                                ? fs.existsSync(imagePath) 
                                    ? imageUrl
                                    : defaultImageUrl
                                : defaultImageUrl
                    }
                });
                dataFound(res, parsed)
            } else {
                noData(res)
            }
        } catch (e) {
            servError(e, res)
        }
    }

    const postLocationForCustomer = async (req, res) => {
        const { Latitude, Longitude, Retailer_Id, EntryBy } = req.body;

        if (!Latitude || !Longitude || !Retailer_Id || !EntryBy) {
            return invalidInput(res, 'Latitude, Longitude, Retailer_Id, EntryBy is required');
        }

        try {
            const query = `
            INSERT INTO 
                tbl_Retailers_Locations 
                (Retailer_Id, latitude, longitude, isActiveLocation, EntryBy, EntryAt)
            VALUES 
                (@id, @lati, @long, @active, @entry, @at)`;
            const request = new sql.Request(SFDB);
            request.input('id', Retailer_Id);
            request.input('lati', Latitude);
            request.input('long', Longitude);
            request.input('active', 0);
            request.input('entry', EntryBy);
            request.input('at', new Date());

            const result = await request.query(query);

            if (result.rowsAffected[0] && result.rowsAffected[0] > 0) {
                success(res, 'Location Saved');
            } else {
                falied(res, 'Failed to Saved');
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
            const getRetailer = await SFDB.query(`
            SELECT 
                Retailer_Id 
            FROM 
                tbl_Retailers_Locations 
            WHERE Id = '${Id}'`);

            if (getRetailer.recordset[0]?.Retailer_Id) {
                await SFDB.query(`
                UPDATE 
                    tbl_Retailers_Locations
                SET 
                    isActiveLocation = 0
                WHERE 
                    Retailer_Id = '${getRetailer.recordset[0]?.Retailer_Id}'
                `)
            }

            const result = await SFDB.query(`
            UPDATE 
                tbl_Retailers_Locations
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

    const addRetailers = async (req, res) => {
        const {
            Retailer_Name, Contact_Person, Mobile_No, Retailer_Channel_Id,
            Retailer_Class, Route_Id, Area_Id, Reatailer_Address, Reatailer_City, PinCode,
            State_Id, Sales_Force_Id, Distributor_Id, Gstno, Latitude, Longitude, Created_By } = req.body;

        const requiredFields = [
            'Retailer_Name', 'Contact_Person', 'Mobile_No', 'Route_Id', 'Area_Id',
            'Reatailer_Address', 'Reatailer_City', 'PinCode', 'State_Id', 'Gstno',
            'Latitude', 'Longitude', 'Profile_Pic', 'Created_By'];

        const missingFields = [];

        requiredFields.forEach(field => {
            if (!req.body[field]) {
                missingFields.push(field);
            }
        });

        if (missingFields.length > 0) {
            return invalidInput(res, `${missingFields.join(', ')} is required`);
        }

        try {
            console.log(req.body)

            await uploadFile(req, res, 1, 'Profile_Pic');
            const fileName = req?.file?.originalname;
            const filePath = req?.file?.path;
            const filetype = req?.file?.mimetype;
            const filesize = req?.file?.size

            const insertQuery = `
                INSERT INTO tbl_Retailers_Master (
                    Retailer_Code,
                    Retailer_Name, 
                    Contact_Person, 
                    Mobile_No, 
                    Retailer_Channel_Id, 
                    
                    Retailer_Class, 
                    Route_Id,
                    Area_Id,
                    Reatailer_Address,
                    Reatailer_City,
                    
                    PinCode,
                    State_Id,
                    Sales_Force_Id,
                    Distributor_Id,
                    Gstno,
                    
                    ERP_Id,
                    Latitude,
                    Longitude,
                    Profile_Pic,
                    Created_Date,
                    
                    Created_By,
                    Updated_Date,
                    Updated_By,
                    Del_Flag,
                    ImageName,
                    
                    ImagePath,
                    ImageType,
                    ImageSize,
                    Others_5 
                ) VALUES (
                    @code, 
                    @rname, @cperson, @mobile, @channel, @rclass, @route, @area, @address, @city, @pincode, @state, @salesforce, @distributor, @gst, 
                    @erp, @lati, @long, @profile, @created, @createdby, @update, @updateby, @dflag, @filename, @filepath, @filetype, @filesize, @other5 
                )
            `;

            const request = new sql.Request(SFDB)
            request.input('code', 0);
            request.input('rname', Retailer_Name);
            request.input('cperson', Contact_Person)
            request.input('mobile', Mobile_No)
            request.input('channel', Retailer_Channel_Id)

            request.input('rclass', Retailer_Class)
            request.input('route', Route_Id)
            request.input('area', Area_Id)
            request.input('address', Reatailer_Address)
            request.input('city', Reatailer_City)

            request.input('pincode', PinCode)
            request.input('state', State_Id)
            request.input('salesforce', Sales_Force_Id)
            request.input('distributor', Distributor_Id)
            request.input('gst', Gstno)

            request.input('erp', 0)
            request.input('lati', Latitude)
            request.input('long', Longitude)
            request.input('profile', fileName)
            request.input('created', new Date())

            request.input('createdby', Created_By)
            request.input('update', '')
            request.input('updateby', 0)
            request.input('dflag', 0)
            request.input('filename', fileName)

            request.input('filepath', filePath)
            request.input('filetype', filetype)
            request.input('filesize', filesize)
            request.input('other5', null)


            const result = await request.query(insertQuery);

            if (result.rowsAffected[0] && result.rowsAffected[0] > 0) {
                return success(res, 'New Customer Added')
            } else {
                return falied(res, 'Failed to create customer')
            }
        } catch (e) {
            servError(e, res);
        }
    }


    return {
        getSFCustomers,
        postLocationForCustomer,
        verifyLocation,
        addRetailers
    }
}


export default RetailerControll()