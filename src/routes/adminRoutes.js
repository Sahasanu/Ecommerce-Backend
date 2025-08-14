// adminRoutes.js
import express from "express";
import { createProduct, updateProduct, deleteProduct } from "../Controllers/Admin/productsController.js";
import { getAllOrders,updateOrderStatus } from "../Controllers/Admin/orderController.js";
import { registerAdmin} from "../Controllers/Admin/registerAdmin.js";
import upload from "../middlewares/Upload.js";

const router = express.Router();

router.post("/add-admin", registerAdmin)
router.post( "/create-products", upload.single("image"), createProduct);
router.put("/update-products/:id", upload.single("image"), updateProduct);
router.delete("/deleteproducts/:id", deleteProduct);
router.get("/orders",  getAllOrders);
router.patch("/orders/:id",  updateOrderStatus);
export default router;
