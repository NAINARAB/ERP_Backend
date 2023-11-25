import sql from 'mssql'
import SMTERP from '../config/erpdb.mjs'
import express from 'express'
import authenticateToken from './login-logout/auth.mjs'

const SidebarRoute = express.Router()

SidebarRoute.get('/api/sidebar', authenticateToken, async (req, res) => {
    const auth = req.header('Authorization');
    try {
        const requestWithParams = new sql.Request(SMTERP);
        requestWithParams.input('Autheticate_Id', sql.NVarChar, auth);
        const result = await requestWithParams.execute('User_Rights_Side');
        res.json({ data: result.recordsets, status: "Success", message: "" }).status(200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    }
});

SidebarRoute.get('/api/side', authenticateToken, async (req, res) => {
    const auth = req.header('Authorization');
    try {
        const requestWithParams = new sql.Request(SMTERP);
        requestWithParams.input('Autheticate_Id', sql.NVarChar, auth);
        const result = await requestWithParams.execute('User_Rights');
        res.json({ data: result.recordsets, status: "Success", message: "" }).status(200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    }
});

SidebarRoute.post('/api/updatesidemenu', authenticateToken, (req, res) => {
    const { MenuId, MenuType, User, ReadRights, AddRights, EditRights, DeleteRights, PrintRights } = req.body;
    const deleteRow = `DELETE FROM tbl_User_Rights WHERE User_Id = ${User}
                      AND Menu_Id = ${MenuId}
                      AND Menu_Type = ${MenuType}`;
    SMTERP.query(deleteRow)
        .then(result => {
            const insertRow = `INSERT INTO dbo.tbl_User_Rights 
        (User_Id, Menu_Id, Menu_Type, Read_Rights, Add_Rights, Edit_Rights, Delete_Rights, Print_Rights)
        VALUES 
        (${User}, ${MenuId}, ${MenuType}, ${ReadRights}, ${AddRights}, ${EditRights}, ${DeleteRights}, ${PrintRights})`;
            SMTERP.query(insertRow)
                .then(insertResult => {
                    res.status(200).json({ message: 'Data updated successfully', status: 'Success', data: [] });
                })
                .catch(err => {
                    console.error('Error executing SQL query:', err);
                    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
                })
        })
});

SidebarRoute.get('/api/usertypeauth', authenticateToken, async (req, res) => {
    const { usertype } = req.query;
    try {
        const requestWithParams = new sql.Request(SMTERP);
        requestWithParams.input('UserTypeId', sql.Int, usertype);
        const result = await requestWithParams.execute('User_Rights_By_User_Type');
        res.json({ data: result.recordsets, status: "Success", message: "" }).status(200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
    }
});

SidebarRoute.post('/api/usertypeauth', authenticateToken, (req, res) => {
    const { MenuId, MenuType, UserType, ReadRights, AddRights, EditRights, DeleteRights, PrintRights } = req.body;
    const deleteRow = `DELETE FROM tbl_User_Type_Rights WHERE User_Type_Id = ${UserType}
                      AND Menu_Id = ${MenuId}
                      AND Menu_Type = ${MenuType}`;
    SMTERP.query(deleteRow)
        .then(result => {
            const insertRow = `INSERT INTO tbl_User_Type_Rights 
        (User_Type_Id, Menu_Id, Menu_Type, Read_Rights, Add_Rights, Edit_Rights, Delete_Rights, Print_Rights)
        VALUES 
        (${UserType}, ${MenuId}, ${MenuType}, ${ReadRights}, ${AddRights}, ${EditRights}, ${DeleteRights}, ${PrintRights})`;
            SMTERP.query(insertRow)
                .then(insertResult => {
                    res.status(200).json({ message: 'Data updated successfully', status: 'Success', data: [] });
                })
                .catch(err => {
                    console.error('Error executing SQL query:', err);
                    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
                })
        })
});

SidebarRoute.post('/api/newmenu', authenticateToken, (req, res) => {
    const { menuType, menuName, menuLink, mainMenuId, subMenuId } = req.body;
    let table = '', column = '', insertquery = '';
    if (menuType === 1) {
        table = 'tbl_Master_Menu';
        column = 'MenuName';
        insertquery = `INSERT INTO ${table} (${column}, PageUrl, Active) VALUES ('${menuName}', '${menuLink}', '1')`;
    } else if (menuType === 2) {
        table = 'tbl_Sub_Menu';
        column = 'SubMenuName';
        insertquery = `INSERT INTO ${table} (MenuId, ${column}, PageUrl, Active) VALUES ('${mainMenuId}', '${menuName}', '${menuLink}', '1')`;
    } else {
        table = 'tbl_Child_Menu';
        column = 'ChildMenuName';
        insertquery = `INSERT INTO ${table} (SubMenuId, ${column}, PageUrl, Active) VALUES ('${subMenuId}', '${menuName}', '${menuLink}', '1')`;
    }
    SMTERP.query(insertquery)
        .then(result => {
            if (result.rowsAffected[0] === 1) {
                res.status(200).json({ message: 'Data Inserted Successfully', status: 'Success', data: [] });
            } else {
                res.status(200).json({ message: 'Menu Creation Failed', status: 'Failure', data: [] });
            }
        })
        .catch(err => {
            console.error('Error executing SQL query:', err);
            res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
        })
})

export default SidebarRoute;