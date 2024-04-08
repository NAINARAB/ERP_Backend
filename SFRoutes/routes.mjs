import express from "express";
import RetailerControll from "../SFController/sfRetailers.mjs";
import sfProductController from "../SFController/sfProducts.mjs";
import sfDistributors from "../SFController/sfDistributors.mjs";
import sfRoutes from "../SFController/sfRoutes.mjs";

const SfRouter = express.Router();

// retailersApi
SfRouter.get('/api/saniForce/retailers', RetailerControll.getSFCustomers);
SfRouter.put('/api/saniForce/retailers', RetailerControll.putLocationForCustomer);
SfRouter.put('/api/saniForce/retailers', RetailerControll.verifyLocation)


// productApi
SfRouter.get('/api/saniForce/products', sfProductController.getProducts);


// distributors
SfRouter.get('/api/saniForce/distributors', sfDistributors.getDistributors);


// routes
SfRouter.get('/api/saniForce/routes', sfRoutes.getRoutes);




export default SfRouter;