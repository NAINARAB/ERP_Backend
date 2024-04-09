import express from "express";
import RetailerControll from "../SFController/sfRetailers.mjs";
import sfProductController from "../SFController/sfProducts.mjs";
import sfDistributors from "../SFController/sfDistributors.mjs";
import sfRoutes from "../SFController/sfRoutes.mjs";
import sfMasters from "../SFController/sfMasters.mjs";

const SfRouter = express.Router();

//sfMasters
SfRouter.get('/api/saniForce/state', sfMasters.getStates);

SfRouter.get('/api/saniForce/district', sfMasters.getDistricts);

SfRouter.get('/api/saniForce/areas', sfMasters.getAreas);

SfRouter.get('/api/saniForce/outlets', sfMasters.getOutlet);



// retailersApi
SfRouter.get('/api/saniForce/retailers', RetailerControll.getSFCustomers);
SfRouter.post('/api/saniForce/retailers', RetailerControll.addRetailers);
SfRouter.put('/api/saniForce/retailers', RetailerControll.verifyLocation);

SfRouter.post('/api/saniForce/retailerLocation', RetailerControll.postLocationForCustomer)


// productApi
SfRouter.get('/api/saniForce/products', sfProductController.getProducts);


// distributors
SfRouter.get('/api/saniForce/distributors', sfDistributors.getDistributors);


// routes
SfRouter.get('/api/saniForce/routes', sfRoutes.getRoutes);




export default SfRouter;