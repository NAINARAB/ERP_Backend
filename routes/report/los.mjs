import express from 'express'
import authenticateToken from '../login-logout/auth.mjs'
import dbconnect from '../../config/otherdb.mjs'
import sql from 'mssql';
import ServerError from '../../config/handleError.mjs'

const losRoute = express.Router();

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

losRoute.get('/api/listlos', authenticateToken, dbconnect, async (req, res) => {
  try {
    const Stock_Group = await req.db.query('SELECT DISTINCT Stock_Group FROM tbl_Stock_LOS');
    const Group = await req.db.query('SELECT DISTINCT Group_ST FROM tbl_Stock_LOS')
    const Brand = await req.db.query('SELECT DISTINCT Brand FROM tbl_Stock_LOS')
    const Bag = await req.db.query('SELECT DISTINCT Bag FROM tbl_Stock_LOS')
    const INM = await req.db.query('SELECT DISTINCT Item_Name_Modified FROM tbl_Stock_LOS')

    const AllRow = await req.db.query('SELECT * FROM tbl_Stock_LOS')
    const record = AllRow.recordset

    record.map((item, index) => {
      Stock_Group.recordset.map((item1, index1) => {
        if (item.Stock_Group === item1.Stock_Group) {
          item.sg_id = index1
        }
      })
      Group.recordset.map((item2, index2) => {
        if (item.Group_ST === item2.Group_ST) {
          item.g_id = index2
        }
      })
      Brand.recordset.map((item3, index3) => {
        if (item.Brand === item3.Brand) {
          item.bnd_id = index3
        }
      })
      Bag.recordset.map((item4, index4) => {
        if (item.Bag === item4.Bag) {
          item.bag_id = index4
        }
      })
      INM.recordset.map((item5, index5) => {
        if (item.Item_Name_Modified === item5.Item_Name_Modified) {
          item.inm_id = index5
        }
      })
    })

    res.json({ data: [record, Stock_Group.recordset, Group.recordset, Brand.recordset, Bag.recordset, INM.recordset], status: "Success", message: "" }).status(200)

  } catch (e) {
    ServerError(e, '/api/listlos', 'Get', res)
  } finally {
    req.db.close();
  }
})

losRoute.get('/api/stockabstract', authenticateToken, dbconnect, async (req, res) => {
  const { ReportDate, Group_ST, Stock_Group, Bag, Brand, Item_Name } = req.query;
  const guid = req.config.Tally_Guid;
  const company_id = req.config.Tally_Company_Id;

  try {
    const DynamicDB = new sql.Request(req.db);
    DynamicDB.input('guid', sql.NVarChar, guid);
    DynamicDB.input('company_id', sql.VarChar, company_id.toString());
    DynamicDB.input('Fromdate', sql.VarChar, ReportDate);
    DynamicDB.input('Todate', sql.VarChar, ReportDate);
    DynamicDB.input('Group_ST', sql.VarChar, Group_ST);
    DynamicDB.input('Stock_Group', sql.VarChar, Stock_Group);
    DynamicDB.input('Bag', sql.VarChar, Bag);
    DynamicDB.input('Brand', sql.VarChar, Brand);
    DynamicDB.input('Item_Name', sql.VarChar, Item_Name);
    const StockAbstract = await DynamicDB.execute('Stouck_Abstract_Oinline_Search');
    StockAbstract.recordset.map((obj, index) => {
      let date = new Date(obj.Trans_Date)
      obj.Trans_Date = date.toISOString().split('T')[0];
      const monthIndex = date.getMonth();
      obj.month = monthNames[monthIndex];
      obj.id = index + 1;
    })
    res.json({ status: "Success", data: StockAbstract.recordset, message: "" }).status(200)
  } catch (e) {
    ServerError(e, '/api/stockabstract', 'Get', res)
  } finally {
    req.db.close()
  }
})

losRoute.get('/api/losdropdown', authenticateToken, dbconnect, async (req, res) => {
  try {
    const D_DB = new sql.Request(req.db)
    const StockGroup = await D_DB.execute('Stock_Group_List');
    const Group = await D_DB.execute('ST_Group_List');
    const Brand = await D_DB.execute('Brand_List');
    const Bag = await D_DB.execute('Bag_List');
    const INM = await D_DB.execute('Item_Name_List');
    if (Group, StockGroup, Bag, Brand, INM) {
      res.json(
        {
          status: 200,
          group: Group.recordset,
          stock_group: StockGroup.recordset,
          bag: Bag.recordset,
          brand: Brand.recordset,
          inm: INM.recordset,
          message: ""
        }).status(200)
    }
  } catch (e) {
    ServerError(e, '/api/losdropdown', 'Get', res)
  } finally {
    req.db.close();
  }
})

losRoute.get('/api/stockReport', dbconnect, authenticateToken, async (req, res) => {
  const { ReportDate } = req.query; 
  const guid = req.config.Tally_Guid;
  const company_id = req.config.Tally_Company_Id;

  if (!ReportDate) {
    return res.status(400).json({data: [], status: 'Failure', message: 'Report Date is Required'})
  }

  try {
    const DynamicDB = new sql.Request(req.db);
    DynamicDB.input('guid', guid);
    DynamicDB.input('Company_Id', company_id.toString());
    DynamicDB.input('Fromdate', ReportDate);

    const StockReport = await DynamicDB.execute('Stouck_Abstract_Oinline_Search_New');

    if (StockReport && StockReport.recordset.length > 0) {
      StockReport.recordset.map(obj => {
        obj.product_details = JSON.parse(obj.product_details)
      })
      return res.json({data: StockReport.recordset, status: 'Success', message: 'Data found'})
    } else {
      return res.json({data: [], status: 'Success', message: 'Data not found'})
    }
  } catch (e) {
    ServerError(e, '/api/StockReport', 'Get', res)
  }
})

export default losRoute
