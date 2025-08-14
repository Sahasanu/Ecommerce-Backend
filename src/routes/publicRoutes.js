import express from "express";
import { getAllProducts, getProductById } from "../Controllers/Public/productsController.js";
import { registerClient } from "../Controllers/Public/registerClient.js";
import { getProductReviewsPublic } from "../Controllers/Public/reviewController.js";

const router = express.Router();


router.get("/products", getAllProducts); 
router.get("/products/:id", getProductById);
router.get("/reviews/:productId", getProductReviewsPublic); 
router.post("/register", registerClient); 


export default router;